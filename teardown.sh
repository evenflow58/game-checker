#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}=== Game Checker Infrastructure Teardown ===${NC}\n"

# Function to print colored messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set AWS configuration for LocalStack
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_PAGER=""
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"

# Check if LocalStack is running
info "Checking if LocalStack is running..."
if ! curl -s --max-time 5 "${LOCALSTACK_ENDPOINT}/_localstack/health" > /dev/null 2>&1; then
    warn "LocalStack is not reachable at ${LOCALSTACK_ENDPOINT}"
    echo "If LocalStack is not running, there's nothing to tear down."
    exit 0
fi
info "✓ LocalStack is running at ${LOCALSTACK_ENDPOINT}"
echo ""

# Confirm deletion
read -p "Are you sure you want to delete ALL resources in LocalStack? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    info "Teardown cancelled."
    exit 0
fi

echo ""
info "Starting teardown..."
echo ""

# Delete API Gateway
info "Deleting API Gateways..."
API_NAME="GameCheckerAPI"

# Get all APIs and delete the one matching our name
API_IDS=$(aws apigatewayv2 get-apis \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    --query "Items[?Name=='${API_NAME}'].ApiId" \
    --output text \
    --no-cli-pager 2>/dev/null || echo "")

if [ -n "${API_IDS}" ] && [ "${API_IDS}" != "None" ]; then
    for API_ID in ${API_IDS}; do
        info "  Deleting API: ${API_ID}"
        aws apigatewayv2 delete-api \
            --api-id "${API_ID}" \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager 2>/dev/null || warn "  Failed to delete API ${API_ID}"
    done
    info "✓ API Gateway(s) deleted"
else
    info "  No API Gateways found"
fi

echo ""

# Delete DynamoDB table
info "Deleting DynamoDB tables..."
TABLE_NAME="GameCheckerTable"

# Check if table exists
TABLE_EXISTS=$(aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    --no-cli-pager 2>/dev/null || echo "")

if [ -n "${TABLE_EXISTS}" ]; then
    info "  Deleting table: ${TABLE_NAME}"
    aws dynamodb delete-table \
        --table-name "${TABLE_NAME}" \
        --endpoint-url "${LOCALSTACK_ENDPOINT}" \
        --region "${AWS_DEFAULT_REGION}" \
        --no-cli-pager 2>/dev/null || warn "  Failed to delete table ${TABLE_NAME}"
    info "✓ DynamoDB table deleted"
else
    info "  No DynamoDB table found"
fi

echo ""

# Delete CloudFormation stacks (if any exist)
info "Checking for CloudFormation stacks..."
STACKS=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    --query 'StackSummaries[*].StackName' \
    --output text \
    --no-cli-pager 2>/dev/null || echo "")

if [ -n "${STACKS}" ] && [ "${STACKS}" != "None" ]; then
    for STACK in ${STACKS}; do
        info "  Deleting CloudFormation stack: ${STACK}"
        aws cloudformation delete-stack \
            --stack-name "${STACK}" \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager 2>/dev/null || warn "  Failed to delete stack ${STACK}"
    done
    info "✓ CloudFormation stacks deleted"
else
    info "  No CloudFormation stacks found"
fi

echo ""

# Delete Lambda functions (if any exist)
info "Checking for Lambda functions..."
FUNCTIONS=$(aws lambda list-functions \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    --query 'Functions[*].FunctionName' \
    --output text \
    --no-cli-pager 2>/dev/null || echo "")

if [ -n "${FUNCTIONS}" ] && [ "${FUNCTIONS}" != "None" ]; then
    for FUNCTION in ${FUNCTIONS}; do
        info "  Deleting Lambda function: ${FUNCTION}"
        aws lambda delete-function \
            --function-name "${FUNCTION}" \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager 2>/dev/null || warn "  Failed to delete function ${FUNCTION}"
    done
    info "✓ Lambda functions deleted"
else
    info "  No Lambda functions found"
fi

echo ""

# Delete S3 buckets (if any exist)
info "Checking for S3 buckets..."
BUCKETS=$(aws s3api list-buckets \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    --query 'Buckets[*].Name' \
    --output text \
    --no-cli-pager 2>/dev/null || echo "")

if [ -n "${BUCKETS}" ] && [ "${BUCKETS}" != "None" ]; then
    for BUCKET in ${BUCKETS}; do
        info "  Emptying and deleting S3 bucket: ${BUCKET}"
        # Empty bucket first
        aws s3 rm "s3://${BUCKET}" --recursive \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager 2>/dev/null || true
        # Delete bucket
        aws s3api delete-bucket \
            --bucket "${BUCKET}" \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager 2>/dev/null || warn "  Failed to delete bucket ${BUCKET}"
    done
    info "✓ S3 buckets deleted"
else
    info "  No S3 buckets found"
fi

echo ""
info "=== Teardown Complete ==="
info "All Game Checker resources have been removed from LocalStack"
echo ""
info "To redeploy, run: ./deploy-all.sh"
echo ""
