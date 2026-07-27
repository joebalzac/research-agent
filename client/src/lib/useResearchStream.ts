import { useCallback, useRef, useState } from "react";
import type { AgentEvent, Source } from "./events";

export type Phase = "idle" | "running" | "done" | "error" | "cancelled";

export type TimelineEntry =
  | { id: string; kind: "status"; message: string }
  | { id: string; kind: "tool_call"; tool: string; input: Record<string, unknown>; output?: string }
  | { id: string; kind: "source"; source: Source };

interface StreamState {
  phase: Phase;
  timeline: TimelineEntry[];
  streamingText: string;
  report: string;
  sources: Source[];
  errorMessage: string | null;
}

const initialState: StreamState = {
  phase: "idle",
  timeline: [],
  streamingText: "",
  report: "",
  sources: [],
  errorMessage: null,
};

let nextId = 0;
const makeId = () => `evt-${nextId++}`;

function applyEvent(state: StreamState, event: AgentEvent): StreamState {
  switch (event.type) {
    case "status":
      return { ...state, timeline: [...state.timeline, { id: makeId(), kind: "status", message: event.message }] };

    case "tool_call":
      return {
        ...state,
        timeline: [...state.timeline, { id: makeId(), kind: "tool_call", tool: event.tool, input: event.input }],
      };

    case "tool_result": {
      const reverseIdx = [...state.timeline]
        .reverse()
        .findIndex((entry) => entry.kind === "tool_call" && entry.tool === event.tool && entry.output === undefined);
      if (reverseIdx === -1) return state;
      const idx = state.timeline.length - 1 - reverseIdx;
      const timeline = state.timeline.slice();
      const entry = timeline[idx];
      if (entry.kind !== "tool_call") return state;
      timeline[idx] = { ...entry, output: event.output };
      return { ...state, timeline };
    }

    case "text":
      return { ...state, streamingText: state.streamingText + event.delta };

    case "source":
      return { ...state, timeline: [...state.timeline, { id: makeId(), kind: "source", source: event.source }] };

    case "done":
      return { ...state, phase: "done", report: event.report || state.streamingText, sources: event.sources };

    case "error":
      return { ...state, phase: "error", errorMessage: event.message };
  }
}

export function useResearchStream() {
  const [state, setState] = useState<StreamState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (question: string, dir?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...initialState, phase: "running" });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, dir: dir || undefined }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const event = JSON.parse(dataLine.slice("data: ".length)) as AgentEvent;
          setState((current) => applyEvent(current, event));
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setState((current) => ({ ...current, phase: "cancelled" }));
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setState((current) => ({ ...current, phase: "error", errorMessage: message }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { ...state, start, cancel, reset };
}
