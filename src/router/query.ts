import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { querySchema } from "../types/query";
import type { QueryRequest } from "../types/query";
import paralegalVectorDbClient from "../clients/weaviate";
import openAiClient from "../clients/openai";

const router = Router();

router.post("/", validateBodyMiddleware(querySchema), async (req, res) => {
  const { query, userId } = req.body as QueryRequest;
  const similar_chunks = await paralegalVectorDbClient.semanticQuery({ query, userId });
  const chunks_text = similar_chunks.map(chunk => chunk.text)
  const prompt = `Context:\n${chunks_text.join(
    "\n---\n"
  )}\nUser question: ${query}\n\nAnswer:`;

  const completion = await openAiClient.chat.completions.create({
    model: "gpt-4o-mini-2024-07-18",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that answers using the provided context. if context does not have related information, answer the query based on what you may know but give user a disclaimer",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 512,
  });
  const answer = completion.choices[0]?.message?.content || "No answer generated.";
  res.json({
    answer,
  });
});

export default router;
