import { tool } from "langchain";
import { SearchQuerySchema } from "../types/query";
import paralegalVectorDbClient from "../clients/weaviate";
import { ChatSummaryService } from "../services/summary";

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


export const buildAgentMessages = async (chatId: string, userId: string, fileId: string, query: string) => {
  const { summary, lastTurn } = await ChatSummaryService.getContext(chatId);
  const messages: any[] = [];

  if (summary) {
    messages.push({ role: "system", content: `CONCISED CONTEXT OF LEGAL CASE:\n${summary}` });
  }

  if (lastTurn) {
    messages.push({ role: "user", content: lastTurn.user });
    messages.push({ role: "assistant", content: lastTurn.assistant });
  }

  messages.push({
    role: "user",
    content: `
      [Session Metadata]
      UserId: ${userId}
      FileId: ${fileId}
      ChatId: ${chatId}

      [User Query]
      ${query}
    `.trim(),
  });

  return messages;
}