# Research Agent

A small research agent built on Claude's tool-use loop. Give it a question and it investigates using two kinds of tools — Anthropic's server-side `web_search` tool for the internet, and a set of custom tools (`list_directory`, `read_file`, `search_local_files`) scoped to a local folder of your own documents — then writes up an answer, citing whichever sources it actually used.

It ships as both a CLI and a small web UI, sharing the same agent core.

## Why this exists

Most "chat with your docs" demos only do one of web search or local retrieval. This combines both behind a single tool-use loop, and streams the agent's intermediate steps (which tool it called, what it searched for) to the client in real time rather than hiding them behind a spinner.

The agent also scales its answer to the question: a simple factual question gets a short direct answer with no tool calls, while an open-ended research question gets a fuller investigation and a structured Markdown report with a Sources section.

## Architecture

```
src/
  agent.ts          core tool-use loop (Anthropic Messages API, streaming)
  tools/localFiles.ts  list_directory / read_file / search_local_files, path-traversal safe
  cli.ts            terminal entry point
  server.ts         Express server, SSE streaming endpoint
public/             plain HTML/CSS/JS web UI served by the same Express server
```

No separate frontend build — the web UI is static files served directly by Express, kept deliberately simple rather than scaffolding a full client app.

## Setup

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
```

## Usage

**CLI:**

```bash
npm run cli -- "What are the latest developments in solid-state batteries?"
npm run cli -- "Summarize the meeting notes" --dir ./my-notes --out report.md
```

**Web UI:**

```bash
npm run server
# open http://localhost:3001
```

Enter a question, optionally point it at a local folder to search, and watch it stream status updates, the answer, and sources live.

## Design notes

- **Path-traversal safety**: local file tools resolve every path against the given root directory and reject anything that escapes it.
- **Text-file allowlist**: local file reading is limited to plain-text-like extensions (`.md`, `.txt`, `.json`, code files, etc.) — no binary or PDF parsing.
- **Source tracking**: web search results and local files actually read are deduplicated and surfaced as a `sources` list alongside the report.

## Stack

TypeScript, Express, the Anthropic SDK (`@anthropic-ai/sdk`), no frontend framework.
