import { infrai } from "./infrai.js";

const bucket = process.env.INFRAI_EXPORT_BUCKET ?? "legal-matter-exports";
await infrai.storage.bucket.create(bucket);
console.log(`Bucket ${bucket} is ready`);
