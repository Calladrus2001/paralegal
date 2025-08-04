import express from "express";
import uploadRouter from "./src/router/upload";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/upload", uploadRouter);

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
