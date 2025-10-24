import { s3 } from "../../clients/aws";
import { testS3EventRecord, testSQSS3Event } from "../../testfactories/aws";
import { handler } from "./index";
import fs from "fs/promises";
import path from "path";

const Bucket = process.env.S3_BUCKET_NAME;
const Key = `CTM-1/CD-1`;

(async () => {
  const pdfPath = path.join(__dirname, "./sample_pdfs/sample_200KB.pdf");
  const pdfBuffer = await fs.readFile(pdfPath);
  await handler(testSQSS3Event({ Records: [testS3EventRecord({ Bucket, Key })] }));
  await s3.putObject({
    Bucket,
    Key,
    Body: pdfBuffer,
  });
  process.exit(0);
})().catch((error) => {
  console.error("handler error", error);
  process.exit(1);
});
