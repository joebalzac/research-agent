# Research Agent

A small research agent built on Claude's tool-use loop. Give it a question and it investigates using two kinds of tools — Anthropic's server-side `web_search` tool for the internet, and a set of custom tools (`list_directory`, `read_file`, `search_local_files`) scoped to a local folder of your own documents — then writes up an answer, citing whichever sources it actually used.

It ships as both a CLI and a small web UI, sharing the same agent core.

## Why this exists

Most "chat with your docs" demos only do one of web search or local retrieval. This combines both behind a single tool-use loop, and streams the agent's intermediate steps (which tool it called, what it searched for) to the client in real time rather than hiding them behind a spinner.

The agent also scales its answer to the question: a simple factual question gets a short direct answer with no tool calls, while an open-ended research question gets a fuller investigation and a structured Markdown report with a Sources section.

## Architecture

```
src/
  agent.ts             core tool-use loop (Anthropic Messages API, streaming)
  tools/localFiles.ts  list_directory / read_file / search_local_files, path-traversal safe
  cli.ts               terminal entry point
  server.ts            Express server, SSE streaming endpoint (local dev / self-hosting)
api/research.ts        Vercel serverless function wrapping the same agent core, for hosted deploys
client/                React + TypeScript UI (Vite)
  src/
    lib/useResearchStream.ts   fetch + SSE parsing hook, typed against the AgentEvent stream
    components/                AgentTimeline, ToolCallCard, SourcesList, ReportView, etc.
```

There are two ways this app runs: `src/server.ts` (Express) for local development and self-hosting, and `api/research.ts` (a Vercel Function) for the hosted deploy — both call the exact same `runResearch` core in `src/agent.ts`, just wired to different hosts.

The web UI's job is to make the agent's intermediate steps — which tool it's calling, what it searched for, which sources it found — legible in real time, rather than hiding them behind a spinner until a final answer appears.

## Setup

```bash
npm install
npm install --prefix client
cp .env.example .env   # add your ANTHROPIC_API_KEY
```

## Usage

**CLI:**

```bash
npm run cli -- "What are the latest developments in solid-state batteries?"
npm run cli -- "Summarize the meeting notes" --dir ./my-notes --out report.md
```

**Web UI (development):**

```bash
npm run dev
# open http://localhost:5173 (Vite dev server, proxies /api to Express on :3001)
```

**Web UI (production):**

```bash
npm run build          # builds client/dist
npm run server
# open http://localhost:3001
```

Enter a question, optionally expand "Local folder" to point it at a directory to search, and watch it stream status updates, tool calls, sources, and the answer live. The Stop button aborts the fetch on the client and the in-flight Anthropic request on the server, so cancelling doesn't keep burning API calls in the background.

## Deploying to Vercel

1. Import this GitHub repo at [vercel.com/new](https://vercel.com/new). `vercel.json` already tells Vercel how to build it (client build + the `api/research.ts` function) — no manual config needed.
2. Add an environment variable: `ANTHROPIC_API_KEY` (and optionally `MODEL`, same as `.env`).
3. Deploy.

Note: the "Local folder" field only works when this app is run locally against your own filesystem — Vercel Functions don't have access to your machine, so it degrades to "Path not found" on the hosted demo, which is expected.

`api/research.ts` sets `maxDuration: 60` (the Hobby-plan ceiling). Most questions finish well under that, but a very deep multi-search query occasionally might not — if that becomes a problem, Vercel Pro allows up to 300s.

## Design notes

- **Path-traversal safety**: local file tools resolve every path against the given root directory and reject anything that escapes it.
- **Text-file allowlist**: local file reading is limited to plain-text-like extensions (`.md`, `.txt`, `.json`, code files, etc.) — no binary or PDF parsing.
- **Source tracking**: web search results and local files actually read are deduplicated and surfaced as a `sources` list alongside the report.
- **Cancellation**: `server.ts` listens for the request's `close` event, aborts an `AbortSignal` threaded through to `client.messages.stream()`, and stops writing to the response once the client has disconnected.

## Stack

Backend: TypeScript, Express, the Anthropic SDK (`@anthropic-ai/sdk`).
Frontend (`client/`): React, TypeScript, Vite, Tailwind CSS v4, Motion (animation), react-markdown.
