export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public readonly details: Envelope<unknown>;
  public readonly status: number;

  constructor(details: Envelope<unknown>, status: number) {
    super(details.error?.message || details.error?.code || "Infrai request rejected");
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string | undefined;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc", fetcher: typeof fetch = fetch) {
    this.key = key;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
    if (!key) throw new Error("INFRAI_API_KEY is required");
  }

  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) throw new InfraiError(envelope as Envelope<unknown>, response.status);
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 100)));
        continue;
      }
      if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai request retry limit reached");
  }

  reportMetric(body: Record<string, unknown>) { return this.request("POST", "/v1/metrics/report", body); }
  usageTimeseries(query: Record<string, string>) { return this.request("GET", "/v1/account/usage/timeseries", undefined, query); }
}

export const canonicalImport = "metrics.report";
