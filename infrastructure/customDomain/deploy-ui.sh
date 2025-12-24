#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$SCRIPT_DIR/../../ui"
REGION="us-east-1"
STACK_NAME="game-checker-custom-domain-dev"

echo "🏗️  Building Angular UI..."
cd "$UI_DIR"
npm run build -- --configuration production

echo ""
echo "📦 Getting S3 bucket name from CloudFormation..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`UiBucketName`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Error: Could not find S3 bucket name in stack outputs"
  exit 1
fi

echo "📤 Uploading to S3 bucket: $BUCKET_NAME"
aws s3 sync "$UI_DIR/dist/ui/browser" "s3://$BUCKET_NAME" --delete

echo ""
echo "🔄 Getting CloudFront distribution ID..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "♻️  Creating CloudFront invalidation..."
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*"
  echo "✅ Invalidation created"
fi

echo ""
echo "✅ UI deployment complete!"
echo "🌐 Your UI is available at: https://doiownthatgame.com"
