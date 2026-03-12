import { tool } from "langchain";
import { SearchQuerySchema } from "../types/query";
import paralegalVectorDbClient from "../clients/weaviate";

export const fetchChunksTool = tool(
  async ({ query, userId, fileId }) => {
    const result = await paralegalVectorDbClient.search({ query, userId, fileId });
    return JSON.stringify(result);
  },
  {
    name: "fetchRelevantChunks",
    description: "Retrieve relevant chunks from the vector DB based on a query",
    schema: SearchQuerySchema,
  }
);
