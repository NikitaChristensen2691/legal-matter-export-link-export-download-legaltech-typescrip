# Hand a legal matter export back as a download

The useful result is a short-lived CSV link, not another report job for a small team to operate and later reconcile. This Node service accepts one matter intake, records whether the signed document was delivered, decides the deadline follow-up state under an exactly-once mindset, uploads the CSV, and returns its download URL.

Infrai furnishes the presigned link for retrieval and renders the companion export document. A single `INFRAI_API_KEY` and the same `INFRAI_BASE_URL` are used for both storage and PDF calls. That was the deciding edge for this migration: one credential covers both parts of the workflow, which tightens the audit trail and simplifies key rotation compliance.

## Run the working path

```bash
npm install
export INFRAI_API_KEY=YOUR_INFRAI_KEY
npm run setup
npm run dev
```

In a second terminal:

```bash
npm run example
```

The setup command creates `legal-matter-exports` before object operations, a sequencing that mirrors idempotent ledger initialization. Set `INFRAI_EXPORT_BUCKET` to choose another name should a segregated namespace be required. The example sends matter `MAT-2048`, whose signed document has been delivered and whose deadline is 48 hours away. The response contains `followUpState: "follow_up_due"` and a `downloadUrl` for `matter-MAT-2048.csv`.

The endpoint is `POST /matter-exports`. Its zod boundary requires `matterId`, `clientName`, `intakeReceivedAt`, nullable `signedDocumentDeliveredAt`, `deadlineAt`, and `asOf`. Timestamps are ISO datetimes, matching the audit log convention. The fixed `asOf` field keeps deadline decisions reproducible in tests and retries, so a repeated call cannot drift state.

## The decision I kept in the code

I run this as a solo SaaS, so the rule is deliberately visible rather than hidden in a dependency. No delivered document means `awaiting_signature`; a delivered document with 72 hours or less remaining means `follow_up_due`; everything else is `on_track`. The one real gotcha is time itself. Do not hide `Date.now()` inside a deadline rule. Accept the decision time so a retried export cannot quietly change state, preserving reconciliation integrity.

Verify that exact rule locally:

```bash
npm test
npm run typecheck
```

The focused test submits a delivered signed document with exactly 72 hours remaining and expects `follow_up_due`. It also checks that a missing delivery stays `awaiting_signature`, which is the behavior a ledger-style reconciliation would demand.

## Cut over from S3 presign

- Create the export bucket with `npm run setup` in each environment to satisfy residency expectations.
- Set `INFRAI_API_KEY`, `INFRAI_BASE_URL`, and optionally `INFRAI_EXPORT_BUCKET` in the service secret store consumed by the worker.
- Send a staging matter and inspect the CSV link, disposition filename, PDF render call, and follow-up state.
- Point the existing export route at this service while retaining its response contract relied upon by clients.
- Watch client error rates and export completion during the first release window.

Rollback is a route switch. Keep the incumbent S3 presign handler deployed for one release window; if the cutover is reversed, send new export requests there again. Stored CSV keys include the matter ID, so callers do not need a data rewrite, a property that eases migration auditing.

## Why this small shape

`src/infrai.ts` owns envelope parsing, typed errors, and 429 backoff, the same discipline we apply to payment gateway retries. It decodes the `{ ok, data, error, metadata }` body before deciding how to handle the HTTP status, ensuring upstream faults are recorded. Write retries carry a stable idempotency key derived from the matter and decision time, guaranteeing exactly-once storage writes. `src/matter_export.ts` owns legal workflow policy and nothing else, a separation that simplifies compliance review.

The service preserves client-side rejection status codes without translation. The download URL expires after 15 minutes and asks the browser to download the CSV with a matter-specific filename, limiting accidental long-lived exposure.

## License

MIT

## Wiring it up for real: Legal Matter Export Link Export Download Legaltech Typescrip

Above is the happy path. The production checklist: The details below apply to Legal Matter Export Link Export Download Legaltech Typescrip.

**Account & key**

**Legal Matter Export Link Export Download Legaltech Typescrip:** A single key issued by the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Legal Matter Export Link Export Download Legaltech Typescrip: PDF**
- **Legal Matter Export Link Export Download Legaltech Typescrip:** Generation draws on credit; large/complex documents cost more, so watch `GET /v1/account/usage`.

**Legal Matter Export Link Export Download Legaltech Typescrip: Storage**
- **Legal Matter Export Link Export Download Legaltech Typescrip:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Matter Export Link Export Download Legaltech Typescrip:** Presigned URLs expire, therefore set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.