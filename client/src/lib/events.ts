// Mirrors the AgentEvent/Source unions in ../../../src/agent.ts.
// This is a separate TS project (browser, not Node), so the types are
// duplicated rather than imported — keep the two definitions in sync by hand.

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
