import "dotenv/config";
import cors from "cors";
import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runResearch } from "./agent.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(resolve(__dirname, "../client/dist")));

app.post("/api/research", async (req, res) => {
  const { question, dir } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const controller = new AbortController();
  let closed = false;
  res.on("close", () => {
    if (res.writableEnded) return;
    closed = true;
    controller.abort();
  });

  const send = (event: string, data: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runResearch({
      question,
      rootDir: typeof dir === "string" && dir.trim() ? resolve(dir.trim()) : undefined,
      onEvent: (event) => send(event.type, event),
      signal: controller.signal,
    });
  } catch {
    // Already reported via the onEvent "error" handler above.
  } finally {
    if (!closed) res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Research agent server listening on http://localhost:${PORT}`);
});
