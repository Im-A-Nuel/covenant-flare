export interface VeniceMeta {
  model: string;
  mode: "real" | "mock";
}

export interface VeniceResult {
  text: string;
  meta: VeniceMeta;
  note?: string;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function chat(messages: Msg[], opts?: { json?: boolean; temperature?: number }): Promise<VeniceResult> {
  const res = await fetch("/api/venice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...opts }),
  });
  const data = await res.json();
  return {
    text: data.text ?? "",
    meta: { model: data.model ?? "unknown", mode: data.mode ?? "mock" },
    note: data.note,
  };
}

export interface AgentPlan {
  summary: string;
  steps: string[];
  needsPaidData: boolean;
  maxAcceptablePrice: number;
}

/** Venice as the agent PLANNER. */
export async function planTask(
  task: string,
  covenant: { maxPerRequestUsd: number; purpose: string }
): Promise<{ plan: AgentPlan; meta: VeniceMeta }> {
  const sys =
    "You are an autonomous research agent operating under a strict spending covenant. " +
    "You plan tasks and decide if paid data is required. Respond ONLY as JSON with keys: " +
    "summary (string), steps (string[]), needsPaidData (boolean), maxAcceptablePrice (number in USD).";
  const user =
    `Task: ${task}\n` +
    `Covenant: max $${covenant.maxPerRequestUsd} per request, purpose "${covenant.purpose}".\n` +
    `Produce a short plan. Set needsPaidData true only if paid data clearly improves the answer.`;
  const r = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
  let plan: AgentPlan;
  try {
    plan = JSON.parse(r.text);
  } catch {
    plan = {
      summary:
        "Check free data first; buy paid data only if it meaningfully improves the result and the price is within the covenant.",
      steps: ["Gather free data", "Decide if paid data is needed", "Validate quote vs covenant", "Pay if approved", "Summarize"],
      needsPaidData: true,
      maxAcceptablePrice: covenant.maxPerRequestUsd,
    };
  }
  return { plan, meta: r.meta };
}

/** Venice as the REPORT generator. */
export async function generateReport(
  task: string,
  paidData: string | null,
  covenant: { agentLabel: string }
): Promise<{ report: string; meta: VeniceMeta }> {
  const sys = "You are a concise research analyst. Produce a short markdown risk report. No preamble.";
  const user =
    `Task: ${task}\n` +
    (paidData ? `Paid data obtained: ${paidData}\n` : "No paid data was needed.\n") +
    `Write the final risk report for agent "${covenant.agentLabel}".`;
  const r = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { temperature: 0.5 });
  return { report: r.text, meta: r.meta };
}
