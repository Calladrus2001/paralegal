import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { ChatRequestSchema } from "../../types/query";
import type { ChatRequest } from "../../types/query";
import { model } from "../clients/openai";
import paralegalVectorDbClient from "../clients/weaviate";
import { ChatService } from "../services/chat";
import { nanoid } from "nanoid";
import { buildQaMessages } from "../tools";
import { ReputationService } from "../services/reputation";
import { QuotaService } from "../services/quota";

const router = Router();

router.post("/", validateBodyMiddleware(ChatRequestSchema), async (req, res) => {
  try {
    const { userId, chatId, query } = req.body as ChatRequest;

    const hasQuota = await QuotaService.hasQuota();
    if (!hasQuota) {
      res.status(429).json({
        error: "Daily query limit reached (0/100 remaining). Resets at 00:00 UTC.",
      });
      return;
    }

    const chunks = await paralegalVectorDbClient.search({ query, userId, chatId });
    const messages = await buildQaMessages(chatId, query, chunks);
    const response = await model.invoke(messages);

    await QuotaService.deductQuota().catch((quotaErr) =>
      console.error("[QueryRouter] Failed to deduct quota:", quotaErr)
    );

    const responseId = nanoid();
    const assistantResponse = response.content as string;

    const retrievedChunkIds = chunks.map((c) => c.id).filter(Boolean);
    const retrievedScores = chunks.map((c) => c.score).filter((s) => s != null);

    // Reliably persist message to DynamoDB
    await ChatService.addMessage({
      responseId,
      chatId,
      userId,
      query,
      response: assistantResponse,
      retrievedChunkIds,
      retrievedScores,
      createdAt: new Date().toISOString(),
    });

    // Increment retrieval counts in background without blocking response
    if (retrievedChunkIds.length > 0) {
      Promise.allSettled(
        retrievedChunkIds.map((chunkId: string) =>
          ReputationService.incrementRetrievalCount(chunkId)
        )
      ).catch((err) => console.error("[QueryRouter] Background reputation error:", err));
    }

    res.json({ responseId, response: assistantResponse });
  } catch (err: any) {
    console.error("[QueryRouter] QA error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
