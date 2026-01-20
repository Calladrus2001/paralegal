import type { S3Event, SQSEvent } from "aws-lambda";
import { s3 } from "../../clients/aws";
import { PDFParse } from "pdf-parse";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import paralegalVectorDbClient from "../../clients/weaviate";

export const handler = async (event: SQSEvent) => {
  try {
    const s3Event: S3Event = JSON.parse(event.Records[0]!.body);
    const s3Record = s3Event.Records[0]!.s3;
    const Bucket = s3Record.bucket.name;
    const Key = s3Record.object.key;
    const [userId, fileId] = Key.split("/");
    if (!userId || !fileId) throw new Error("Invalid Key");

    const command = new GetObjectCommand({ Bucket, Key });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const res = await fetch(presignedUrl);
    const arrayBuffer = await res.arrayBuffer();

    const parser = new PDFParse({ data: arrayBuffer });
    const result = await parser.getText();
    await parser.destroy();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 150,
    });
    const docs = await splitter.createDocuments([result.text]);

    await paralegalVectorDbClient.deleteFileChunks(userId, fileId); // for idempotency
    await paralegalVectorDbClient.addChunksToParalegal(docs, userId, fileId);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};
