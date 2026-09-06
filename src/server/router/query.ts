import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { ChatRequestSchema } from "../../types/query";
import type { ChatRequest } from "../../types/query";
import { ChatService } from "../services/chat";
import { nanoid } from "nanoid";
import { ReputationService } from "../services/reputation";
import { QuotaService } from "../services/quota";
import { AgentService } from "../services/agent";

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

    const { response, retrievedChunkIds, retrievedScores, isFeedbackApplicable } =
      await AgentService.processQuery(userId, chatId, query);

    await QuotaService.deductQuota().catch((quotaErr) =>
      console.error("[QueryRouter] Failed to deduct quota:", quotaErr)
    );

    const responseId = nanoid();

    await ChatService.addMessage({
      responseId,
      chatId,
      userId,
      query,
      response,
      isFeedbackApplicable,
      retrievedChunkIds,
      retrievedScores,
      createdAt: new Date().toISOString(),
    });

    if (retrievedChunkIds.length > 0) {
      Promise.allSettled(
        retrievedChunkIds.map((chunkId: string) =>
          ReputationService.incrementRetrievalCount(chunkId)
        )
      ).catch((err) => console.error("[QueryRouter] Background reputation error:", err));
    }

    res.json({ responseId, response, isFeedbackApplicable, retrievedChunkIds });
  } catch (err: any) {
    console.error("[QueryRouter] QA error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
