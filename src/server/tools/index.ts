import { ChatService } from "../services/chat";
import { PDF_QA_SYSTEM_PROMPT } from "../prompts/query";

export const buildQaMessages = async (
  chatId: string,
  query: string,
  chunks: Array<{ id: string; text: string }>,
  existingHistory?: Array<{ query: string; response: string }>
) => {
  const history = existingHistory ?? (await ChatService.getMessagesForChat(chatId));
  const messages: Array<{ role: string; content: string }> = [];

  messages.push({ role: "system", content: PDF_QA_SYSTEM_PROMPT });

  for (const message of history) {
    messages.push({ role: "user", content: message.query });
    messages.push({ role: "assistant", content: message.response });
  }

  const formattedChunks =
    chunks.length > 0
      ? chunks
          .map((c) => `<document>\n${c.text}\n</document>`)
          .join("\n")
      : "No matching documents found.";

  messages.push({
    role: "user",
    content: `<documents>\n${formattedChunks}\n</documents>\n\n<user_query>\n${query}\n</user_query>\n\nAnswer the user query strictly using the provided documents above. If the information is not contained in the documents, state that clearly.`,
  });

  return messages;
};