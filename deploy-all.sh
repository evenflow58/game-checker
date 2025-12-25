#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Game Checker Infrastructure Deployment ===${NC}\n"

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

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Colima is running
info "Checking if Colima is running..."
if ! colima status &>/dev/null; then
    error "Colima is not running!"
    echo "Please start Colima first:"
    echo "  colima start"
    exit 1
fi
info "✓ Colima is running"

# Check if LocalStack is running
info "Checking if LocalStack is running..."
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"

# For Lambda functions running in LocalStack, they need to use host.docker.internal
# to access LocalStack services from within the container
LAMBDA_LOCALSTACK_ENDPOINT="http://host.docker.internal:4566"

if ! curl -s --max-time 5 "${LOCALSTACK_ENDPOINT}/_localstack/health" > /dev/null 2>&1; then
    error "LocalStack is not reachable at ${LOCALSTACK_ENDPOINT}"
    echo "Please start LocalStack first:"
    echo "  localstack start -d"
    echo "Or if using Docker Compose:"
    echo "  docker-compose up -d localstack"
    exit 1
fi
info "✓ LocalStack is running at ${LOCALSTACK_ENDPOINT}"

# Verify AWS CLI is installed
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Verify SAM CLI is installed
if ! command -v sam &> /dev/null; then
    warn "SAM CLI is not installed. Some deployments may fail."
    echo "Install with: brew install aws-sam-cli"
fi

# Set AWS configuration for LocalStack
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_PAGER=""

# Steam API key for local development
export STEAM_API_KEY="${STEAM_API_KEY:-48B96CB7DD72E7BB868F16F16BFA4431}"

info "AWS Region: ${AWS_DEFAULT_REGION}"
info "LocalStack Endpoint: ${LOCALSTACK_ENDPOINT}"
echo ""

# Function to check if a stack exists
stack_exists() {
    local stack_name=$1
    aws cloudformation describe-stacks \
        --stack-name "${stack_name}" \
        --endpoint-url "${LOCALSTACK_ENDPOINT}" \
        --region "${AWS_DEFAULT_REGION}" \
        --no-cli-pager \
        &>/dev/null
    return $?
}

# Function to deploy a CloudFormation stack
deploy_stack() {
    local template_file=$1
    local stack_name=$2
    shift 2
    
    info "Deploying ${stack_name}..."
    
    # Build parameter overrides string
    local param_overrides=""
    if [ $# -gt 0 ]; then
        for param in "$@"; do
            param_overrides="${param_overrides} ${param}"
        done
        
        aws cloudformation deploy \
            --template-file "${template_file}" \
            --stack-name "${stack_name}" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
            --parameter-overrides ${param_overrides} \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager
    else
        aws cloudformation deploy \
            --template-file "${template_file}" \
            --stack-name "${stack_name}" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
            --endpoint-url "${LOCALSTACK_ENDPOINT}" \
            --region "${AWS_DEFAULT_REGION}" \
            --no-cli-pager
    fi
    
    return $?
}

# Deploy database using SDK script
info "Setting up Database..."
DB_TABLE_NAME="GameCheckerTable"

# Build and run the create-table script
(
    cd infrastructure/database
    
    # Only install if node_modules doesn't exist or dist doesn't exist
    if [ ! -d "node_modules" ] || [ ! -d "dist" ]; then
        if [ ! -d "node_modules" ]; then
            info "Installing database dependencies..."
            npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || npm install --ignore-scripts
        fi
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "Database dependencies already installed and built"
    fi
    
    # Run the create table script
    info "Creating DynamoDB table..."
    TABLE_NAME="${DB_TABLE_NAME}" \
    DYNAMODB_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    node dist/create-table.js
)

if [ $? -eq 0 ]; then
    info "✓ Database setup completed successfully"
    info "Database Table: ${DB_TABLE_NAME}"
else
    error "Database setup failed!"
    exit 1
fi

echo ""

# Setup Secrets Manager
info "Setting up Secrets Manager..."
info "Creating/updating API keys secret in LocalStack..."

# Create or update the GameChecker/APIKeys secret with the Steam API key
aws secretsmanager describe-secret \
    --secret-id GameChecker/APIKeys \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    &>/dev/null

if [ $? -eq 0 ]; then
    info "Secret exists, updating..."
    aws secretsmanager update-secret \
        --secret-id GameChecker/APIKeys \
        --secret-string "{\"SteamAPI\":\"${STEAM_API_KEY}\"}" \
        --endpoint-url "${LOCALSTACK_ENDPOINT}" \
        --region "${AWS_DEFAULT_REGION}" \
        &>/dev/null
else
    info "Creating new secret..."
    aws secretsmanager create-secret \
        --name GameChecker/APIKeys \
        --secret-string "{\"SteamAPI\":\"${STEAM_API_KEY}\"}" \
        --endpoint-url "${LOCALSTACK_ENDPOINT}" \
        --region "${AWS_DEFAULT_REGION}" \
        &>/dev/null
fi

if [ $? -eq 0 ]; then
    info "✓ Secrets Manager setup completed successfully"
else
    error "Secrets Manager setup failed!"
    exit 1
fi

echo ""

# Build all Lambda functions before deploying API
info "Building Lambda functions..."

# Find all directories with package.json in infrastructure/ but exclude node_modules
find infrastructure -name "package.json" -type f -not -path "*/node_modules/*" | while read -r pkg_file; do
    pkg_dir=$(dirname "${pkg_file}")
    info "Building ${pkg_dir}..."
    
    (
        cd "${pkg_dir}"
        if [ -f "package.json" ]; then
            npm ci --ignore-scripts --quiet 2>/dev/null || npm install --ignore-scripts --quiet
            
            # Check if there's a build script
            if npm run 2>/dev/null | grep -q "build"; then
                npm run build --quiet
                info "  ✓ Built ${pkg_dir}"
            fi
        fi
    )
done

echo ""

# Deploy API Gateway using SDK script
info "Setting up API Gateway..."

# Build and run the create-api script
(
    cd infrastructure/apiGateway
    
    # Only install if node_modules doesn't exist or dist doesn't exist
    if [ ! -d "node_modules" ] || [ ! -d "dist" ]; then
        if [ ! -d "node_modules" ]; then
            info "Installing API Gateway dependencies..."
            npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || npm install --ignore-scripts
        fi
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "API Gateway dependencies already installed and built"
    fi
    
    # Run the create API script
    info "Creating API Gateway..."
    API_NAME="GameCheckerAPI" \
    API_GATEWAY_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    node dist/create-api.js
)

if [ $? -eq 0 ]; then
    info "✓ API Gateway setup completed successfully"
else
    error "API Gateway setup failed!"
    exit 1
fi

echo ""

# Deploy Health Check Lambda
info "Deploying Health Check Lambda..."

(
    cd api/health
    
    # Only install if node_modules doesn't exist or dist doesn't exist
    if [ ! -d "node_modules" ] || [ ! -d "dist" ]; then
        if [ ! -d "node_modules" ]; then
            info "Installing Health Check dependencies..."
            npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || npm install --ignore-scripts
        fi
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "Health Check dependencies already installed and built"
    fi
    
    # Run the deployment script
    info "Deploying Health Check endpoint..."
    FUNCTION_NAME="HealthCheck" \
    API_NAME="GameCheckerAPI" \
    API_GATEWAY_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    node dist/deploy.js
)

if [ $? -eq 0 ]; then
    info "✓ Health Check deployment completed successfully"
else
    error "Health Check deployment failed!"
    exit 1
fi

echo ""

# Deploy Settings GET endpoint
info "=== Deploying Settings GET Endpoint ==="
(
    cd "${SCRIPT_DIR}/api/v1/settings/get" || exit 1
    
    # Check if node_modules exists and package.json is newer
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        info "Installing dependencies for Settings GET..."
        npm install
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "Settings GET dependencies already installed and built"
    fi
    
    # Run the deployment script
    info "Deploying Settings GET endpoint..."
    FUNCTION_NAME="SettingsGet" \
    API_NAME="GameCheckerAPI" \
    API_GATEWAY_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    ENABLE_AUTH="false" \
    TABLE_NAME="${DB_TABLE_NAME}" \
    DYNAMODB_ENDPOINT="${LAMBDA_LOCALSTACK_ENDPOINT}" \
    node dist/deploy.js
)

if [ $? -eq 0 ]; then
    info "✓ Settings GET deployment completed successfully"
else
    error "Settings GET deployment failed!"
    exit 1
fi

echo ""

# Deploy User POST endpoint (user creation)
info "=== Deploying User POST Endpoint (User Creation) ==="
(
    cd "${SCRIPT_DIR}/api/v1/user/post" || exit 1
    
    # Check if node_modules exists and package.json is newer
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        info "Installing dependencies for User POST..."
        npm install
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "User POST dependencies already installed and built"
    fi
    
    # Run the deployment script
    info "Deploying User POST endpoint..."
    FUNCTION_NAME="UserPost" \
    API_NAME="GameCheckerAPI" \
    API_GATEWAY_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    ENABLE_AUTH="false" \
    TABLE_NAME="${DB_TABLE_NAME}" \
    DYNAMODB_ENDPOINT="${LAMBDA_LOCALSTACK_ENDPOINT}" \
    node dist/deploy.js
)

if [ $? -eq 0 ]; then
    info "✓ User POST deployment completed successfully"
else
    error "User POST deployment failed!"
    exit 1
fi

echo ""

# Deploy Settings PUT endpoint
info "=== Deploying Settings PUT Endpoint ==="
(
    cd "${SCRIPT_DIR}/api/v1/settings/put" || exit 1
    
    # Check if node_modules exists and package.json is newer
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        info "Installing dependencies for Settings PUT..."
        npm install
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "Settings PUT dependencies already installed and built"
    fi
    
    # Run the deployment script
    info "Deploying Settings PUT endpoint..."
    FUNCTION_NAME="SettingsPut" \
    API_NAME="GameCheckerAPI" \
    API_GATEWAY_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    ENABLE_AUTH="false" \
    TABLE_NAME="${DB_TABLE_NAME}" \
    DYNAMODB_ENDPOINT="${LAMBDA_LOCALSTACK_ENDPOINT}" \
    node dist/deploy.js
)

if [ $? -eq 0 ]; then
    info "✓ Settings PUT deployment completed successfully"
else
    error "Settings PUT deployment failed!"
    exit 1
fi

echo ""

# Deploy Games Steam GET endpoint
info "=== Deploying Games Steam GET Endpoint ==="
(
    cd "${SCRIPT_DIR}/api/v1/games/steam/get" || exit 1
    
    # Check if node_modules exists and package.json is newer
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        info "Installing dependencies for Games Steam GET..."
        npm install
        
        # Build TypeScript if needed
        if [ -f "tsconfig.json" ] && [ ! -d "dist" ]; then
            info "Compiling TypeScript..."
            npx tsc
        fi
    else
        info "Games Steam GET dependencies already installed and built"
    fi
    
    # Retrieve Steam API key from LocalStack Secrets Manager
    info "Retrieving Steam API key from Secrets Manager..."
    STEAM_API_KEY=$(aws secretsmanager get-secret-value \
        --secret-id GameChecker/APIKeys \
        --endpoint-url "${LOCALSTACK_ENDPOINT}" \
        --region "${AWS_DEFAULT_REGION}" \
        --query 'SecretString' \
        --output text 2>/dev/null | jq -r '.SteamAPI' 2>/dev/null || echo "")
    
    if [ -z "$STEAM_API_KEY" ]; then
        error "Steam API key not found in Secrets Manager!"
        exit 1
    fi
    
    info "✓ Steam API key retrieved from Secrets Manager"
    
    # Run the deployment script
    info "Deploying Games Steam GET endpoint..."
    FUNCTION_NAME="GamesSteamGet" \
    API_NAME="GameCheckerAPI" \
    API_GATEWAY_ENDPOINT="${LOCALSTACK_ENDPOINT}" \
    AWS_REGION="${AWS_DEFAULT_REGION}" \
    ENABLE_AUTH="false" \
    TABLE_NAME="${DB_TABLE_NAME}" \
    DYNAMODB_ENDPOINT="${LAMBDA_LOCALSTACK_ENDPOINT}" \
    STEAM_API_KEY="${STEAM_API_KEY}" \
    node dist/deploy.js
)

if [ $? -eq 0 ]; then
    info "✓ Games Steam GET deployment completed successfully"
else
    error "Games Steam GET deployment failed!"
    exit 1
fi

echo ""

# Get API Gateway information
info "Fetching API Gateway details..."
API_INFO=$(aws apigatewayv2 get-apis \
    --endpoint-url "${LOCALSTACK_ENDPOINT}" \
    --region "${AWS_DEFAULT_REGION}" \
    --query "Items[?Name=='GameCheckerAPI']|[0]" \
    --output json)

API_ID=$(echo "$API_INFO" | grep -o '"ApiId"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

if [ -n "$API_ID" ]; then
    API_BASE_URL="http://${API_ID}.execute-api.localhost.localstack.cloud:4566"
    
    # Get all routes as JSON
    ROUTES_JSON=$(aws apigatewayv2 get-routes \
        --api-id "${API_ID}" \
        --endpoint-url "${LOCALSTACK_ENDPOINT}" \
        --region "${AWS_DEFAULT_REGION}" \
        --query "Items[].RouteKey" \
        --output json)
fi

# Summary
echo ""
info "=== Deployment Summary ==="
info "Database: ${DB_TABLE_NAME}"
echo ""

if [ -n "$API_ID" ]; then
    info "API Gateway Base URL:"
    echo "  ${API_BASE_URL}"
    echo ""
    info "Available Endpoints:"
    if [ -n "$ROUTES_JSON" ] && [ "$ROUTES_JSON" != "[]" ]; then
        # Parse JSON array and print each route
        echo "$ROUTES_JSON" | grep -o '"[^"]*"' | tr -d '"' | while IFS= read -r route; do
            if [ -n "$route" ]; then
                echo "  ${route} → ${API_BASE_URL}${route#* }"
            fi
        done
    else
        echo "  No routes found"
    fi
else
    warn "Could not retrieve API Gateway information"
fi

echo ""
info "View all stacks:"
echo "  aws cloudformation list-stacks --endpoint-url ${LOCALSTACK_ENDPOINT} --region ${AWS_DEFAULT_REGION}"

echo ""
info "View DynamoDB tables:"
echo "  aws dynamodb list-tables --endpoint-url ${LOCALSTACK_ENDPOINT} --region ${AWS_DEFAULT_REGION}"

echo ""
info "✓ Deployment complete!"