import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { querySchema } from "../types/query";
import type { QueryRequest } from "../types/query";
import { pdfAgent } from "../clients/openai";

const router = Router();

router.post("/", validateBodyMiddleware(querySchema), async (req, res) => {
  try {
    const { userId, fileId, query } = req.body as QueryRequest;

    const response = await pdfAgent.invoke({
      messages: [
        {
          role: "user",
          content: `
            User ID: ${userId}
            File ID: ${fileId}
            User query: ${query}
          `,
        },
      ],
    });

    const finalMessage = response.messages[response.messages.length - 1];
    res.json(finalMessage?.content);
  } catch (err: any) {
    console.error("Agent error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
