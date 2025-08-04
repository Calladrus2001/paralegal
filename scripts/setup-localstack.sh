#!/bin/bash
set -euo pipefail

echo "🧹 Tearing down existing containers..."
docker stop $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

echo "📦 Starting LocalStack..."
docker-compose up -d localstack

echo "⏳ Waiting for LocalStack to become available..."
until docker logs localstack 2>&1 | grep -q "Ready."; do
  sleep 2
  echo "⌛ Still waiting for LocalStack to be ready..."
done

echo "✅ LocalStack is ready!"

# Set AWS CLI env vars for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1
export AWS_ENDPOINT=http://localhost:4566

echo "🚀 Provisioning AWS resources..."

# Create S3 bucket
aws --endpoint-url=$AWS_ENDPOINT s3api create-bucket \
  --bucket local-paralegal-bucket \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Create SQS queue
QUEUE_URL=$(aws --endpoint-url=$AWS_ENDPOINT sqs create-queue \
  --queue-name local-paralegal-upload-queue \
  --attributes VisibilityTimeout=30,ReceiveMessageWaitTimeSeconds=5 \
  --query 'QueueUrl' --output text)

# Get queue ARN
QUEUE_ARN=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' --output text)

echo "📬 SQS ARN: $QUEUE_ARN"

# Build the policy document to allow S3 to send messages to SQS
POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Allow-S3-SendMessage",
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "sqs:SendMessage",
      "Resource": "$QUEUE_ARN",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::local-paralegal-bucket"
        }
      }
    }
  ]
}
EOF
)
ESCAPED_POLICY=$(echo "$POLICY" | sed 's/"/\\"/g' | tr -d '\n')

# Attach policy to SQS queue
aws --endpoint-url=$AWS_ENDPOINT sqs set-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attributes "Policy=\"$ESCAPED_POLICY\""

# Set S3 → SQS event notification for ObjectCreated:*
aws --endpoint-url=$AWS_ENDPOINT s3api put-bucket-notification-configuration \
  --bucket local-paralegal-bucket \
  --notification-configuration "{
    \"QueueConfigurations\": [
      {
        \"QueueArn\": \"$QUEUE_ARN\",
        \"Events\": [\"s3:ObjectCreated:*\"]
      }
    ]
  }"

echo "🎉 All resources provisioned and S3 notifications configured!"
