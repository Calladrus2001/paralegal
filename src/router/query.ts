import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { ChatRequestSchema } from "../types/query";
import type { ChatRequest } from "../types/query";
import { pdfAgent } from "../clients/openai";
import { ChatSummaryService } from "../services/summary";
import { ChatService } from "../services/chat";
import pRetry from "p-retry";
import { nanoid } from "nanoid";
import { buildAgentMessages } from "../tools";
import { ReputationService } from "../services/reputation";

const router = Router();


function persistQueryRecord(params: {
  chatId: string;
  userId: string;
  query: string;
  responseId: string;
  assistantResponse: string;
  agentMessages: any[];
}) {
  const { chatId, userId, query, responseId, assistantResponse, agentMessages } = params;

  const toolMsg = agentMessages.find(
    (m) => m.name === "fetchRelevantChunks" && typeof m.content === "string"
  );

  const { retrievedChunkIds, retrievedScores } = (() => {
    if (toolMsg) {
      try {
        const chunks = JSON.parse(toolMsg.content as string);
        if (Array.isArray(chunks) && chunks.length > 0) {
          return {
            retrievedChunkIds: chunks.map((c: any) => c.id).filter(Boolean),
            retrievedScores: chunks.map((c: any) => c.score).filter(Boolean),
          };
        }
      } catch (e) {
        console.error("Failed to parse tool message content", e);
      }
    }
    return { retrievedChunkIds: undefined, retrievedScores: undefined };
  })();

  Promise.allSettled([
    pRetry(
      () => ChatSummaryService.updateContext(chatId, query, assistantResponse),
      { retries: 3 }
    ),
    pRetry(
      () =>
        ChatService.addMessage({
          responseId,
          chatId,
          userId,
          query,
          response: assistantResponse,
          retrievedChunkIds,
          retrievedScores,
          createdAt: new Date().toISOString(),
        }),
      { retries: 3 }
    ),
    ...(retrievedChunkIds || []).map((chunkId: string) => 
      pRetry(() => ReputationService.incrementRetrievalCount(chunkId), { retries: 2 })
    ),
  ]).then((results) => {
    const failures = results.filter((r) => r.status === "rejected");
    failures.forEach((failure) => {
      console.error("Permanent background write failure:", failure);
    });
  });
}

router.post("/", validateBodyMiddleware(ChatRequestSchema), async (req, res) => {
  try {
    const { userId, fileId, chatId, query } = req.body as ChatRequest;

    const messages = await buildAgentMessages(chatId, userId, fileId, query);
    const response = await pdfAgent.invoke({ messages });

    const responseId = nanoid();
    const assistantResponse = response.messages[response.messages.length - 1]?.content as string;

    res.json(assistantResponse);

    res.on("finish", () =>
      persistQueryRecord({ chatId, userId, query, responseId, assistantResponse, agentMessages: response.messages })
    );
  } catch (err: any) {
    console.error("Agent error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
