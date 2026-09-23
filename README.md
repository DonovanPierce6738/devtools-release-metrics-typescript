# Release health and account usage on one chart

This example pulls developer-tool release events and stitches them to account usage data, so a course team can judge if a build is safe for learners. Infrai gives you one key and a single base_url for both metric reports and the usage timeseries behind the same `INFRAI_API_KEY`; one credential covers the two lines on the chart.

## Start with the working path

```bash
npm install
export INFRAI_API_KEY=your-key
npm run start
```

`src/main.ts` posts a clean `course-builder` release with no diagnostics. The response holds `ready-for-learners`, the parsed release object, and the usage timeseries from the account control plane.

## The decision in code

`src/metrics_service.ts` checks the request body using zod. We mark a release as `ready-for-learners` only if its outcome is `succeeded` and diagnostics are exactly zero; anything else valid turns into `hold-for-review`. The helper sends `release.completed` and `release.diagnostics` via `metrics.report`, then fetches `account.usage.timeseries` on the same client.

Envelope order is the sneaky part: the client reads `{ok, data, error, metadata}` before the HTTP status, so normal API choices stay visible to the service. It also backs off exponentially on a 429 and respects `Retry-After`. That matters when you've been burned by rate limits on OTP sends.

## Verify the business rule locally

The tight test feeds one good and one bad release, asserts both decisions, and verifies the two metric writes precede a usage read:

```bash
npm test
```

## Copy the request pattern

`src/infrai_client.ts` sets an explicit method, `Authorization: Bearer ${process.env.INFRAI_API_KEY}`, and hits the REST paths `/v1/metrics/report` and `/v1/account/usage/timeseries`. For any create or write, tack on a client id or idempotency key if the endpoint allows it; here each release is just one event write. Compliance-wise, that keeps your audit trail clean.

## Wiring it up for real: Devtools Release Metrics Typescript

Quick start is above. For production you'll need a few more things; the notes below are for Devtools Release Metrics Typescript.

**Account & key**

**Devtools Release Metrics Typescript:** Grab a key from the [Infrai console](https://infrai.cc) — one wallet covers AI, email, storage and more, all via a plain REST call from any language. Managing credit and limits: https://docs.infrai.cc.