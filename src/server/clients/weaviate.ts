import { connectToLocal, Filters, configure, type WeaviateClient, type Collection } from "weaviate-client";
import type { SearchQuery } from "../../types/query";
import type { ParalegalRecord, Correction } from "../../types/weaviate";
import type { ReputationTier } from "../../types/reputation";

class ParalegalVectorDbClient {
  private client?: WeaviateClient;
  private paralegalCollection!: Collection<ParalegalRecord>;
  private initPromise: Promise<void> | null = null;

  private async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {

    this.client = await connectToLocal({
      host: process.env.WEAVIATE_HOST || "localhost",
      port: 8080,
      grpcPort: 50051,
      headers: {
        "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY!,
      },
    });
    await this.client.isReady();

    const collections = await this.client.collections.listAll();
    if (!collections.some((collection) => collection.name === "Paralegal")) {
      await this.client.collections.create({
        name: "Paralegal",
        vectorizers: configure.vectorizer.text2VecOpenAI({
          name: "text",
          sourceProperties: ["text"],
          model: "text-embedding-3-small",
        }),
        properties: [
          { name: "text", dataType: "text" },
          { name: "chunk_index", dataType: "int" },
          { name: "userId", dataType: "text" },
          { name: "chatId", dataType: "text" },
          { name: "fileId", dataType: "text" },
          { name: "feedback_score", dataType: "number" },
          { name: "feedback_tier", dataType: "text" },
          { name: "corrections", dataType: "text" },
        ],
      });
    }

    this.paralegalCollection = this.client.collections.get<ParalegalRecord>("Paralegal");
    })();

    return this.initPromise;
  }

  public async addChunksToParalegal(
    docs: { pageContent: string }[],
    userId: string,
    chatId: string,
    fileId: string
  ): Promise<void> {
    try {
      await this.init();
      const objects = docs.map((doc, i) => ({
        properties: {
          text: doc.pageContent,
          chunk_index: i,
          userId: userId,
          chatId: chatId,
          fileId: fileId,
        },
      }));

      const BATCH_SIZE = 20;
      for (let i = 0; i < objects.length; i += BATCH_SIZE) {
        const batch = objects.slice(i, i + BATCH_SIZE);
        const result = await this.paralegalCollection.data.insertMany(batch);
        if (result.hasErrors) {
          throw new Error(`Failed to insert batch ${i / BATCH_SIZE}: ${JSON.stringify(result.errors)}`);
        }
      }
    } catch (error) {
      console.error(`[Weaviate] Failed to add chunks: ${userId}/${chatId}/${fileId}`, error);
      throw error;
    }
  }

  public async deleteFileChunks(userId: string, fileId: string): Promise<void> {
    try {
      await this.init();
      await this.paralegalCollection.data.deleteMany(
        Filters.and(
          this.paralegalCollection.filter.byProperty("userId").equal(userId),
          this.paralegalCollection.filter.byProperty("fileId").equal(fileId)
        )
      );
    } catch (error) {
      console.error(`[Weaviate] Failed to delete file chunks: ${userId}/${fileId}`, error);
      throw error;
    }
  }

  public async deleteChatChunks(userId: string, chatId: string): Promise<void> {
    try {
      await this.init();
      await this.paralegalCollection.data.deleteMany(
        Filters.and(
          this.paralegalCollection.filter.byProperty("userId").equal(userId),
          this.paralegalCollection.filter.byProperty("chatId").equal(chatId)
        )
      );
    } catch (error) {
      console.error(`[Weaviate] Failed to delete chat chunks: ${userId}/${chatId}`, error);
      throw error;
    }
  }

  public async search({ query, userId, chatId }: SearchQuery) {
    try {
      await this.init();

      const TARGET_LIMIT = 10;
      const FETCH_CANDIDATE_LIMIT = 25;
      const DEGRADE_PENALTY = 0.75;

      const similar_chunks = await this.paralegalCollection.query.hybrid(query, {
        limit: FETCH_CANDIDATE_LIMIT,
        alpha: 0.5,
        fusionType: "RelativeScore",
        filters: Filters.and(
          this.paralegalCollection.filter.byProperty("userId").equal(userId),
          this.paralegalCollection.filter.byProperty("chatId").equal(chatId)
        ),
        returnMetadata: ["score", "explainScore"],
      });

      return similar_chunks.objects
        .filter((obj) => obj.properties.feedback_tier !== "FLAG")
        .map((obj) => {
          let chunkText = obj.properties.text;
          const rawCorrections = obj.properties.corrections;

          if (rawCorrections) {
            try {
              const corrections: Correction[] = typeof rawCorrections === "string"
                ? JSON.parse(rawCorrections)
                : rawCorrections;

              if (Array.isArray(corrections) && corrections.length > 0) {
                const uncontested = corrections.filter(c => !c.contested);
                const contested = corrections.filter(c => c.contested);

                const sanitize = (str: string) =>
                  (str || "")
                    .replace(/<[^>]*>/g, "") // Strip any HTML/XML tags
                    .replace(/[\r\n]+/g, " ") // Flatten newlines
                    .trim();

                let patchStr = "";
                if (uncontested.length > 0) {
                  patchStr += `\n\n[Correction Patch]: The following information in this chunk is known to be INCORRECT. Apply these updates:\n<user_correction>\n` + 
                    uncontested.map(c => `- Incorrect: "${sanitize(c.incorrect_claim)}" -> Correct: "${sanitize(c.correct_value)}"`).join("\n") + 
                    `\n</user_correction>`;
                }
                if (contested.length > 0) {
                  patchStr += `\n\n[Disputed Claims]: Users have submitted CONFLICTING feedback about the following claims in this chunk. Warn the user that this information is disputed:\n<user_correction>\n` + 
                    contested.map(c => `- Disputed claim: "${sanitize(c.incorrect_claim)}" -> Proposed: "${sanitize(c.correct_value)}"`).join("\n") + 
                    `\n</user_correction>`;
                }

                if (patchStr) {
                  chunkText += patchStr;
                }
              }
            } catch (e) {
              console.error("Failed to parse corrections for chunk", obj.uuid, e);
            }
          }

          const rawScore = obj.metadata?.score ?? 0;
          const tier = obj.properties.feedback_tier;
          const adjustedScore = tier === "DEGRADE" ? rawScore * DEGRADE_PENALTY : rawScore;

          return {
            id: obj.uuid,
            text: chunkText,
            chunk_index: obj.properties.chunk_index,
            score: adjustedScore,
            tier: tier ?? "HEALTHY",
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, TARGET_LIMIT);

    } catch (error) {
      console.error("[Weaviate] Search failed:", error);
      throw error;
    }
  }

  public async getChunksByIds(ids: string[]): Promise<ParalegalRecord[]> {
    if (!ids.length) return [];
    try {
      await this.init();
      const results = await this.paralegalCollection.query.fetchObjects({
        filters: this.paralegalCollection.filter.byId().containsAny(ids),
      });
      return results.objects.map(obj => ({
        ...obj.properties,
        id: obj.uuid
      } as ParalegalRecord));
    } catch (error) {
      console.error("[Weaviate] Failed to fetch chunks by IDs:", error);
      throw error;
    }
  }

  public async updateChunkReputation(chunkId: string, score: number, tier: ReputationTier): Promise<void> {
    try {
      await this.init();
      await this.paralegalCollection.data.update({
        id: chunkId,
        properties: {
          feedback_score: score,
          feedback_tier: tier,
        },
      });
    } catch (error) {
      console.error(`[Weaviate] Failed to update chunk reputation for ${chunkId}:`, error);
      throw error;
    }
  }

  public async updateChunkCorrections(chunkId: string, corrections: Correction[]): Promise<void> {
    try {
      await this.init();
      await this.paralegalCollection.data.update({
        id: chunkId,
        properties: {
          corrections: JSON.stringify(corrections),
        },
      });
    } catch (error) {
      console.error(`[Weaviate] Failed to update chunk corrections for ${chunkId}:`, error);
      throw error;
    }
  }

  public async getChunkCorrections(chunkId: string): Promise<Correction[]> {
    try {
      await this.init();
      const result = await this.paralegalCollection.query.fetchObjectById(chunkId);
      if (!result || !result.properties.corrections) {
        return [];
      }

      const correctionsData = result.properties.corrections;
      return typeof correctionsData === "string" ? JSON.parse(correctionsData) : (correctionsData || []);
    } catch (error) {
      console.error(`[Weaviate] Failed to fetch chunk corrections for ${chunkId}:`, error);
      return [];
    }
  }
}

const paralegalVectorDbClient = new ParalegalVectorDbClient();

export default paralegalVectorDbClient;
