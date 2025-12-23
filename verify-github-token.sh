#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

SECRET_ARN="${1:-arn:aws:secretsmanager:us-east-1:625961017727:secret:Github-bXV4Bs}"
REGION="${2:-us-east-1}"

echo -e "${BLUE}=== GitHub Token Verification ===${NC}\n"

info "Retrieving secret from AWS Secrets Manager..."
SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --region "$REGION" \
    --query SecretString \
    --output text)

# Extract token and owner
TOKEN=$(echo "$SECRET_JSON" | jq -r '.token')
OWNER=$(echo "$SECRET_JSON" | jq -r '.owner')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    error "Failed to extract token from secret"
    exit 1
fi

if [ -z "$OWNER" ] || [ "$OWNER" = "null" ]; then
    error "Failed to extract owner from secret"
    exit 1
fi

info "Owner: $OWNER"
info "Token: ${TOKEN:0:10}..."

# Test GitHub API access
info "Testing GitHub API access..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    USERNAME=$(echo "$BODY" | jq -r '.login')
    info "✓ Token is valid. Authenticated as: $USERNAME"
else
    error "✗ Token authentication failed. HTTP $HTTP_CODE"
    echo "$BODY" | jq .
    exit 1
fi

# Check token scopes
info "Checking token scopes..."
SCOPES=$(curl -s -I \
    -H "Authorization: token $TOKEN" \
    https://api.github.com/user | grep -i "x-oauth-scopes:" | cut -d' ' -f2- | tr -d '\r')

echo "  Scopes: $SCOPES"

if echo "$SCOPES" | grep -q "repo"; then
    info "✓ Has 'repo' scope"
else
    error "✗ Missing 'repo' scope"
fi

if echo "$SCOPES" | grep -q "admin:repo_hook"; then
    info "✓ Has 'admin:repo_hook' scope"
else
    error "✗ Missing 'admin:repo_hook' scope (required for webhooks)"
fi

# Test repository access
REPO="${3:-game-checker}"
info "Testing access to repository: $OWNER/$REPO..."

REPO_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$OWNER/$REPO)

REPO_HTTP_CODE=$(echo "$REPO_RESPONSE" | tail -n1)
REPO_BODY=$(echo "$REPO_RESPONSE" | sed '$d')

if [ "$REPO_HTTP_CODE" = "200" ]; then
    REPO_NAME=$(echo "$REPO_BODY" | jq -r '.full_name')
    REPO_PERMS=$(echo "$REPO_BODY" | jq -r '.permissions')
    info "✓ Repository found: $REPO_NAME"
    echo "  Permissions:"
    echo "$REPO_PERMS" | jq .
else
    error "✗ Repository not found or no access. HTTP $REPO_HTTP_CODE"
    echo "$REPO_BODY" | jq .
    exit 1
fi

# Test webhook creation capability
info "Testing webhook permissions..."
HOOKS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$OWNER/$REPO/hooks)

HOOKS_HTTP_CODE=$(echo "$HOOKS_RESPONSE" | tail -n1)
HOOKS_BODY=$(echo "$HOOKS_RESPONSE" | sed '$d')

if [ "$HOOKS_HTTP_CODE" = "200" ]; then
    info "✓ Can access repository webhooks"
    HOOK_COUNT=$(echo "$HOOKS_BODY" | jq 'length')
    echo "  Existing webhooks: $HOOK_COUNT"
else
    error "✗ Cannot access webhooks. HTTP $HOOKS_HTTP_CODE"
    echo "$HOOKS_BODY" | jq .
    exit 1
fi

echo ""
info "All checks passed! Token is properly configured."
