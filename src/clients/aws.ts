import { S3 } from "@aws-sdk/client-s3";

const s3Config = (() => {
  const env = process.env.env;
  if (env === "local") {
    return {
      region: "ap-south-1",
      forcePathStyle: true,
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

export const s3 = new S3(s3Config);