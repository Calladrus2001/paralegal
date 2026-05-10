import { tool } from "langchain";
import { z } from "zod";
import { SearchQuerySchema } from "../types/query";
import paralegalVectorDbClient from "../clients/weaviate";
import { ChatSummaryService } from "../services/summary";
import { buildCaseSummaryContext } from "../prompts/query";

/**
 * Creates a fetchRelevantChunks tool with userId and fileId pre-bound.
 * This avoids relying on the LLM to correctly pass these values from a system message.
 */
export function createFetchChunksTool(userId: string, fileId: string) {
  return tool(
    async ({ query }) => {
      const result = await paralegalVectorDbClient.search({ query, userId, fileId });
      return JSON.stringify(result);
    },
    {
      name: "fetchRelevantChunks",
      description: "Retrieve relevant chunks from the vector DB based on a query",
      schema: z.object({
        query: z.string().min(10).describe("The query to search for in the knowledge base"),
      }),
    }
  );
}

export const buildAgentMessages = async (chatId: string, query: string) => {
  const { summary, lastTurn } = await ChatSummaryService.getContext(chatId);
  const messages: Array<{ role: string; content: string }> = [];

  if (summary) {
    messages.push({ role: "system", content: buildCaseSummaryContext(summary) });
  }

  if (lastTurn) {
    messages.push({ role: "user", content: lastTurn.user });
    messages.push({ role: "assistant", content: lastTurn.assistant });
  }

  messages.push({
    role: "user",
    content: query,
  });

  return messages;
}