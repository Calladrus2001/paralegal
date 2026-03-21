import { handler } from "./index";
import type { SQSEvent } from "aws-lambda";

// Replace these with actual IDs from your local environment (DynamoDB/Weaviate) to test real attribution.
const feedbackId = "tnQDFcsl876-JJF86Aa0w";
const responseId = "n_2AhnYJ4xiza6YfoxMMU"; 
const bucket = "LLM";
const incorrectClaim = "The High Court of Patna and the Government of Bihar suggested a minimum of 3 years of practice";
const createdAt = new Date().toISOString();

const event: SQSEvent = {
  Records: [
    {
      messageId: "1",
      receiptHandle: "rm-1",
      body: JSON.stringify({
        feedbackId,
        responseId,
        bucket,
        incorrectClaim,
        createdAt,
      }),
      attributes: {} as any,
      messageAttributes: {},
      md5OfBody: "",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:ap-south-1:123456789012:test-queue",
      awsRegion: "ap-south-1",
    },
  ],
};

(async () => {
  console.log("Executing Attribution Lambda locally...");
  try {
    // Note: This requires the corresponding MessageRecord to exist in DynamoDB 
    // and chunks to be in Weaviate for a successful attribution.
    await handler(event, {} as any, () => {});
    console.log("Local execution complete.");
  } catch (error) {
    console.error("Local execution failed:", error);
  }
  process.exit(0);
})().catch((error) => {
  console.error("Setup error:", error);
  process.exit(1);
});
