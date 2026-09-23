import { InfraiClient } from "./infrai_client.js";
import { reportRelease } from "./metrics_service.js";

const result = await reportRelease({
  service: "course-builder",
  version: "2026.09.12",
  outcome: "succeeded",
  diagnostics: 0,
  durationMs: 1840,
}, new InfraiClient());

console.log(JSON.stringify(result, null, 2));
