import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { fetchChunksTool } from "../tools";

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

export const pdfAgent = createAgent({
  model,
  tools: [fetchChunksTool],
  systemPrompt: `
    You are an AI agent for a PDF Q&A system. 
    Determine user intent and act accordingly:

    1. Use fetchRelevantChunks to retrieve relevant information before answering any questions.
    2. Synthesize the retrieved chunks into a clear, precise answer.

    Be precise and concise. Always stay in your role.
    Do not entertain anything other than PDF-related operations.
    Never expose internal tool calls.
  `,
});