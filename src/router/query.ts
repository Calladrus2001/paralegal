import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { querySchema } from "../types/query";
import type { QueryRequest } from "../types/query";
import paralegalVectorDbClient from "../clients/weaviate";

const router = Router();

router.post("/", validateBodyMiddleware(querySchema), async (req, res) => {
  const { query, userId } = req.body as QueryRequest;
  const similar_chunks = await paralegalVectorDbClient.semanticQuery({ query, userId });
  console.log(similar_chunks);
  res.json({
    answer: "",
  });
});

export default router;
