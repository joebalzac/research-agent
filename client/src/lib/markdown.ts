// Strips a trailing "## Sources" / "# Sources" section from the agent's report.
// The <SourcesList> component renders sources separately from live `source`
// events, so leaving the model's own section in would show every source twice.
export function stripTrailingSourcesSection(markdown: string): string {
  const match = markdown.match(/\n#{1,3}\s*Sources\s*\n/i);
  if (!match || match.index === undefined) return markdown;
  return markdown.slice(0, match.index).trimEnd();
}
