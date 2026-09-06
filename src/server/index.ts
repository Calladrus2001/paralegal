import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import uploadRouter from "./router/upload";
import queryRouter from "./router/query";
import feedbackRouter from "./router/feedback";
import chatRouter from "./router/chat";
import quotaRouter from "./router/quota";

const app = express();
const port = process.env.PORT || 3000;
const env = process.env.env || "local";

const allowedOrigins =
  env === "live"
    ? [/^https:\/\/([a-zA-Z0-9-]+\.)?vishesh-dugar\.me$/]
    : ["http://localhost:5173"];

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "128kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/upload", uploadRouter);
app.use("/api/query", queryRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/chats", chatRouter);
app.use("/api/quota", quotaRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  const message = env === "live" ? "Internal server error" : err.message;
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

export { app };
