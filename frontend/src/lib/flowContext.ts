// Shared flow context passed between pipeline steps via localStorage

export interface FlowContext {
  product_name?: string;
  category?: string;
  description?: string;
  target_audience?: string;
  brand_name?: string;
  campaign_goal?: string;
  channels?: string[];
}

const KEY = "marketing_flow_context";

export function getFlowContext(): FlowContext {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setFlowContext(patch: Partial<FlowContext>) {
  const current = getFlowContext();
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
}
