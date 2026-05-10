import type { S3Event, SQSEvent } from "aws-lambda";
import { s3 } from "../../clients/aws";
import PDFParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import paralegalVectorDbClient from "../../clients/weaviate";

export const handler = async (event: SQSEvent) => {
  try {
    const sqsRecord = event.Records[0];
    if (!sqsRecord) throw new Error("[ProcessFileLambda] No SQS records in event");

    const s3Event: S3Event = JSON.parse(sqsRecord.body);
    const s3Record = s3Event.Records?.[0]?.s3;
    if (!s3Record) throw new Error("[ProcessFileLambda] Malformed S3 event: missing s3 record");

    const Bucket = s3Record.bucket.name;
    const Key = s3Record.object.key;
    const [userId, fileId] = Key.split("/");
    if (!userId || !fileId) throw new Error(`[ProcessFileLambda] Invalid S3 key format: "${Key}"`);

    const response = await s3.getObject({ Bucket, Key });
    const bodyBytes = await response.Body!.transformToByteArray();
    const buffer = Buffer.from(bodyBytes);

    const result = await PDFParse(buffer);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 150,
    });
    const docs = await splitter.createDocuments([result.text]);

    await paralegalVectorDbClient.deleteFileChunks(userId, fileId); // for idempotency
    await paralegalVectorDbClient.addChunksToParalegal(docs, userId, fileId);
  } catch (error) {
    console.error("[ProcessFileLambda]", error);
    throw error;
  }
};
