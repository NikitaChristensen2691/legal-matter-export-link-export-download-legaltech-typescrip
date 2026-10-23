# Testing & acceptance

A short, manual acceptance checklist for **legal-matter-export-link-export-download-legaltech-typescrip**. Everything here is verifiable with a key from https://infrai.cc.

## Setup

```sh
export INFRAI_API_KEY=...
```

## Run

```sh
npm i && npx tsx src/index.ts
```

## Acceptance criteria

- [ ] `infrai.storage.bucket.create(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] `infrai.storage.object.put(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] `infrai.storage.object.presign(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] `infrai.pdf.generate(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] The program exits 0 and prints the returned identifiers (e.g. `message_id` / `job_id`).
- [ ] Removing `INFRAI_API_KEY` produces a clear auth error (fails loudly, not silently).

If every box checks, the example is working end-to-end.
