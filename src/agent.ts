import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { localFileTools, runLocalFileTool } from "./tools/localFiles.js";

const MAX_TURNS = 8;
const MAX_TOKENS = 4096;

export interface Source {
  type: "web" | "local";
  title: string;
  url?: string;
}

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "text"; delta: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; output: string }
  | { type: "source"; source: Source }
  | { type: "done"; report: string; sources: Source[] }
  | { type: "error"; message: string };

export interface RunResearchOptions {
  question: string;
  rootDir?: string;
  onEvent?: (event: AgentEvent) => void;
  signal?: AbortSignal;
}

const SYSTEM_PROMPT = `You are a research assistant. Given a question, investigate it using the tools available to you:
- web_search to find and read current information from the internet
- list_directory, read_file, and search_local_files to investigate a local set of documents, when a research root directory is available

Match your answer's length and structure to the question:
- Simple factual questions ("what year did X happen", "who is Y") get a direct, short answer — a sentence or two, no headings, no Sources section, and no tool calls if you already reliably know the answer.
- Open-ended or multi-faceted research questions get deeper investigation: use as many tool calls as needed, prefer multiple cross-checked sources, and write the final answer as a well-structured Markdown report with clear headings, ending with a "Sources" section listing the web URLs and local file paths you actually used.

If no local research root is available, rely on web search alone. If a claim cannot be verified, say so instead of guessing.`;

function buildWebSearchTool(): Tool {
  return {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 8,
  } as unknown as Tool;
}

export async function runResearch({ question, rootDir, onEvent, signal }: RunResearchOptions): Promise<{
  report: string;
  sources: Source[];
}> {
  const emit = (event: AgentEvent) => onEvent?.(event);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const message = "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.";
    emit({ type: "error", message });
    throw new Error(message);
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.MODEL || "claude-opus-4-8";

  const tools: Tool[] = [buildWebSearchTool()];
  if (rootDir) tools.push(...localFileTools);

  const messages: MessageParam[] = [{ role: "user", content: question }];
  const sources: Source[] = [];
  const seenSourceKeys = new Set<string>();

  const addSource = (source: Source) => {
    const key = `${source.type}:${source.url ?? source.title}`;
    if (seenSourceKeys.has(key)) return;
    seenSourceKeys.add(key);
    sources.push(source);
    emit({ type: "source", source });
  };

  let finalText = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (signal?.aborted) break;

    const stream = client.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
        tools,
      },
      { signal }
    );

    stream.on("text", (delta) => emit({ type: "text", delta }));

    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const query = (block.input as { query?: string } | undefined)?.query;
        emit({ type: "status", message: query ? `Searching the web for "${query}"...` : "Searching the web..." });
      } else if (block.type === "web_search_tool_result") {
        const content = block.content;
        if (Array.isArray(content)) {
          for (const result of content) {
            addSource({ type: "web", title: result.title, url: result.url });
          }
        }
      }
    });

    let final;
    try {
      final = await stream.finalMessage();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "error", message });
      throw err;
    }

    messages.push({ role: "assistant", content: final.content });

    const toolUseBlocks = final.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use"
    );

    const textBlocks = final.content.filter((block) => block.type === "text");
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((block) => block.text).join("\n\n");
    }

    if (final.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      break;
    }

    const toolResults = toolUseBlocks.map((block) => {
      emit({ type: "tool_call", tool: block.name, input: block.input as Record<string, unknown> });
      const output = runLocalFileTool(rootDir ?? process.cwd(), block.name, block.input as Record<string, unknown>);
      emit({ type: "tool_result", tool: block.name, output });

      if (block.name === "read_file") {
        const path = (block.input as { path?: string })?.path;
        if (path && !output.startsWith("Error") && !output.startsWith("File not found")) {
          addSource({ type: "local", title: path });
        }
      }

      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: output,
      };
    });

    messages.push({ role: "user", content: toolResults });
  }

  emit({ type: "done", report: finalText, sources });
  return { report: finalText, sources };
}
