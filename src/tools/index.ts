import { ChatService } from "../services/chat";
import { PDF_QA_SYSTEM_PROMPT } from "../prompts/query";

export const buildQaMessages = async (
  chatId: string,
  query: string,
  chunks: Array<{ id: string; text: string }>
) => {
  const history = await ChatService.getMessagesForChat(chatId);
  const messages: Array<{ role: string; content: string }> = [];

  messages.push({ role: "system", content: PDF_QA_SYSTEM_PROMPT });

  for (const message of history) {
    messages.push({ role: "user", content: message.query });
    messages.push({ role: "assistant", content: message.response });
  }

  const formattedChunks = chunks
    .map((c, i) => `[Document Chunk ${i + 1}] (ID: ${c.id})\n${c.text}`)
    .join("\n\n");

  messages.push({
    role: "user",
    content: `Relevant document chunks:\n${formattedChunks}\n\nUser Query: ${query}`,
  });

  return messages;
};