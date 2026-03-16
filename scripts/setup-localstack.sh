#!/bin/bash
set -euo pipefail

echo "🧹 Tearing down existing containers..."
docker stop $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

echo "📦 Starting all services..."
docker-compose up -d

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
until docker exec -it $(docker ps -q --filter ancestor=redis:alpine) redis-cli ping | grep -q "PONG"; do
  sleep 2
  echo "⌛ Still waiting for Redis to be ready..."
done

# Wait for DynamoDB Admin
until curl -s http://localhost:8001 >/dev/null 2>&1; do
  sleep 2
  echo "⌛ Still waiting for DynamoDB Admin to be ready..."
done

echo "✅ Services are ready!"

# Set AWS CLI env vars for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-south-1
export AWS_ENDPOINT=http://localhost:4566

echo "🚀 Provisioning AWS resources..."

cd ..
bun run build
cd ./infra
terraform init
terraform workspace select local || terraform workspace new local
terraform apply -auto-approve