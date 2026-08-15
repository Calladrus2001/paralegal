import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { FeedbackRequestSchema } from "../../types/feedback";
import type { FeedbackRequest } from "../../types/feedback";
import { FeedbackService } from "../services/feedback";

const router = Router();

router.post("/", validateBodyMiddleware(FeedbackRequestSchema), async (req, res) => {
  try {
    const feedbackData = req.body as FeedbackRequest;
    const record = await FeedbackService.submitFeedback(feedbackData);

    res.status(200).json({
      success: true,
      feedbackId: record.feedbackId,
    });
  } catch (err: any) {
    console.error("Failed to submit feedback:", err);
    res.status(500).json({ message: "Failed to submit feedback", error: err.message });
  }
});

export default router;
