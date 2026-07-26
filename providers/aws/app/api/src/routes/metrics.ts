import type { MetricsCollector } from "../lib/metrics.js";

export async function getMetrics(collector: MetricsCollector): Promise<string> {
  return collector.renderMetrics();
}
