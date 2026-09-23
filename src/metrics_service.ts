import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const releaseEvent = z.object({
  service: z.string().min(1),
  version: z.string().min(1),
  outcome: z.enum(["succeeded", "failed"]),
  diagnostics: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
});

export type ReleaseEvent = z.infer<typeof releaseEvent>;

export function releaseDecision(event: ReleaseEvent) {
  return event.outcome === "succeeded" && event.diagnostics === 0 ? "ready-for-learners" : "hold-for-review";
}

export async function reportRelease(event: unknown, client: InfraiClient) {
  const parsed = releaseEvent.parse(event);
  const decision = releaseDecision(parsed);
  await client.reportMetric({ name: "release.completed", value: 1, type: "counter", tags: { service: parsed.service, version: parsed.version, outcome: parsed.outcome } });
  await client.reportMetric({ name: "release.diagnostics", value: parsed.diagnostics, type: "counter", tags: { service: parsed.service, version: parsed.version } });
  const usage = await client.usageTimeseries({ period: "30d" });
  return { decision, release: parsed, usage };
}
