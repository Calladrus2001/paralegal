import type { S3Event, SQSEvent, S3EventRecord } from "aws-lambda";

export const testSQSS3Event = (override?: Partial<S3Event>): SQSEvent => {
  return {
    Records: [
      {
        receiptHandle: "12345",
        md5OfBody: "44ef32bdf6358cc1294d992cb9da197c",
        eventSourceARN: "arn:aws:sqs:eu-west-1:000000000000:local-compliance-sqs",
        eventSource: "aws:sqs",
        awsRegion: "eu-west-1",
        messageId: "eb5fdcbd-c2be-7388-b23c-4b3cf8ade7dd",
        attributes: {} as any,
        messageAttributes: {},
        body: JSON.stringify({
          Records: [],
          ...override,
        }),
      },
    ],
  };
};

export const testS3EventRecordS3Object = (
  override?: Partial<S3EventRecord["s3"]["object"]>
): S3EventRecord["s3"]["object"] => {
  return {
    key: "someObjectKey",
    eTag: "cfe1fc03dc17b973f39c1ee2daaca36b",
    sequencer: "0062D93FBBC5981771",
    size: 0,
    versionId: "XRNwdl66YWEq3u5ZXyuTblSL8atlG4ec",
    ...override,
  };
};

export const testS3EventRecordS3 = (
  override?: Partial<S3EventRecord["s3"]>
): S3EventRecord["s3"] => {
  return {
    s3SchemaVersion: "1.0",
    configurationId: "tf-s3-lambda-20220721112341960900000001",
    bucket: {
      name: "local-compliance-monitor-match-attachments",
      arn: "arn:aws:s3:::local-compliance-monitor-match-attachments",
      ownerIdentity: {
        principalId: "A3KUF7RVE93OBP",
      },
    },
    object: testS3EventRecordS3Object({ key: "someObjectKey" }),
    ...override,
  };
};

export const testS3EventRecord = (
  override?: Partial<{ Bucket: string; Key: string; size: number; versionId: string }>
): S3EventRecord => {
  return {
    s3: testS3EventRecordS3({
      bucket: {
        name: override?.Bucket || "local-compliance-monitor-match-attachments",
        arn: `arn:aws:s3:::${
          override?.Bucket || "local-compliance-monitor-match-attachments"
        }`,
        ownerIdentity: {
          principalId: "A3KUF7RVE93OBP",
        },
      },
      object: testS3EventRecordS3Object({
        key: override?.Key || "someObjectKey",
        size: override?.size || 1,
        versionId: override?.versionId || "XRNwdl66YWEq3u5ZXyuTblSL8atlG4ec",
      }),
    }),
    eventName: "ObjectCreated:Put",
    eventSource: "aws:s3",
    eventTime: "2022-07-21T11:59:55.807Z",
    eventVersion: "2.1",
    awsRegion: "eu-west-1",
    userIdentity: {
      principalId: "A3KUF7RVE93OBP",
    },
    requestParameters: {
      sourceIPAddress: "5.63.188.39",
    },
    responseElements: {
      "x-amz-id-2":
        "YdAuvg0xYTOLsMa1jlpX9ZJ4AzlSqSWPhD0T6trS2NmGsRtf6CXWIp9JgIGIJFTHMhGbWu0LhPJFP7AcotdbQcarwtH8F5j3",
      "x-amz-request-id": "X99SDGNGSR70MEXD",
    },
  };
};
