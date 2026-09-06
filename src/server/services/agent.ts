import { miniModel, model } from "../clients/openai";
import paralegalVectorDbClient from "../clients/weaviate";
import { ChatService } from "./chat";
import { buildQaMessages } from "../tools";
import { searchCaseDocumentsTool } from "../tools/search";
import { AGENT_SYSTEM_PROMPT } from "../prompts/query";

export interface AgentQueryResult {
  response: string;
  retrievedChunkIds: string[];
  retrievedScores: number[];
  isFeedbackApplicable: boolean;
}

export class AgentService {
  public static async processQuery(
    userId: string,
    chatId: string,
    query: string
  ): Promise<AgentQueryResult> {
    const history = await ChatService.getMessagesForChat(chatId);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: AGENT_SYSTEM_PROMPT },
    ];

    for (const msg of history) {
      messages.push({ role: "user", content: msg.query });
      messages.push({ role: "assistant", content: msg.response });
    }

    messages.push({
      role: "user",
      content: `<user_query>\n${query}\n</user_query>`,
    });

    const agentModel = miniModel.bindTools([searchCaseDocumentsTool]);
    const agentResponse = await agentModel.invoke(messages);

    const toolCalls = agentResponse.tool_calls;

    // Branch A: No tool call
    if (!toolCalls || toolCalls.length === 0) {
      const directResponse =
        (agentResponse.content as string)?.trim() ||
        "Hello! How can I assist you with your legal documents today?";

      return {
        response: directResponse,
        retrievedChunkIds: [],
        retrievedScores: [],
        isFeedbackApplicable: false,
      };
    }

    // Branch B: Tool call triggered
    const searchCall =
      toolCalls.find((tc) => tc.name === "search_case_documents") ?? toolCalls[0]!;

    const searchQuery =
      typeof searchCall.args?.query === "string" && searchCall.args.query.trim()
        ? searchCall.args.query.trim()
        : query;

    console.log(
      `[AgentService] Document search triggered: "${searchQuery}" (original query: "${query}")`
    );

    const chunks = await paralegalVectorDbClient.search({
      query: searchQuery,
      userId,
      chatId,
    });

    const retrievedChunkIds = chunks.map((c) => c.id).filter(Boolean);
    const retrievedScores = chunks.map((c) => c.score).filter((s) => s != null);

    const qaMessages = await buildQaMessages(chatId, query, chunks, history);
    const synthesisResponse = await model.invoke(qaMessages);

    return {
      response: synthesisResponse.content as string,
      retrievedChunkIds,
      retrievedScores,
      isFeedbackApplicable: true,
    };
  }
}
