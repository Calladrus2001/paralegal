import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { ChatRequestSchema } from "../types/query";
import type { ChatRequest } from "../types/query";
import { model } from "../clients/openai";
import paralegalVectorDbClient from "../clients/weaviate";
import { ChatService } from "../services/chat";
import pRetry from "p-retry";
import { nanoid } from "nanoid";
import { buildQaMessages } from "../tools";
import { ReputationService } from "../services/reputation";

const router = Router();


const persistQueryRecord = (params: {
  chatId: string;
  userId: string;
  query: string;
  responseId: string;
  assistantResponse: string;
  retrievedChunkIds?: string[];
  retrievedScores?: number[];
}) => {
  const { chatId, userId, query, responseId, assistantResponse, retrievedChunkIds, retrievedScores } = params;

  Promise.allSettled([
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

    const chunks = await paralegalVectorDbClient.search({ query, userId, fileId });
    const messages = await buildQaMessages(chatId, query, chunks);
    const response = await model.invoke(messages);

    const responseId = nanoid();
    const assistantResponse = response.content as string;

    const retrievedChunkIds = chunks.map((c) => c.id).filter(Boolean);
    const retrievedScores = chunks.map((c) => c.score).filter((s) => s != null);

    res.on("finish", () =>
      persistQueryRecord({
        chatId,
        userId,
        query,
        responseId,
        assistantResponse,
        retrievedChunkIds,
        retrievedScores,
      })
    );
    res.json({ responseId, response: assistantResponse });
  } catch (err: any) {
    console.error("QA error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
