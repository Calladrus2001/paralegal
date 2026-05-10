import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createFetchChunksTool } from "../tools";
import { PDF_AGENT_SYSTEM_PROMPT } from "../prompts/query";

export const CHAT_MODEL = "gpt-4o";

export const model = new ChatOpenAI({
  model: CHAT_MODEL,
  temperature: 0.1,
  apiKey: process.env.OPENAI_API_KEY,
});

export const summarizerModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Creates a PDF agent with userId/fileId-bound tools.
 * Called per-request so the tool closure captures the correct context.
 */
export function createPdfAgent(userId: string, fileId: string) {
  return createAgent({
    model,
    tools: [createFetchChunksTool(userId, fileId)],
    systemPrompt: PDF_AGENT_SYSTEM_PROMPT,
  });
}