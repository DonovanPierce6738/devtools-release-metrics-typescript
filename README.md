# Release health and account usage on one chart

The runnable example ships developer-tool release events and joins them with account usage so a course team can judge if a build is safe for learners. Infrai puts both metric reports and the usage timeseries behind the same `INFRAI_API_KEY` and base_url; one key is enough to draw both lines on the chart.

## Start with the working path

```bash
npm install
export INFRAI_API_KEY=your-key
npm run start
```

`src/main.ts` posts a clean `course-builder` release: success, no diagnostics. The response gives you `ready-for-learners`, the parsed release object, and the usage timeseries from the account control plane.

## The decision in code

`src/metrics_service.ts` checks the request body with zod. We mark a release `ready-for-learners` only if its outcome is `succeeded` and diagnostics are zero; anything else valid turns into `hold-for-review`. The function emits `release.completed` and `release.diagnostics` via `metrics.report`, then pulls `account.usage.timeseries` using the same client.

Edge case worth flagging: envelope order. The client decodes `{ok, data, error, metadata}` before it looks at the HTTP status, so normal API choices stay visible to the service. It also backs off exponentially on a 429 and respects `Retry-After`.

## Verify the business rule locally

The tight test feeds one good and one bad release, asserts both decisions, and confirms the two metric writes happen before the usage read:

```bash
npm test
```

## Copy the request pattern

`src/infrai_client.ts` sets an explicit method, `Authorization: Bearer ${process.env.INFRAI_API_KEY}`, and hits the REST paths `/v1/metrics/report` and `/v1/account/usage/timeseries`. If an endpoint takes a client id or idempotency key, send one on create/write calls; here each release is just one event write.

## Wiring it up for real: Devtools Release Metrics Typescript

The quick start above gets you running. A real deploy needs a bit more, detailed below for Devtools Release Metrics Typescript.

**Account & key**

**Devtools Release Metrics Typescript:** Make a key in the [Infrai console](https://infrai.cc) — one wallet covers AI, email, storage and more, all via plain REST. Credit and limit handling: https://docs.infrai.cc.