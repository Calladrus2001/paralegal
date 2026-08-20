#!/bin/bash
set -euo pipefail

echo "🧹 Tearing down existing containers..."
docker stop $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Determine if we should start dev tools (skip if CI is true)
IS_CI=${CI:-false}

if [ "$IS_CI" = "true" ]; then
  export LOCALSTACK_HOST="aws.paralegal.vishesh-dugar.me"
fi

echo "📦 Starting infrastructure services..."
if [ "$IS_CI" = "true" ]; then
  # Production/CI mode: No UI tools
  docker compose up -d localstack weaviate redis
else
  # Local dev mode: Include UI tools
  docker compose --profile dev up -d localstack weaviate redis dynamodb-admin redisinsight
fi

echo "⏳ Waiting for services to become available..."

# Wait for LocalStack
until docker logs localstack 2>&1 | grep -q "Ready."; do
  sleep 2
  echo "⌛ Still waiting for LocalStack to be ready..."
done

# Wait for Weaviate
until curl -sSf http://localhost:8080/v1/.well-known/ready >/dev/null 2>&1; do
  sleep 2
  echo "⌛ Still waiting for Weaviate to be ready..."
done

# Wait for Redis
until docker exec redis redis-cli ping 2>/dev/null | grep -q "PONG"; do
  sleep 2
  echo "⌛ Still waiting for Redis to be ready..."
done

if [ "$IS_CI" != "true" ]; then
  # Wait for DynamoDB Admin
  until curl -s http://localhost:8001 >/dev/null 2>&1; do
    sleep 2
    echo "⌛ Still waiting for DynamoDB Admin to be ready..."
  done

  # Wait for RedisInsight
  until curl -s http://localhost:5540 >/dev/null 2>&1; do
    sleep 2
    echo "⌛ Still waiting for RedisInsight to be ready..."
  done
fi

echo "✅ Services are ready!"

# Set AWS CLI env vars for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1
export AWS_ENDPOINT=http://localhost:4566

echo "🚀 Provisioning AWS resources..."

# Get absolute path to the infra directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
# Ensure dependencies are installed for build
bun install
bun run build

cd "$PROJECT_ROOT/infra/app"
terraform init -input=false
terraform workspace select local || terraform workspace new local
terraform apply -auto-approve -input=false -var="openai_api_key=${OPENAI_API_KEY:-}"