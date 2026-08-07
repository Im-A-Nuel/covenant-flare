"use client";

/**
 * Local, display-only label registry. On-chain policy only stores a
 * purposeHash (bytes32), never the plaintext, and agents are addresses with
 * no on-chain nickname. This is a pure UI convenience cache (never read by
 * financial logic, never a source of truth for budgets/status) so the
 * covenant creator sees "Research Agent" / "research-data-purchase" instead
 * of raw hex on their own browser. Per CLAUDE.md: local state is fine, a
 * backend database is not -- this is the former, scoped to localStorage.
 */

const PURPOSE_KEY = "covenant_purpose_labels_v1";
const AGENT_KEY = "covenant_agent_labels_v1";

function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export function setPurposeLabel(purposeHash: string, purpose: string) {
  const map = readMap(PURPOSE_KEY);
  map[purposeHash.toLowerCase()] = purpose;
  writeMap(PURPOSE_KEY, map);
}

export function getPurposeLabel(purposeHash: string): string | undefined {
  return readMap(PURPOSE_KEY)[purposeHash.toLowerCase()];
}

export function setAgentLabel(address: string, label: string) {
  const map = readMap(AGENT_KEY);
  map[address.toLowerCase()] = label;
  writeMap(AGENT_KEY, map);
}

export function getAgentLabel(address: string): string | undefined {
  return readMap(AGENT_KEY)[address.toLowerCase()];
}
