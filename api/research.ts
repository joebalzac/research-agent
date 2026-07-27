import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolve } from "node:path";
import { runResearch } from "../src/agent.js";

// Vercel Functions run in an ephemeral, read-only filesystem, so the "local
// folder" tool has nothing real to search here — it degrades gracefully to
// "Path not found" (see src/tools/localFiles.ts) rather than erroring. It's
// only meaningful when this app is run locally against your own machine.

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

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
}
