import type { S3Event, SQSEvent } from "aws-lambda";
import { s3 } from "../../clients/aws";
import PDFParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import paralegalVectorDbClient from "../../clients/weaviate";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 150,
});

export const handler = async (event: SQSEvent) => {
  try {
    for (const sqsRecord of event.Records) {
      const s3Event: S3Event = JSON.parse(sqsRecord.body);
      const s3Records = s3Event.Records || [];

      for (const s3Record of s3Records) {
        const Bucket = s3Record.s3.bucket.name;
        const rawKey = s3Record.s3.object.key;
        const Key = decodeURIComponent(rawKey.replace(/\+/g, " "));

        const parts = Key.split("/");
        const [userId, chatId, fileId] = parts;

        if (!userId || !chatId || !fileId) {
          throw new Error(
            `[ProcessFileLambda] Invalid S3 key schema "${Key}". Expected "userId/chatId/fileId"`
          );
        }

        const response = await s3.getObject({ Bucket, Key });
        const bodyBytes = await response.Body!.transformToByteArray();
        const buffer = Buffer.from(bodyBytes);

        const result = await PDFParse(buffer);
        const docs = await splitter.createDocuments([result.text]);

        await paralegalVectorDbClient.deleteFileChunks(userId, fileId); // for idempotency
        await paralegalVectorDbClient.addChunksToParalegal(docs, userId, chatId, fileId);
      }
    }
  } catch (error) {
    console.error("[ProcessFileLambda] Processing failed:", error);
    throw error;
  }
};
