#!/bin/bash
set -euo pipefail

# Config
S3_BUCKET="local-paralegal-bucket"
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
fi

# Print each message nicely
echo "$RESPONSE" | jq -c '.Messages[]' | while read -r msg; do
  MESSAGE_ID=$(echo "$msg" | jq -r '.MessageId')
  BODY=$(echo "$msg" | jq -r '.Body')

  echo -e "\n📝 Message ID: $MESSAGE_ID"
  echo "📨 Body:"
  echo "$BODY" | jq .
done

# Get all queue URLs, default to empty array if none exist
QUEUES_JSON=$(aws --endpoint-url=$AWS_ENDPOINT sqs list-queues --output json || echo '{"QueueUrls":[]}')
# Parse and filter URLs containing "dlq" (case insensitive)
DLQ_URLS=$(echo "$QUEUES_JSON" | jq -r '.QueueUrls[]? | select(ascii_downcase | contains("dlq"))' || echo "")

if [[ -z "$DLQ_URLS" ]]; then
  echo -e "\n✅ No DLQs found in LocalStack."
else
  for DLQ_URL in $DLQ_URLS; do
    DLQ_NAME="${DLQ_URL##*/}"
    echo -e "\n🔍 Fetching messages from DLQ $DLQ_NAME..."

    DLQ_RESPONSE=$(aws --endpoint-url=$AWS_ENDPOINT sqs receive-message \
      --queue-url "$DLQ_URL" \
      --max-number-of-messages 10 \
      --visibility-timeout 0 \
      --wait-time-seconds 1 \
      --output json)

    NUM_DLQ_MESSAGES=$(echo "$DLQ_RESPONSE" | jq '.Messages | length')
    if [[ "$NUM_DLQ_MESSAGES" -eq 0 ]]; then
      echo "✅ No messages in DLQ $DLQ_NAME."
    else
      echo "$DLQ_RESPONSE" | jq -c '.Messages[]' | while read -r msg; do
        MESSAGE_ID=$(echo "$msg" | jq -r '.MessageId')
        BODY=$(echo "$msg" | jq -r '.Body')

        echo -e "\n⚠️ [DLQ: $DLQ_NAME] Message ID: $MESSAGE_ID"
        echo "📨 Body:"
        echo "$BODY" | jq .
      done
    fi
  done
fi

echo -e "\nListing S3 objects in bucket $S3_BUCKET..."

if ! aws --endpoint-url=$AWS_ENDPOINT s3 ls "s3://$S3_BUCKET" --recursive 2>/dev/null; then
  echo "⚠️ Bucket '$S3_BUCKET' not found or empty."
else
  aws --endpoint-url=$AWS_ENDPOINT s3api list-objects-v2 \
    --bucket "$S3_BUCKET" \
    --query 'Contents[].{Key: Key, Size: Size}' \
    --output json | jq .
fi

