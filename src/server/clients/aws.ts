import { S3 } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isLocal = process.env.env === "local";

const awsConfig = (() => {
  if (isLocal) {
    return {
      region: "ap-south-1",
      endpoint: process.env.AWS_DEFAULT_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };
  } else {
    return {
      region: "ap-south-1",
    };
  }
})();

export const s3 = new S3({
  ...awsConfig,
  forcePathStyle: isLocal,
});

const dynamoClient = new DynamoDBClient(awsConfig);
export const dynamo = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const CHATS_TABLE = process.env.DYNAMODB_CHATS_TABLE!;
export const MESSAGES_TABLE = process.env.DYNAMODB_MESSAGES_TABLE!;
export const FEEDBACKS_TABLE = process.env.DYNAMODB_FEEDBACKS_TABLE!;
export const STATS_TABLE = process.env.DYNAMODB_CHUNK_STATS_TABLE!;
export const CHUNK_ATTRIBUTIONS_TABLE = process.env.DYNAMODB_CHUNK_ATTRIBUTIONS_TABLE!;
export const FILES_TABLE = process.env.DYNAMODB_FILES_TABLE!;

export const sqsClient = new SQSClient(awsConfig);
export const ATTRIBUTION_QUEUE_URL = process.env.SQS_ATTRIBUTION_QUEUE_URL!;
export const SCORING_QUEUE_URL = process.env.SQS_SCORING_QUEUE_URL!;