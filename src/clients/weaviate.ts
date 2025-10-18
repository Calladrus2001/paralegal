import weaviate, { type WeaviateClient } from "weaviate-client";

const client: WeaviateClient = await weaviate.connectToLocal();
await client.isReady()

export default client