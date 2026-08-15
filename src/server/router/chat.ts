import { Router } from "express";
import { ChatService } from "../services/chat";
import { nanoid } from "nanoid";
import { validateQueryMiddleware } from "../middleware/validateQueryMiddleware";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { validateParamsMiddleware } from "../middleware/validateParamsMiddleware";
import {
  GetUserChatsQuerySchema,
  CreateChatRequestSchema,
  GetChatMessagesParamsSchema,
  DeleteChatParamsSchema,
  DeleteChatQuerySchema,
  type GetUserChatsQuery,
  type CreateChatRequest,
  type GetChatMessagesParams,
  type DeleteChatParams,
  type DeleteChatQuery,
} from "../../types/chat";

const router = Router();

/**
 * GET /api/chats?userId=...
 * Fetch all chats for a given user.
 */
router.get(
  "/",
  validateQueryMiddleware(GetUserChatsQuerySchema),
  async (req, res) => {
    try {
      const { userId } = req.query as unknown as GetUserChatsQuery;
      const chats = await ChatService.getChatsForUser(userId);
      res.json({ chats });
    } catch (error: any) {
      console.error("[ChatRouter] Failed to fetch chats:", error);
      res.status(500).json({ error: "Failed to fetch chats", details: error.message });
    }
  }
);

/**
 * POST /api/chats
 * Create a new chat for a user.
 * Server generates the unique chatId using nanoid.
 */
router.post(
  "/",
  validateBodyMiddleware(CreateChatRequestSchema),
  async (req, res) => {
    try {
      const { userId, chatTitle, chatId: providedChatId } = req.body as CreateChatRequest;
      const chatId = providedChatId || nanoid();
      const createdAt = new Date().toISOString();

      await ChatService.addChat(userId, chatId, chatTitle);

      res.status(201).json({
        chatId,
        userId,
        chatTitle,
        createdAt,
      });
    } catch (error: any) {
      console.error("[ChatRouter] Failed to create chat:", error);
      res.status(500).json({ error: "Failed to create chat", details: error.message });
    }
  }
);

/**
 * GET /api/chats/:chatId/messages
 * Fetch message history for a specific chat.
 */
router.get(
  "/:chatId/messages",
  validateParamsMiddleware(GetChatMessagesParamsSchema),
  async (req, res) => {
    try {
      const { chatId } = req.params as unknown as GetChatMessagesParams;
      const messages = await ChatService.getMessagesForChat(chatId);
      res.json({ messages });
    } catch (error: any) {
      console.error("[ChatRouter] Failed to fetch messages:", error);
      res.status(500).json({ error: "Failed to fetch messages", details: error.message });
    }
  }
);

/**
 * DELETE /api/chats/:chatId?userId=...
 * Delete a specific chat session.
 */
router.delete(
  "/:chatId",
  validateParamsMiddleware(DeleteChatParamsSchema),
  validateQueryMiddleware(DeleteChatQuerySchema),
  async (req, res) => {
    try {
      const { chatId } = req.params as unknown as DeleteChatParams;
      const { userId } = req.query as unknown as DeleteChatQuery;
      await ChatService.deleteChat(userId, chatId);
      res.json({ success: true, chatId });
    } catch (error: any) {
      console.error("[ChatRouter] Failed to delete chat:", error);
      res.status(500).json({ error: "Failed to delete chat", details: error.message });
    }
  }
);

export default router;
