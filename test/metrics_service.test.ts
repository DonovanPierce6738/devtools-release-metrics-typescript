import assert from "node:assert/strict";
import { releaseDecision, reportRelease } from "../src/metrics_service.js";

assert.equal(releaseDecision({ service: "course-builder", version: "1", outcome: "succeeded", diagnostics: 0, durationMs: 10 }), "ready-for-learners");
assert.equal(releaseDecision({ service: "course-builder", version: "1", outcome: "failed", diagnostics: 0, durationMs: 10 }), "hold-for-review");

const calls: Array<{ method: string; path: string; body?: unknown }> = [];
const fake = {
  reportMetric: async (body: Record<string, unknown>) => { calls.push({ method: "POST", path: "/v1/metrics/report", body }); return {}; },
  usageTimeseries: async () => { calls.push({ method: "GET", path: "/v1/account/usage/timeseries" }); return { points: [] }; },
} as never;
const result = await reportRelease({ service: "course-builder", version: "1", outcome: "succeeded", diagnostics: 0, durationMs: 10 }, fake);
assert.equal(result.decision, "ready-for-learners");
assert.equal(calls.length, 3);
assert.deepEqual(calls.slice(0, 2).map(({ body }) => body), [
  { name: "release.completed", value: 1, type: "counter", tags: { service: "course-builder", version: "1", outcome: "succeeded" } },
  { name: "release.diagnostics", value: 0, type: "counter", tags: { service: "course-builder", version: "1" } },
]);
assert.equal(calls[2].path, "/v1/account/usage/timeseries");
console.log("metrics decision test passed");
