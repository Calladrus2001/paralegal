import { Router } from "express";
import { validateBodyMiddleware } from "../middleware/validateBodyMiddleware";
import { nanoid } from "nanoid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../clients/aws";
import { presignMetadataSchema } from "../types/upload";

const router = Router();

router.post("/", validateBodyMiddleware(presignMetadataSchema), async (req, res) => {
  const metadata = req.body;
  const bucket = process.env.S3_BUCKET_NAME;

  const userId = metadata.userId;
  const fileId = nanoid();
  const key = `${userId}/${fileId}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Metadata: {
      userId: metadata.userId,
      caseId: metadata.caseId,
    },
  });
  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
    res.json({ url, fileId });
  } catch (err) {
    res.status(500).json({
      error: "Failed to generate presigned URL",
      details: err instanceof Error ? err.message : err,
    });
  }
});

export default router;
