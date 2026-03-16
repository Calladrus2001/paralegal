import { S3 } from "@aws-sdk/client-s3";
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