import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import uploadRouter from "./router/upload";
import queryRouter from "./router/query";
import feedbackRouter from "./router/feedback";

const app = express();
const port = process.env.PORT || 3000;
const env = process.env.env || "local";

app.use(helmet());
app.use(express.json({ limit: "128kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/upload", uploadRouter);
app.use("/query", queryRouter);
app.use("/feedback", feedbackRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  const message = env === "prod" ? "Internal server error" : err.message;
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

export { app };
