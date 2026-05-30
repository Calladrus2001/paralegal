import { ChatOpenAI } from "@langchain/openai";

export const CHAT_MODEL = "gpt-4o";

export const model = new ChatOpenAI({
  model: CHAT_MODEL,
  temperature: 0.1,
  apiKey: process.env.OPENAI_API_KEY,
});

export const miniModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});