import { redis } from "../clients/redis";
import { summarizerModel } from "../clients/openai";

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
    const ttl = parseInt(process.env.REDIS_SESSION_TTL_SECONDS || "86400");

    const { summary, lastTurn } = await this.getContext(chatId);

    const summaryInstructions = `
      Your task is to maintain a concise, factual case summary for a Legal Q&A assistant.
      - Format: Use bullet points.
      - Tone: Professional and objective.
      - Length: Strictly under 200 words.
      - Update: Integrate new facts from the provided turn into the existing summary.
    `;

    const summaryData = `
      Existing Summary: ${summary || "None"}
      Previous Turn: ${lastTurn ? `User: ${lastTurn.user}\nAI: ${lastTurn.assistant}` : "None"}
      New Interaction:
      User Question: ${query}
      AI Response: ${assistantResponse}
    `;

    const summaryResponse = await summarizerModel.invoke([
      { role: "system", content: summaryInstructions },
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
