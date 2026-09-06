import { Router } from "express";
import { QuotaService } from "../services/quota";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const quota = await QuotaService.getQuota();
    res.json(quota);
  } catch (err: any) {
    console.error("[QuotaRouter] Failed to fetch quota:", err);
    res.status(503).json({ error: "Quota service temporarily unavailable", details: err.message });
  }
});

router.get("/stream", async (req, res) => {
  try {
    await QuotaService.addSubscriber(req, res);
  } catch (err: any) {
    console.error("[QuotaRouter] Failed to initialize SSE stream:", err);
    res.status(500).end();
  }
});

export default router;
