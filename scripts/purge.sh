#!/bin/bash
set -euo pipefail

# Config
S3_BUCKET="local-paralegal-bucket"
QUEUE_NAME="local-paralegal-upload-queue"
DLQ_NAME="local-paralegal-upload-dlq"
AWS_ENDPOINT="http://localhost:4566"
REGION="ap-south-1"

# Set AWS CLI env vars for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$REGION

echo "🗑️ Starting data purge..."

# Clear S3 Bucket
echo "S3: Clearing bucket $S3_BUCKET..."
if aws --endpoint-url=$AWS_ENDPOINT s3 ls "s3://$S3_BUCKET" --recursive >/dev/null 2>&1; then
    aws --endpoint-url=$AWS_ENDPOINT s3 rm "s3://$S3_BUCKET" --recursive
    echo "✅ S3 bucket cleared."
else
    echo "⚠️ S3 bucket '$S3_BUCKET' not found or already empty."
fi

# Purge Main Queue
echo "SQS: Purging queue $QUEUE_NAME..."
QUEUE_URL=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-url --queue-name "$QUEUE_NAME" --query 'QueueUrl' --output text 2>/dev/null || echo "")
if [[ -n "$QUEUE_URL" ]]; then
    aws --endpoint-url=$AWS_ENDPOINT sqs purge-queue --queue-url "$QUEUE_URL"
    echo "✅ Main queue purged."
else
    echo "⚠️ Main queue '$QUEUE_NAME' not found."
fi

# Purge DLQ
echo "SQS: Purging DLQ $DLQ_NAME..."
DLQ_URL=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-url --queue-name "$DLQ_NAME" --query 'QueueUrl' --output text 2>/dev/null || echo "")
if [[ -n "$DLQ_URL" ]]; then
    aws --endpoint-url=$AWS_ENDPOINT sqs purge-queue --queue-url "$DLQ_URL"
    echo "✅ DLQ purged."
else
    echo "⚠️ DLQ '$DLQ_NAME' not found."
fi

echo "✨ Purge complete!"
