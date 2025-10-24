import type { S3Event, SQSEvent } from "aws-lambda";
import { s3 } from "../../clients/aws";
import weaviateClient from "../../clients/weaviate";
import { PDFParse } from "pdf-parse";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const handler = async (event: SQSEvent) => {
  try {
    const s3Event: S3Event = JSON.parse(event.Records[0]!.body);
    const s3Record = s3Event.Records[0]!.s3;
    const Bucket = s3Record.bucket.name;
    const Key = s3Record.object.key;

    const command = new GetObjectCommand({ Bucket, Key });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const res = await fetch(presignedUrl);
    const arrayBuffer = await res.arrayBuffer();

    const parser = new PDFParse({ data: arrayBuffer });
    const result = await parser.getText();
    await parser.destroy();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const docs = await splitter.createDocuments([result.text]);
    const paralegal = weaviateClient.collections.use("paralegal");
    await Promise.all(
      docs.map((doc, i) =>
        paralegal.data.insert({
          properties: {
            text: doc.pageContent,
            chunk_index: i,
            source: Key,
          },
        })
      )
    );
  } catch (error: any) {
    console.error(error);
  }
};
