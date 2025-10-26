import { connectToLocal, type WeaviateClient, type Collection } from "weaviate-client";

class ParalegalVectorDbClient {
  private client?: WeaviateClient;
  private collectionName: string;
  private paralegalCollection!: Collection;

  constructor({ collectionName }: { collectionName: string }) {
    this.collectionName = collectionName;
  }

  public async init(): Promise<void> {
    this.client = await connectToLocal();
    await this.client.isReady();

    const collections = await this.client.collections.listAll();
    if (!collections.some((collection) => collection.name === this.collectionName)) {
      await this.client.collections.create({
        name: this.collectionName,
      });
    }

    this.paralegalCollection = this.client.collections.get(this.collectionName);
  }

  public async addChunksToParalegal(docs: any, Key: String): Promise<void> {
    try {
      const [userId, fileId] = Key.split("/");
      await Promise.all(
        docs.map((doc: any, i: number) =>
          this.paralegalCollection.data.insert({
            properties: {
              text: doc.pageContent,
              chunk_index: i,
              userId: userId as string,
              fileId: fileId as string,
            },
          })
        )
      );
    } catch (error: any) {
      console.log(error);
    }
  }

  public async semanticQuery({ query, userId }: { query: string; userId: string }) {
    const similar_chunks = await this.paralegalCollection.query.nearText([query], {
      limit: 5,
      filters: {
        operator: "Equal",
        target: {
          property: "userId",
        },
        value: userId,
      },
      includeVector: false,
      returnMetadata: "all",
    });

    return similar_chunks.objects.map((obj) => ({
      text: obj.properties?.text,
      chunk_index: obj.properties?.chunk_index,
      distance: obj.metadata?.distance,
    }));
  }
}

const paralegalVectorDbClient = new ParalegalVectorDbClient({
  collectionName: `Paralegal`,
});
await paralegalVectorDbClient.init();

export default paralegalVectorDbClient;
