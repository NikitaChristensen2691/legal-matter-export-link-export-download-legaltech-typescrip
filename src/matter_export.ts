import { createHash } from "node:crypto";
import { z } from "zod";
import { infrai } from "./infrai.js";

export const matterExportRequest = z.object({
  matterId: z.string().min(1).max(80),
  clientName: z.string().min(1).max(120),
  intakeReceivedAt: z.string().datetime(),
  signedDocumentDeliveredAt: z.string().datetime().nullable(),
  deadlineAt: z.string().datetime(),
  asOf: z.string().datetime(),
});

export type MatterExportRequest = z.infer<typeof matterExportRequest>;
export type FollowUpState = "awaiting_signature" | "follow_up_due" | "on_track";

export function decideFollowUp(matter: MatterExportRequest): FollowUpState {
  if (!matter.signedDocumentDeliveredAt) return "awaiting_signature";
  const hoursLeft = (Date.parse(matter.deadlineAt) - Date.parse(matter.asOf)) / 3_600_000;
  return hoursLeft <= 72 ? "follow_up_due" : "on_track";
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function makeCsv(matter: MatterExportRequest, state: FollowUpState): string {
  const row = [
    matter.matterId,
    matter.clientName,
    matter.intakeReceivedAt,
    matter.signedDocumentDeliveredAt ?? "pending",
    matter.deadlineAt,
    state,
  ];
  return [
    "matter_id,client_name,intake_received_at,signed_document_delivered_at,deadline_at,follow_up_state",
    row.map(csvCell).join(","),
  ].join("\n");
}

export async function exportMatter(matter: MatterExportRequest): Promise<{ downloadUrl: string; followUpState: FollowUpState }> {
  const followUpState = decideFollowUp(matter);
  const csv = makeCsv(matter, followUpState);
  const key = `matter-exports/${matter.matterId}.csv`;
  const operationId = createHash("sha256").update(`${matter.matterId}:${matter.asOf}`).digest("hex");
  const bucket = process.env.INFRAI_EXPORT_BUCKET ?? "legal-matter-exports";

  await infrai.storage.object.put(bucket, key, {
    data_base64: Buffer.from(csv).toString("base64"),
    content_type: "text/csv; charset=utf-8",
    idempotency_key: operationId,
  });
  await infrai.pdf.generate({
    markdown: `# Matter ${matter.matterId}\n\nClient: ${matter.clientName}\n\nFollow-up: ${followUpState}`,
    page_size: "A4",
    orientation: "portrait",
    store: false,
  });
  const { url } = await infrai.storage.object.presign(bucket, key, {
    op: "get",
    expires_seconds: 900,
    response_disposition: `attachment; filename="matter-${matter.matterId}.csv"`,
  });
  return { downloadUrl: url, followUpState };
}
