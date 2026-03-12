import { connectToLocal, Filters, type WeaviateClient, type Collection } from "weaviate-client";
import type { SearchQuery } from "../types/query";
import type { ParalegalRecord } from "../types/weaviate";

class ParalegalVectorDbClient {
  private client?: WeaviateClient;
  private paralegalCollection!: Collection<ParalegalRecord>;

  private async init(): Promise<void> {
    if (this.client) return;

    this.client = await connectToLocal({
      host: process.env.WEAVIATE_HOST || "localhost",
      port: 8080,
      grpcPort: 50051,
    });
    await this.client.isReady();

    const collections = await this.client.collections.listAll();
    if (!collections.some((collection) => collection.name === "Paralegal")) {
      await this.client.collections.create({
        name: "Paralegal",
        properties: [
          { name: "text", dataType: "text" },
          { name: "chunk_index", dataType: "int" },
          { name: "userId", dataType: "text" },
          { name: "fileId", dataType: "text" },
        ],
      });
    }

    this.paralegalCollection = this.client.collections.get<ParalegalRecord>("Paralegal");
  }

  public async addChunksToParalegal(docs: any[], userId: string, fileId: string): Promise<void> {
    try {
      await this.init();
      const objects = docs.map((doc: any, i: number) => ({
        properties: {
          text: doc.pageContent,
          chunk_index: i,
          userId: userId,
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
    } catch (error: any) {
      console.error(error);
      throw new Error(`Failed to add chunks to paralegal: ${userId}/${fileId}`);
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
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }

  public async search({ query, userId, fileId }: SearchQuery) {
    try {
      await this.init();
      const similar_chunks = await this.paralegalCollection.query.hybrid(query, {
        limit: 10,
        alpha: 0.5,
        fusionType: "RelativeScore",
        filters: Filters.and(
          this.paralegalCollection.filter.byProperty("userId").equal(userId),
          this.paralegalCollection.filter.byProperty("fileId").equal(fileId)
        ),
        returnMetadata: ["score", "explainScore"],
      });

      return similar_chunks.objects.map((obj) => ({
        text: obj.properties.text,
        chunk_index: obj.properties.chunk_index,
        score: obj.metadata?.score,
      }));
    } catch (error: any) {
      console.error(error);
      throw error
    }
  }
}

const paralegalVectorDbClient = new ParalegalVectorDbClient();

export default paralegalVectorDbClient;
