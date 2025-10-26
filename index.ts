import express from "express";
import uploadRouter from "./src/router/upload";
import queryRouter from "./src/router/query";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/upload", uploadRouter);
app.use("/query", queryRouter);

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
