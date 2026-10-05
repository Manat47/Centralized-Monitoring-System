export interface MatchPreview {
  matches: boolean;
  error: string | null;
}

// Keep the same query convention and limits as monitoring-service's matcher.
export function previewLogFindingMatch(query: string, sample: string): MatchPreview {
  const trimmed = query.trim();
  if (!trimmed) return { matches: false, error: "Enter a keyword or regex pattern." };
  if (trimmed.length > 256) return { matches: false, error: "Query must be 256 characters or less." };
  const haystack = sample.slice(0, 16_384);
  if (trimmed.startsWith("regex:")) {
    const pattern = trimmed.slice(6);
    if (!pattern) return { matches: false, error: "Enter a pattern after regex:." };
    if (/\([^)]*[+*][^)]*\)[+*{]/.test(pattern)) {
      return { matches: false, error: "Nested repeated groups are not supported." };
    }
    try {
      return { matches: new RegExp(pattern, "i").test(haystack), error: null };
    } catch {
      return { matches: false, error: "Invalid regular expression." };
    }
  }
  return { matches: haystack.toLowerCase().includes(trimmed.toLowerCase()), error: null };
}
