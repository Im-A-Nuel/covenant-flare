import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddr(addr?: string, size = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

/** Convert a decimal amount (e.g. "2.1") to base units for a token with `decimals` places. */
export function toUnits(amount: number | string, decimals: number): bigint {
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

export function fromUnits(units: bigint, decimals: number): number {
  return Number(units) / 10 ** decimals;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Agent reports come back as markdown. The verdict panel renders plain text,
 * so flatten the syntax rather than pulling in a markdown renderer: without
 * this the final proof screen shows literal `##`, `**` and table pipes.
 */
export function cleanReport(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, "") // table separator rows (---|---)
    .replace(/^\s*\|(.+)\|\s*$/gm, (_m, row) =>
      String(row)
        .split("|")
        .map((cell: string) => cell.trim())
        .filter(Boolean)
        .join(" · ")
    ) // table rows -> "a · b · c"
    .replace(/^#{1,6}\s*/gm, "") // headings
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/__(.*?)__/g, "$1") // bold, underscore form
    .replace(/(^|\s)\*(\S[^*]*?)\*/g, "$1$2") // italics
    .replace(/(^|\s)_(\S[^_]*?)_(?=\s|$)/g, "$1$2") // italics, underscore form
    .replace(/^\s*[-*]\s+/gm, "• ") // bullets
    .replace(/\n{3,}/g, "\n\n") // collapse blank runs
    .trim();
}
