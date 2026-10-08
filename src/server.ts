import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai.js";
import { exportMatter, matterExportRequest } from "./matter_export.js";

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/matter-exports") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = matterExportRequest.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    send(response, 201, await exportMatter(body));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid matter export request" });
      return;
    }
    if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.detail.code ?? error.message,
      });
      return;
    }
    send(response, 500, { error: "Export could not be created" });
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Matter export service listening on http://localhost:3000");
});
