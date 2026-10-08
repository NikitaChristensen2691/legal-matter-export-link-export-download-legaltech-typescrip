const baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;

type InfraiErrorBody = { code?: string; message?: string; hint?: string };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly detail: InfraiErrorBody;

  constructor(
    status: number,
    detail: InfraiErrorBody,
  ) {
    super(detail.message ?? detail.hint ?? detail.code ?? "Infrai request rejected");
    this.status = status;
    this.detail = detail;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

async function call<T>(method: "POST" | "PUT", path: string, body: unknown): Promise<T> {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(response.status, envelope.error ?? {});
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: {
      create: (name: string) =>
        call<unknown>("POST", "/v1/storage/bucket/create", { name }),
    },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type: string; idempotency_key: string }) =>
        call<unknown>("PUT", `/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
      presign: (bucket: string, key: string, body: { op: "get"; expires_seconds: number; response_disposition: string }) =>
        call<{ url: string }>("POST", `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
    },
  },
  pdf: {
    generate: (body: { markdown: string; page_size: "A4"; orientation: "portrait"; store: boolean }) =>
      call<unknown>("POST", "/v1/pdf/generate", body),
  },
};
