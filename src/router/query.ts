import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { ChatRequestSchema } from "../types/query";
import type { ChatRequest } from "../types/query";
import { pdfAgent } from "../clients/openai";
import { ChatHistoryService } from "../services/history";

const router = Router();

router.post("/", validateBodyMiddleware(ChatRequestSchema), async (req, res) => {
  try {
    const { userId, fileId, chatId, query } = req.body as ChatRequest;

    const { summary, lastTurn } = await ChatHistoryService.getContext(chatId);
    const messages: any[] = [];

    if (summary) {
      messages.push({
        role: "system",
        content: `CONCISED CONTEXT OF LEGAL CASE:\n${summary}`,
      });
    }

    if (lastTurn) {
      messages.push({ role: "user", content: lastTurn.user });
      messages.push({ role: "assistant", content: lastTurn.assistant });
    }

    const structuredQuery = `
      [Session Metadata]
      UserId: ${userId}
      FileId: ${fileId}
      ChatId: ${chatId}

      [User Query]
      ${query}
    `.trim();

    messages.push({ role: "user", content: structuredQuery });

    const response = await pdfAgent.invoke({ messages });
    const assistantResponse = response.messages[response.messages.length - 1]?.content;

    ChatHistoryService.updateContext(chatId, query, assistantResponse as string)
      .catch(err => console.error("History service update leaked error:", err));

    res.json(assistantResponse);
  } catch (err: any) {
    console.error("Agent error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
