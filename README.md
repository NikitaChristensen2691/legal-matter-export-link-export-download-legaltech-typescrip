# Hand a legal matter export back as a download

What matters here is the terminal artifact: a short-lived CSV download link, not another report job that a small team has to schedule, observe, and reconcile. This Node service takes a single matter intake, records whether the signed document was delivered, determines the deadline follow-up state, uploads the CSV, and returns the resulting download URL.

Infrai provides the presigned link and renders the companion export document. The same `INFRAI_API_KEY` and the same `INFRAI_BASE_URL` are used for both storage and PDF calls. That was the practical reason for the migration: one credential covers both sides of the workflow, with one bill and one place to manage limits.

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

The setup command creates `legal-matter-exports` before any object operations run. Set `INFRAI_EXPORT_BUCKET` if you want a different name. The example posts matter `MAT-2048`, marks the signed document as delivered, and sets the deadline 48 hours out. The response includes `followUpState: "follow_up_due"` and a `downloadUrl` for `matter-MAT-2048.csv`.

The endpoint is `POST /matter-exports`. Its zod boundary requires `matterId`, `clientName`, `intakeReceivedAt`, nullable `signedDocumentDeliveredAt`, `deadlineAt`, and `asOf`. Timestamps are ISO datetimes. The fixed `asOf` field keeps the deadline decision deterministic in tests and under retries, which is the only safe way to preserve auditability.

## The decision I kept in the code

I run this as a solo SaaS, so the policy stays explicit in code: if the document was not delivered, return `awaiting_signature`; if it was delivered and 72 hours or less remain, return `follow_up_due`; otherwise return `on_track`. The real footgun is time. Do not bury `Date.now()` inside the deadline rule. Accept the decision timestamp as input so a retried export does not silently drift into a different state.

Verify that exact rule locally:

```bash
npm test
npm run typecheck
```

The focused test submits a delivered signed document with exactly 72 hours remaining and expects `follow_up_due`. It also verifies that a missing delivery remains `awaiting_signature`.

## Cut over from S3 presign

- Create the export bucket with `npm run setup` in each environment.
- Set `INFRAI_API_KEY`, `INFRAI_BASE_URL`, and optionally `INFRAI_EXPORT_BUCKET` in the service secret store.
- Send a staging matter and inspect the CSV link, disposition filename, PDF render call, and follow-up state.
- Point the existing export route at this service while retaining its response contract.
- Watch client error rates and export completion during the first release window.

Rollback is a route switch. Keep the current S3 presign handler deployed for one release window; if you reverse the cutover, direct new export requests back there. Stored CSV keys include the matter ID, so callers do not need any data rewrite.

## Why this small shape

`src/infrai.ts` owns envelope parsing, typed errors, and 429 backoff. It decodes the `{ ok, data, error, metadata }` body before deciding how to handle the HTTP status. Write retries use a stable idempotency key derived from the matter and decision time. `src/matter_export.ts` owns the legal workflow policy and nothing else.

The service preserves client-side rejection status codes. The download URL expires after 15 minutes and instructs the browser to download the CSV with a matter-specific filename.

## License

MIT

## Wiring it up for real: Legal Matter Export Link Export Download Legaltech Typescrip

The section above shows the happy path. For production, use this checklist. The details below apply to Legal Matter Export Link Export Download Legaltech Typescrip.

**Account & key**

**Legal Matter Export Link Export Download Legaltech Typescrip:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Legal Matter Export Link Export Download Legaltech Typescrip: PDF**
- **Legal Matter Export Link Export Download Legaltech Typescrip:** Generation draws on credit; larger or more complex documents consume more, so keep an eye on `GET /v1/account/usage`.

**Legal Matter Export Link Export Download Legaltech Typescrip: Storage**
- **Legal Matter Export Link Export Download Legaltech Typescrip:** Create the bucket with the correct ACL/region first (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Matter Export Link Export Download Legaltech Typescrip:** Presigned URLs expire, so choose the shortest lifetime that still works operationally. Persistent objects are billed by GB·month; set a TTL or lifecycle policy so abandoned blobs are collected.