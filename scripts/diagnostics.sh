#!/bin/bash
set -euo pipefail

# Config
QUEUE_NAME="local-paralegal-upload-queue"
AWS_ENDPOINT="http://localhost:4566"
REGION="ap-south-1"

# Set AWS CLI env vars for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$REGION

# Get Queue URL
QUEUE_URL=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-url \
  --queue-name "$QUEUE_NAME" \
  --query 'QueueUrl' --output text)

echo "🔍 Fetching messages from $QUEUE_NAME..."

RESPONSE=$(aws --endpoint-url=$AWS_ENDPOINT sqs receive-message \
  --queue-url "$QUEUE_URL" \
  --max-number-of-messages 10 \
  --visibility-timeout 0 \
  --wait-time-seconds 1 \
  --output json)

# Check if any messages were returned
NUM_MESSAGES=$(echo "$RESPONSE" | jq '.Messages | length')
if [[ "$NUM_MESSAGES" -eq 0 ]]; then
  echo "✅ No messages in the queue."
  exit 0
fi

# Print each message nicely
echo "$RESPONSE" | jq -c '.Messages[]' | while read -r msg; do
  MESSAGE_ID=$(echo "$msg" | jq -r '.MessageId')
  BODY=$(echo "$msg" | jq -r '.Body')

  echo -e "\n📝 Message ID: $MESSAGE_ID"
  echo "📨 Body:"
  echo "$BODY" | jq .
done

echo -e "\n🔎 Listing S3 objects in bucket 'local-paralegal-bucket'..."
S3_BUCKET="local-paralegal-bucket"

aws --endpoint-url=$AWS_ENDPOINT s3 ls s3://$S3_BUCKET --recursive || {
  echo "⚠️ Failed to list objects (bucket may not exist yet)"
  exit 0
}

aws --endpoint-url=$AWS_ENDPOINT s3api list-objects-v2 --bucket $S3_BUCKET --query 'Contents[].{Key: Key, Size: Size}' --output json | jq .
