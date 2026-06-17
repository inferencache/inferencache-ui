// SYNC: keep in sync with promptcache/src/promptcache/prefix.py DYNAMIC_SYSTEM_PROMPT_INDICATORS

export const DYNAMIC_SYSTEM_PROMPT_INDICATORS = [
  "{user}",
  "{date}",
  "{session_id}",
] as const;

export function analyzeSystemPrompt(systemPrompt: string): {
  stability_score: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const dynamicIndicators = [
    ...DYNAMIC_SYSTEM_PROMPT_INDICATORS,
    String(new Date().getFullYear()),
  ];

  for (const indicator of dynamicIndicators) {
    if (systemPrompt.includes(indicator)) {
      warnings.push(`Dynamic content detected: '${indicator}'`);
    }
  }

  if (!systemPrompt.trim()) {
    return { stability_score: 0, warnings: ["System prompt is empty"] };
  }

  const penalty = Math.min(warnings.length * 0.25, 1);
  const stability_score = Math.round((1 - penalty) * 100) / 100;

  if (warnings.length > 0) {
    warnings.push(
      "System prompt contains dynamic content — will reduce prefix cache hits. Move dynamic values to the end of the message array."
    );
  }

  return { stability_score, warnings };
}
