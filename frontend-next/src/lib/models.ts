export type Provider = "openai" | "anthropic";

export interface ModelOption {
  id:    string;
  label: string;
  group: string;
}

/** Chat / reasoning models from https://developers.openai.com/api/docs/models */
export const OPENAI_MODELS: ModelOption[] = [
  // GPT-5.5 — flagship (Apr 2026)
  { id: "gpt-5.5",                  label: "GPT-5.5",                         group: "GPT-5.5" },
  { id: "gpt-5.5-2026-04-23",       label: "GPT-5.5 (2026-04-23)",            group: "GPT-5.5" },
  { id: "gpt-5.5-pro",              label: "GPT-5.5 Pro",                     group: "GPT-5.5" },
  { id: "gpt-5.5-pro-2026-04-23",   label: "GPT-5.5 Pro (2026-04-23)",        group: "GPT-5.5" },

  // GPT-5.4
  { id: "gpt-5.4",                  label: "GPT-5.4",                         group: "GPT-5.4" },
  { id: "gpt-5.4-2026-03-05",       label: "GPT-5.4 (2026-03-05)",            group: "GPT-5.4" },
  { id: "gpt-5.4-mini",             label: "GPT-5.4 Mini",                    group: "GPT-5.4" },
  { id: "gpt-5.4-mini-2026-03-17",  label: "GPT-5.4 Mini (2026-03-17)",       group: "GPT-5.4" },
  { id: "gpt-5.4-nano",             label: "GPT-5.4 Nano",                    group: "GPT-5.4" },
  { id: "gpt-5.4-nano-2026-03-17",  label: "GPT-5.4 Nano (2026-03-17)",       group: "GPT-5.4" },
  { id: "gpt-5.4-pro",              label: "GPT-5.4 Pro",                     group: "GPT-5.4" },
  { id: "gpt-5.4-pro-2026-03-05",   label: "GPT-5.4 Pro (2026-03-05)",        group: "GPT-5.4" },

  // GPT-5.x
  { id: "gpt-5.3-chat-latest",      label: "GPT-5.3 Chat (latest)",           group: "GPT-5" },
  { id: "gpt-5.2",                  label: "GPT-5.2",                         group: "GPT-5" },
  { id: "gpt-5.2-2025-12-11",       label: "GPT-5.2 (2025-12-11)",            group: "GPT-5" },
  { id: "gpt-5.2-pro",              label: "GPT-5.2 Pro",                     group: "GPT-5" },
  { id: "gpt-5.2-pro-2025-12-11",   label: "GPT-5.2 Pro (2025-12-11)",        group: "GPT-5" },
  { id: "gpt-5.2-chat-latest",      label: "GPT-5.2 Chat (latest)",           group: "GPT-5" },
  { id: "gpt-5.1",                  label: "GPT-5.1",                         group: "GPT-5" },
  { id: "gpt-5.1-2025-11-13",       label: "GPT-5.1 (2025-11-13)",            group: "GPT-5" },
  { id: "gpt-5.1-codex",            label: "GPT-5.1 Codex",                   group: "GPT-5" },
  { id: "gpt-5.1-mini",             label: "GPT-5.1 Mini",                    group: "GPT-5" },
  { id: "gpt-5.1-chat-latest",      label: "GPT-5.1 Chat (latest)",           group: "GPT-5" },
  { id: "gpt-5",                    label: "GPT-5",                           group: "GPT-5" },
  { id: "gpt-5-2025-08-07",         label: "GPT-5 (2025-08-07)",              group: "GPT-5" },
  { id: "gpt-5-mini",               label: "GPT-5 Mini",                      group: "GPT-5" },
  { id: "gpt-5-mini-2025-08-07",    label: "GPT-5 Mini (2025-08-07)",         group: "GPT-5" },
  { id: "gpt-5-nano",               label: "GPT-5 Nano",                      group: "GPT-5" },
  { id: "gpt-5-nano-2025-08-07",    label: "GPT-5 Nano (2025-08-07)",         group: "GPT-5" },
  { id: "gpt-5-chat-latest",        label: "GPT-5 Chat (latest)",             group: "GPT-5" },

  // GPT-4.1
  { id: "gpt-4.1",                  label: "GPT-4.1",                         group: "GPT-4.1" },
  { id: "gpt-4.1-2025-04-14",       label: "GPT-4.1 (2025-04-14)",            group: "GPT-4.1" },
  { id: "gpt-4.1-mini",             label: "GPT-4.1 Mini",                    group: "GPT-4.1" },
  { id: "gpt-4.1-mini-2025-04-14",  label: "GPT-4.1 Mini (2025-04-14)",       group: "GPT-4.1" },
  { id: "gpt-4.1-nano",             label: "GPT-4.1 Nano",                    group: "GPT-4.1" },
  { id: "gpt-4.1-nano-2025-04-14",  label: "GPT-4.1 Nano (2025-04-14)",       group: "GPT-4.1" },

  // Reasoning (o-series)
  { id: "o4-mini",                  label: "o4 Mini",                         group: "Reasoning" },
  { id: "o4-mini-2025-04-16",       label: "o4 Mini (2025-04-16)",            group: "Reasoning" },
  { id: "o3",                       label: "o3",                              group: "Reasoning" },
  { id: "o3-2025-04-16",            label: "o3 (2025-04-16)",                 group: "Reasoning" },
  { id: "o3-mini",                  label: "o3 Mini",                         group: "Reasoning" },
  { id: "o3-mini-2025-01-31",       label: "o3 Mini (2025-01-31)",            group: "Reasoning" },
  { id: "o1",                       label: "o1",                              group: "Reasoning" },
  { id: "o1-2024-12-17",            label: "o1 (2024-12-17)",                 group: "Reasoning" },
  { id: "o1-preview",               label: "o1 Preview",                      group: "Reasoning" },
  { id: "o1-mini",                  label: "o1 Mini",                         group: "Reasoning" },

  // GPT-4o
  { id: "gpt-4o",                   label: "GPT-4o",                          group: "GPT-4o" },
  { id: "gpt-4o-2024-11-20",        label: "GPT-4o (2024-11-20)",             group: "GPT-4o" },
  { id: "gpt-4o-2024-08-06",        label: "GPT-4o (2024-08-06)",             group: "GPT-4o" },
  { id: "gpt-4o-2024-05-13",        label: "GPT-4o (2024-05-13)",             group: "GPT-4o" },
  { id: "gpt-4o-mini",              label: "GPT-4o Mini",                     group: "GPT-4o" },
  { id: "gpt-4o-mini-2024-07-18",   label: "GPT-4o Mini (2024-07-18)",        group: "GPT-4o" },
  { id: "chatgpt-4o-latest",        label: "ChatGPT-4o (latest)",             group: "GPT-4o" },

  // Legacy GPT-4 / 3.5
  { id: "gpt-4-turbo",              label: "GPT-4 Turbo",                     group: "Legacy" },
  { id: "gpt-4-turbo-2024-04-09",   label: "GPT-4 Turbo (2024-04-09)",        group: "Legacy" },
  { id: "gpt-4",                    label: "GPT-4",                           group: "Legacy" },
  { id: "gpt-4-0613",               label: "GPT-4 (0613)",                    group: "Legacy" },
  { id: "gpt-3.5-turbo",            label: "GPT-3.5 Turbo",                   group: "Legacy" },
  { id: "gpt-3.5-turbo-0125",       label: "GPT-3.5 Turbo (0125)",            group: "Legacy" },
];

/** Active models from https://platform.claude.com/docs/en/about-claude/models/overview */
export const ANTHROPIC_MODELS: ModelOption[] = [
  { id: "claude-opus-4-8",           label: "Claude Opus 4.8",                group: "Claude 4.8" },
  { id: "claude-opus-4-7",           label: "Claude Opus 4.7",                group: "Claude 4.7" },
  { id: "claude-opus-4-6",           label: "Claude Opus 4.6",                group: "Claude 4.6" },
  { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6",              group: "Claude 4.6" },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5",             group: "Claude 4.5" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5",               group: "Claude 4.5" },
  { id: "claude-opus-4-5-20251101",  label: "Claude Opus 4.5",                group: "Claude 4.5" },
  { id: "claude-opus-4-1-20250805",  label: "Claude Opus 4.1 (deprecated)",   group: "Legacy" },
  { id: "claude-sonnet-4-20250514",  label: "Claude Sonnet 4 (deprecated)",   group: "Legacy" },
  { id: "claude-opus-4-20250514",    label: "Claude Opus 4 (deprecated)",     group: "Legacy" },
  { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet (retired)",   group: "Legacy" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (retired)",   group: "Legacy" },
  { id: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku (retired)",   group: "Legacy" },
  { id: "claude-3-opus-20240229",    label: "Claude 3 Opus (legacy)",         group: "Legacy" },
  { id: "claude-3-sonnet-20240229",  label: "Claude 3 Sonnet (legacy)",       group: "Legacy" },
  { id: "claude-3-haiku-20240307",   label: "Claude 3 Haiku (retired)",       group: "Legacy" },
];

/** USD per output token — used for cost estimates in the dashboard */
export const MODEL_OUTPUT_CPT: Record<string, number> = {
  // OpenAI GPT-5.5
  "gpt-5.5":                    0.00003,
  "gpt-5.5-2026-04-23":         0.00003,
  "gpt-5.5-pro":                0.00018,
  "gpt-5.5-pro-2026-04-23":     0.00018,
  // GPT-5.4
  "gpt-5.4":                    0.000015,
  "gpt-5.4-2026-03-05":         0.000015,
  "gpt-5.4-mini":               0.0000045,
  "gpt-5.4-mini-2026-03-17":    0.0000045,
  "gpt-5.4-nano":               0.00000125,
  "gpt-5.4-nano-2026-03-17":    0.00000125,
  "gpt-5.4-pro":                0.00018,
  "gpt-5.4-pro-2026-03-05":     0.00018,
  // GPT-5.x (approximate)
  "gpt-5.3-chat-latest":        0.000015,
  "gpt-5.2":                    0.000014,
  "gpt-5.2-pro":                0.00012,
  "gpt-5.1":                    0.000012,
  "gpt-5.1-mini":               0.000003,
  "gpt-5.1-codex":              0.000012,
  "gpt-5":                      0.00001,
  "gpt-5-mini":                 0.000003,
  "gpt-5-nano":                 0.000001,
  // GPT-4.1
  "gpt-4.1":                    0.000008,
  "gpt-4.1-mini":               0.0000016,
  "gpt-4.1-nano":               0.0000004,
  // Reasoning
  "o4-mini":                    0.0000044,
  "o3":                         0.00004,
  "o3-mini":                    0.0000044,
  "o1":                         0.00006,
  "o1-mini":                    0.000012,
  // GPT-4o / legacy
  "gpt-4o":                     0.000005,
  "gpt-4o-mini":                0.0000006,
  "gpt-4-turbo":                0.00001,
  "gpt-4":                      0.00003,
  "gpt-3.5-turbo":              0.0000005,
  // Anthropic
  "claude-opus-4-8":            0.000025,
  "claude-opus-4-7":            0.000025,
  "claude-opus-4-6":            0.000025,
  "claude-sonnet-4-6":          0.000015,
  "claude-sonnet-4-5-20250929": 0.000015,
  "claude-haiku-4-5-20251001": 0.000004,
  "claude-opus-4-5-20251101":  0.000025,
  "claude-3-5-sonnet-20241022": 0.000003,
  "claude-3-5-haiku-20241022":  0.0000008,
  "claude-3-opus-20240229":     0.000015,
  "claude-3-haiku-20240307":    0.00000025,
  "claude-sonnet-4-20250514":   0.000015,
  "claude-opus-4-20250514":     0.000015,
};

export function modelsForProvider(provider: Provider): ModelOption[] {
  return provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
}

export function defaultModelForProvider(provider: Provider): string {
  return provider === "openai" ? "gpt-5.4-mini" : "claude-haiku-4-5-20251001";
}

export function groupedModels(provider: Provider): Map<string, ModelOption[]> {
  const groups = new Map<string, ModelOption[]>();
  for (const m of modelsForProvider(provider)) {
    const list = groups.get(m.group) ?? [];
    list.push(m);
    groups.set(m.group, list);
  }
  return groups;
}

export interface ModelVariant {
  id:  string;
  tag: string;
}

export interface ModelFamily {
  id:       string;
  name:     string;
  group:    string;
  variants: ModelVariant[];
}

export interface ModelFamilyGroup {
  label:    string;
  families: ModelFamily[];
}

const ISO_DATE_SUFFIX = /^(.+)-(\d{4}-\d{2}-\d{2})$/;
const YMD8_SUFFIX       = /^(.+)-(\d{8})$/;
const LEGACY4_SUFFIX    = /^(.+)-(\d{4})$/;

/** Split dated snapshot IDs from their stable family id (e.g. gpt-5.4-2026-03-05 → gpt-5.4). */
export function parseModelVariant(id: string): { familyId: string; variantTag: string } {
  let m = id.match(ISO_DATE_SUFFIX);
  if (m) return { familyId: m[1], variantTag: m[2] };

  m = id.match(YMD8_SUFFIX);
  if (m) {
    const d = m[2];
    return {
      familyId:   m[1],
      variantTag: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
    };
  }

  m = id.match(LEGACY4_SUFFIX);
  if (m && /^(gpt|claude|o\d)/.test(m[1])) {
    return { familyId: m[1], variantTag: m[2] };
  }

  return { familyId: id, variantTag: "Latest" };
}

function familyDisplayName(familyId: string, labels: Map<string, string>): string {
  const exact = labels.get(familyId);
  if (exact) return exact;
  const first = labels.values().next().value as string | undefined;
  if (first) return first.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return familyId;
}

export function buildModelFamilies(provider: Provider): ModelFamily[] {
  const buckets = new Map<string, {
    group: string;
    variants: ModelVariant[];
    labels: Map<string, string>;
    order: number;
  }>();
  let order = 0;

  for (const m of modelsForProvider(provider)) {
    const { familyId, variantTag } = parseModelVariant(m.id);
    let bucket = buckets.get(familyId);
    if (!bucket) {
      bucket = { group: m.group, variants: [], labels: new Map(), order: order++ };
      buckets.set(familyId, bucket);
    }
    bucket.labels.set(m.id, m.label);
    bucket.variants.push({
      id:  m.id,
      tag: m.id === familyId ? "Latest" : variantTag,
    });
  }

  return Array.from(buckets.entries()).map(([familyId, bucket]) => {
    bucket.variants.sort((a, b) => {
      if (a.tag === "Latest") return -1;
      if (b.tag === "Latest") return 1;
      return b.tag.localeCompare(a.tag);
    });
    return {
      id:       familyId,
      name:     familyDisplayName(familyId, bucket.labels),
      group:    bucket.group,
      variants: bucket.variants,
    };
  }).sort((a, b) => {
    const ao = buckets.get(a.id)?.order ?? 0;
    const bo = buckets.get(b.id)?.order ?? 0;
    return ao - bo;
  });
}

export function orderedModelFamilyGroups(provider: Provider): ModelFamilyGroup[] {
  const groupOrder: string[] = [];
  const byGroup = new Map<string, ModelFamily[]>();

  for (const fam of buildModelFamilies(provider)) {
    if (!groupOrder.includes(fam.group)) groupOrder.push(fam.group);
    const list = byGroup.get(fam.group) ?? [];
    list.push(fam);
    byGroup.set(fam.group, list);
  }

  return groupOrder.map((label) => ({ label, families: byGroup.get(label) ?? [] }));
}

export function variantTagForModel(modelId: string): string {
  const { familyId, variantTag } = parseModelVariant(modelId);
  return modelId === familyId ? "Latest" : variantTag;
}

export function familyForModel(provider: Provider, modelId: string): ModelFamily | undefined {
  const { familyId } = parseModelVariant(modelId);
  return buildModelFamilies(provider).find((f) => f.id === familyId);
}

export function costPerToken(model: string): number {
  return MODEL_OUTPUT_CPT[model] ?? 0.000003;
}
