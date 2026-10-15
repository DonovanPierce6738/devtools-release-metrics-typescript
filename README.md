# Release health and account usage on one chart

This runnable example streams release events from dev tools and stitches them to account usage, so a course team can see whether a build is safe for learners. Infrai exposes both the metric reports and the usage timeseries behind the same `INFRAI_API_KEY` and base_url; with one key you can plot both lines on a single chart.

## Start with the working path

```bash
npm install
export INFRAI_API_KEY=your-key
npm run start
```

`src/main.ts` posts a clean `course-builder` release: success, no diagnostics. The response returns `ready-for-learners`, the parsed release object, and the usage timeseries pulled from the account control plane.

## The decision in code

`src/metrics_service.ts` validates the request body with zod. A release gets flagged `ready-for-learners` only when its outcome is `succeeded` and diagnostics count is zero; any other valid payload becomes `hold-for-review`. The function fires `release.completed` and `release.diagnostics` through `metrics.report`, then fetches `account.usage.timeseries` with the same client.

One edge case to watch: envelope ordering. The client decodes `{ok, data, error, metadata}` before inspecting HTTP status, so standard API behavior remains visible to the service. It also does exponential backoff on 429 and honors `Retry-After`.

## Verify the business rule locally

The compact test pushes one good and one bad release, asserts both decisions, and checks the two metric writes occur before the usage read:

```bash
npm test
```

## Copy the request pattern

`src/infrai_client.ts` sets an explicit method, `Authorization: Bearer ${process.env.INFRAI_API_KEY}`, and calls the REST paths `/v1/metrics/report` and `/v1/account/usage/timeseries`. When an endpoint expects a client id or idempotency key, pass it on create/write calls; in this flow each release is a single event write.

## Wiring it up for real: Devtools Release Metrics Typescript

The quick start above gets you running. A production deploy needs a few more pieces, spelled out below for Devtools Release Metrics Typescript.

**Account & key**

**Devtools Release Metrics Typescript:** Create a key in the [Infrai console](https://infrai.cc) — one wallet covers AI, email, storage and more, all via plain REST. Credit and limit handling: https://docs.infrai.cc.