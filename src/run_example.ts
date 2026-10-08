const response = await fetch("http://localhost:3000/matter-exports", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    matterId: "MAT-2048",
    clientName: "Rivera Holdings",
    intakeReceivedAt: "2026-09-25T09:00:00.000Z",
    signedDocumentDeliveredAt: "2026-09-27T12:00:00.000Z",
    deadlineAt: "2026-09-30T12:00:00.000Z",
    asOf: "2026-09-28T12:00:00.000Z"
  }),
});
console.log(await response.json());
