import { redis } from "../clients/redis";
import { summarizerModel } from "../clients/openai";
import { SUMMARY_INSTRUCTIONS, buildSummaryData } from "../prompts/summary";

export interface Turn {
  user: string;
  assistant: string;
}

export interface ChatContext {
  summary: string | null;
  lastTurn: Turn | null;
}

const TTL = parseInt(process.env.REDIS_SESSION_TTL_SECONDS ?? "86400", 10);

export class ChatSummaryService {
  private static getSummaryKey(chatId: string) {
    return `summary:${chatId}`;
  }

  private static getLastTurnKey(chatId: string) {
    return `last_turn:${chatId}`;
  }

  static async getContext(chatId: string): Promise<ChatContext> {
    const summaryKey = this.getSummaryKey(chatId);
    const lastTurnKey = this.getLastTurnKey(chatId);

    const [summary, lastTurnJson] = await redis.mget(summaryKey, lastTurnKey);
    const lastTurn = lastTurnJson ? JSON.parse(lastTurnJson) : null;

    return {
      summary: summary as string | null,
      lastTurn,
    };
  }

  static async updateContext(
    chatId: string,
    query: string,
    assistantResponse: string
  ): Promise<void> {
    if (!assistantResponse || assistantResponse.length < 5) return;

    const summaryKey = this.getSummaryKey(chatId);
    const lastTurnKey = this.getLastTurnKey(chatId);

    const { summary, lastTurn } = await this.getContext(chatId);

    const summaryData = buildSummaryData(summary, lastTurn, query, assistantResponse);

    const summaryResponse = await summarizerModel.invoke([
      { role: "system", content: SUMMARY_INSTRUCTIONS },
      { role: "user", content: summaryData },
    ]);
    const newSummary = summaryResponse.content;

    await redis
      .pipeline()
      .set(summaryKey, newSummary as string, "EX", TTL)
      .set(
        lastTurnKey,
        JSON.stringify({ user: query, assistant: assistantResponse }),
        "EX",
        TTL
      )
      .exec();
  }
}
