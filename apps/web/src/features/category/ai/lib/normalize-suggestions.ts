import type { CategoryAI, CategoryIcon } from "../schemas/category-ai.schema";

const MAX_OPTIONS = 4;
const PASTEL_LIGHTNESS = [0.84, 0.92] as const;
const PASTEL_SATURATION = [0.4, 0.95] as const;
const GRAY_MAX_SATURATION = 0.08;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const COMPOSED_EMOJI = /\u200D|[\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}]/u;

export function isSimpleEmoji(value: string) {
  const text = value.trim();
  return [...segmenter.segment(text)].length === 1 && PICTOGRAPHIC.test(text) && !COMPOSED_EMOJI.test(text);
}

const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value));

export function toPastel(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const [r, g, b] = [0, 2, 4].map((at) => parseInt(match[1].slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < GRAY_MAX_SATURATION) return null;

  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return hslToHex(h * 60, clamp(s, PASTEL_SATURATION), clamp(l, PASTEL_LIGHTNESS));
}

function hslToHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

export function normalizeCategorySuggestions(result: CategoryAI | null | undefined): CategoryAI | null {
  const seen = new Set<string>();
  const categories: CategoryAI["categories"] = [];

  for (const option of result?.categories ?? []) {
    const icon = option.icon.trim();
    const color = toPastel(option.color);
    if (!color || !isSimpleEmoji(icon) || seen.has(icon)) continue;
    seen.add(icon);
    categories.push({ icon, color });
    if (categories.length === MAX_OPTIONS) break;
  }

  return categories.length ? { categories } : null;
}

export function sanitizeSuggestions(list: CategoryIcon[] | null | undefined): CategoryIcon[] | null {
  return normalizeCategorySuggestions({ categories: list ?? [] })?.categories ?? null;
}
