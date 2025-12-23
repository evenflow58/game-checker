#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Default values
STACK_NAME="game-checker-pipeline-dev"
GITHUB_OWNER="${GITHUB_OWNER:-evenflow58}"
GITHUB_REPO="${GITHUB_REPO:-game-checker}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENABLE_AUTH="${ENABLE_AUTH:-false}"

echo -e "${BLUE}=== Game Checker Pipeline Deployment ===${NC}\n"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            STACK_NAME="game-checker-pipeline-${ENVIRONMENT}"
            shift 2
            ;;
        --github-owner)
            GITHUB_OWNER="$2"
            shift 2
            ;;
        --github-repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        --github-branch)
            GITHUB_BRANCH="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --enable-auth)
            ENABLE_AUTH="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment ENV        Environment name (dev, staging, prod). Default: dev"
            echo "  --github-owner OWNER     GitHub repository owner. Default: evanjohnson"
            echo "  --github-repo REPO       GitHub repository name. Default: game-checker"
            echo "  --github-branch BRANCH   GitHub branch. Default: main"
            echo "  --region REGION          AWS region. Default: us-east-1"
            echo "  --enable-auth            Enable Google OAuth authentication"
            echo "  --help                   Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, ENVIRONMENT, AWS_REGION"
            echo ""
            echo "Note: GitHub token and Google credentials are retrieved from AWS Secrets Manager."
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Display configuration
info "Configuration:"
echo "  Stack Name:      ${STACK_NAME}"
echo "  Environment:     ${ENVIRONMENT}"
echo "  GitHub Owner:    ${GITHUB_OWNER}"
echo "  GitHub Repo:     ${GITHUB_REPO}"
echo "  GitHub Branch:   ${GITHUB_BRANCH}"
echo "  AWS Region:      ${AWS_REGION}"
echo "  Enable Auth:     ${ENABLE_AUTH}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if template file exists
TEMPLATE_PATH="infrastructure/pipeline/template.yaml"
if [ ! -f "$TEMPLATE_PATH" ]; then
    error "Template file not found: $TEMPLATE_PATH"
    exit 1
fi

info "Validating CloudFormation template..."
if aws cloudformation validate-template \
    --template-body file://$TEMPLATE_PATH \
    --region $AWS_REGION > /dev/null 2>&1; then
    info "✓ Template is valid"
else
    error "Template validation failed"
    exit 1
fi

# Check if stack already exists
if aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION &> /dev/null; then
    warn "Stack '${STACK_NAME}' already exists"
    read -p "Do you want to update it? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        info "Deployment cancelled"
        exit 0
    fi
    OPERATION="update"
else
    OPERATION="create"
fi

# Build parameters array
PARAMETERS=(
    "ParameterKey=GitHubOwner,ParameterValue=${GITHUB_OWNER}"
    "ParameterKey=GitHubRepo,ParameterValue=${GITHUB_REPO}"
    "ParameterKey=GitHubBranch,ParameterValue=${GITHUB_BRANCH}"
    "ParameterKey=Environment,ParameterValue=${ENVIRONMENT}"
    "ParameterKey=EnableAuth,ParameterValue=${ENABLE_AUTH}"
)

# Deploy stack
info "Deploying CloudFormation stack..."

if [ "$OPERATION" = "create" ]; then
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_PATH \
        --parameters "${PARAMETERS[@]}" \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION
else
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_PATH \
        --parameters "${PARAMETERS[@]}" \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION || {
            if [[ $? -eq 254 ]]; then
                warn "No updates to be performed"
                exit 0
            else
                error "Stack update failed"
                exit 1
            fi
        }
fi

info "Stack ${OPERATION} initiated..."
echo ""

# Monitor stack creation/update
info "Monitoring stack ${OPERATION}..."
LAST_STATUS=""
START_TIME=$(date +%s)

while true; do
    # Get current stack status
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "UNKNOWN")
    
    # Print status if it changed
    if [ "$STACK_STATUS" != "$LAST_STATUS" ]; then
        ELAPSED=$(($(date +%s) - START_TIME))
        case $STACK_STATUS in
            *IN_PROGRESS)
                info "[${ELAPSED}s] Status: ${STACK_STATUS}"
                ;;
            *COMPLETE)
                info "[${ELAPSED}s] Status: ${STACK_STATUS}"
                break
                ;;
            *FAILED|*ROLLBACK*)
                error "[${ELAPSED}s] Status: ${STACK_STATUS}"
                echo ""
                error "Stack ${OPERATION} failed. Recent events:"
                aws cloudformation describe-stack-events \
                    --stack-name $STACK_NAME \
                    --region $AWS_REGION \
                    --max-items 5 \
                    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[ResourceType,LogicalResourceId,ResourceStatusReason]' \
                    --output table
                exit 1
                ;;
            *)
                warn "[${ELAPSED}s] Status: ${STACK_STATUS}"
                ;;
        esac
        LAST_STATUS=$STACK_STATUS
    fi
    
    # Check if we should continue monitoring
    if [[ "$STACK_STATUS" == *COMPLETE || "$STACK_STATUS" == *FAILED || "$STACK_STATUS" == *ROLLBACK* ]]; then
        break
    fi
    
    sleep 5
done

echo ""
info "✓ Stack ${OPERATION} completed successfully!"
echo ""

# Get stack outputs
info "=== Stack Outputs ==="
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[].[OutputKey,OutputValue,Description]' \
    --output table

echo ""

# Get pipeline URL
PIPELINE_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$PIPELINE_URL" ]; then
    info "Pipeline Console URL:"
    echo "  ${PIPELINE_URL}"
    echo ""
fi

PIPELINE_NAME="${ENVIRONMENT}-GameChecker-Pipeline"

info "Next Steps:"
echo "  1. Push code to trigger pipeline:"
echo "     git push origin ${GITHUB_BRANCH}"
echo ""
echo "  2. Monitor pipeline execution:"
echo "     aws codepipeline get-pipeline-state --name ${PIPELINE_NAME} --region ${AWS_REGION}"
echo ""
echo "  3. View in console:"
echo "     ${PIPELINE_URL}"
echo ""

info "✓ Deployment complete!"
