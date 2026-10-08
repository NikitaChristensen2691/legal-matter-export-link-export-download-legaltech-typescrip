import assert from "node:assert/strict";
import test from "node:test";
import { decideFollowUp, matterExportRequest } from "./matter_export.js";

test("a delivered document with 72 hours left enters deadline follow-up", () => {
  const matter = matterExportRequest.parse({
    matterId: "MAT-2048",
    clientName: "Rivera Holdings",
    intakeReceivedAt: "2026-09-25T09:00:00.000Z",
    signedDocumentDeliveredAt: "2026-09-27T12:00:00.000Z",
    deadlineAt: "2026-09-30T12:00:00.000Z",
    asOf: "2026-09-28T12:00:00.000Z",
  });
  assert.equal(decideFollowUp(matter), "follow_up_due");
});

test("an undelivered signed document stays in signature follow-up", () => {
  const matter = matterExportRequest.parse({
    matterId: "MAT-2049",
    clientName: "Northwind Legal",
    intakeReceivedAt: "2026-09-25T09:00:00.000Z",
    signedDocumentDeliveredAt: null,
    deadlineAt: "2026-10-10T12:00:00.000Z",
    asOf: "2026-09-28T12:00:00.000Z",
  });
  assert.equal(decideFollowUp(matter), "awaiting_signature");
});
