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

cd ../src/infra
terraform init
terraform apply -var="use_localstack=true" -auto-approve