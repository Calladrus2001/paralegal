import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { fetchChunksTool } from "../tools";

export const model = new ChatOpenAI({
  model: "gpt-4o",
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

    1. If needed, fetch relevant information using fetchChunksTool before summarizing or answering.
    2. If summary, gist, takeaway, etc of the whole document is needed, use summarizeDocument.
    3. If summary, gist, takeaway, etc of a section, topic, or part is needed, use summarizeSection.

    Be precise and concise. Always stay in your role.
    Do not entertain anything other than above operations.
    Never expose internal tool calls.
  `,
});