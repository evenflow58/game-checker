#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME="game-checker-custom-domain-dev"
REGION="us-east-1"

echo "🚀 Deploying custom domain infrastructure..."
echo "================================================"

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/template.yaml" \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --no-fail-on-empty-changeset

echo ""
echo "✅ Custom domain infrastructure deployed!"
echo ""

# Get outputs
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table

echo ""
echo "⏳ Note: Certificate validation may take several minutes."
echo "   Check ACM console for validation status."
echo ""
echo "🌐 Once validated, your domains will be:"
echo "   UI:  https://doiownthatgame.com"
echo "   API: https://api.doiownthatgame.com"
