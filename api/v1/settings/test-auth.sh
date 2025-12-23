#!/usr/bin/env bash

# Test script for Google OAuth authenticated Settings endpoint

LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-us-east-1}"
API_NAME="${API_NAME:-GameCheckerAPI}"

# Get the current API ID
API_ID=$(aws apigatewayv2 get-apis \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_REGION}" \
    --query "Items[?Name=='${API_NAME}'].ApiId" \
    --output text)

if [ -z "$API_ID" ]; then
    echo "Error: API '${API_NAME}' not found. Please deploy first."
    exit 1
fi

API_BASE_URL="http://${API_ID}.execute-api.localhost.localstack.cloud:4566"
ENDPOINT="${API_BASE_URL}/v1/settings"

echo "=== Testing Settings Endpoint with Google OAuth ==="
echo ""
echo "Endpoint: ${ENDPOINT}"
echo ""

# Test 1: Without authentication
echo "Test 1: Request without authentication"
echo "curl ${ENDPOINT}"
echo ""
curl -s "${ENDPOINT}" | jq '.'
echo ""
echo ""

# Test 2: With mock JWT token (for LocalStack)
echo "Test 2: Request with Authorization header (LocalStack doesn't validate)"
echo "curl -H 'Authorization: Bearer mock-token' ${ENDPOINT}"
echo ""
curl -s -H "Authorization: Bearer mock-token" "${ENDPOINT}" | jq '.'
echo ""
echo ""

# Test 3: With query parameter
echo "Test 3: Request with userId query parameter"
echo "curl '${ENDPOINT}?userId=test-user-123'"
echo ""
curl -s "${ENDPOINT}?userId=test-user-123" | jq '.'
echo ""
echo ""

echo "=== Testing Complete ==="
echo ""
echo "Note: For production testing with real Google OAuth tokens:"
echo "1. Get a Google ID token from OAuth 2.0 Playground or gcloud CLI"
echo "2. Deploy to real AWS API Gateway (not LocalStack)"
echo "3. Make request: curl -H 'Authorization: Bearer \$ID_TOKEN' \$ENDPOINT"
echo ""
echo "See api/v1/settings/README.md for detailed instructions"
