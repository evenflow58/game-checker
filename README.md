# Game Checker CI/CD Pipeline

This pipeline automatically builds, tests, and deploys the Game Checker infrastructure to AWS.

## Overview

The pipeline consists of three stages:

1. **Source** - Pulls code from GitHub repository
2. **Build & Test** - Builds TypeScript, runs tests
3. **Deploy** - Deploys infrastructure to AWS

## Architecture

```
GitHub → CodePipeline → [Build → Test → Deploy] → AWS Infrastructure
```

### Components

- **CodePipeline**: Orchestrates the CI/CD workflow
- **CodeBuild**: Runs build, test, and deploy steps
- **S3**: Stores pipeline artifacts
- **GitHub Webhook**: Triggers pipeline on code push

## Prerequisites

1. **GitHub Personal Access Token in AWS Secrets Manager**
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens
   - Generate token with `repo` and `admin:repo_hook` scopes
   - Store in AWS Secrets Manager as a JSON object with format: `{"token": "your-token", "owner": "your-username"}`
   - Default ARN: `arn:aws:secretsmanager:us-east-1:625961017727:secret:Github-bXV4Bs`

2. **Google OAuth Credentials in AWS Secrets Manager** (optional, for authentication)
   - Get OAuth Client ID and Secret from Google Cloud Console
   - Store in AWS Secrets Manager as a JSON object with format: `{"client_id": "your-id", "secret": "your-secret"}`
   - Default ARN: `arn:aws:secretsmanager:us-east-1:625961017727:secret:GoogleCredentials-bj6epK`
   - Only required if enabling Google OAuth on settings endpoint

3. **AWS Account** with appropriate permissions
   - IAM permissions to create CloudFormation stacks, CodePipeline, CodeBuild, S3, etc.
   - Permissions to read from Secrets Manager

## Deployment

### Quick Start: Using the Deployment Script

The easiest way to deploy the pipeline is using the provided script:

```bash
# Deploy with default settings (dev environment, auth disabled)
./deploy-pipeline.sh

# Deploy to staging with authentication enabled
./deploy-pipeline.sh --environment staging --enable-auth

# Deploy to production
./deploy-pipeline.sh --environment prod --enable-auth --region us-east-1
```

The script will:
- Validate the CloudFormation template
- DeMonitor Deployment

If using manual deployment, monitor with:e stack
- Monitor the deployment progress in real-time
- Display stack outputs and next steps

### Manual Deployment

If you prefer to deploy manually:

```bash
aws cloudformation create-stack \
  --stack-name game-checker-pipeline-dev \
  --template-body file://infrastructure/pipeline/template.yaml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=evanjohnson \
    ParameterKey=GitHubRepo,ParameterValue=game-checker \
    ParameterKey=GitHubBranch,ParameterValue=main \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=EnableAuth,ParameterValue=false \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

**Note:** GitHub token and Google credentials are automatically retrieved from Secrets Manager. No need to pass them as parameters.

```bash
# Watch stack creation
aws cloudformation describe-stacks \
  --stack-name game-checker-pipeline-dev \
  --query 'Stacks[0].StackStatus' \
  --region us-east-1

# Get pipeline URL
aws cloudformation describe-stacks \
  --stack-name game-checker-pipeline-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
  --output text \
  --region us-east-1
```

### Step 3: Trigger Pipeline

The pipeline automatically triggers when you push to the configured branch:

```bash
git add .
git commit -m "Deploy infrastructure"
git push origin main
```

Or manually trigger:

```bash
aws codepipeline start-pipeline-execution \
  --name dev-GameChecker-Pipeline \
  --region us-east-1
```

## Environment-Specific Deployments

./deploy-pipeline.sh --environment dev
```

### Staging
```bash
./deploy-pipeline.sh --environment staging --enable-auth
```

### Production
```bash
./deploy-pipeline.sh --environment prod --enable-auth --region us-east-1
```

### Custom Configuration
```bash
./deploy-pipeline.sh \
  --environment staging \
  --github-owner YOUR_USERNAME \
  --github-repo YOUR_REPO \
  --github-branch develop \
  --region us-west-2 \
  --enable-auth
  ParameterKey=EnableAuth,ParameterValue=true \
  ParameterKey=GoogleClientId,ParameterValue=YOUR_CLIENT_ID
```

## Pipeline Stages

### 1. Source Stage
- Pulls latest code from GitHub
- Triggered by webhook on push to branch

### 2. Build Stage
Uses `buildspec-build.yaml`:
- Installs dependencies for all packages
- Compiles TypeScript to JavaScript
- Caches node_modules for faster builds

### 3. Test Stage
Uses `buildspec-test.yaml`:
- Runs unit tests (if present)
- Retrieves Google OAuth credentials from Secrets Manager (if auth enabled)
- Validates code quality
- Fails pipeline if tests fail

### 4. Deploy Stage
Uses `buildspec-deploy.yaml`:
- Deploys DynamoDB table
- Deploys API Gateway
- Deploys Lambda functions (Health Check, Settings)
- Creates routes and integrations
- Outputs deployed endpoints

## Deployed Resources

After successful deployment, the following resources are created:

- **DynamoDB Table**: `{Environment}-GameCheckerTable`
- **API Gateway**: `{Environment}-GameCheckerAPI`
- **Lambda Functions**:
  - `{Environment}-HealthCheck`
  - `{Environment}-SettingsGet`
- **Routes**:
  - `GET /health`
  - `GET /v1/settings`

## Accessing Deployed API

Get the API endpoint:

```bash
# Get API ID
API_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='dev-GameCheckerAPI'].ApiId" \
  --output text \
  --region us-east-1)

# API Base URL
echo "https://${API_ID}.execute-api.us-east-1.amazonaws.com"
```

Test endpoints:

```bash
# Health check
curl https://${API_ID}.execute-api.us-east-1.amazonaws.com/health

# Settings (without auth)
curl https://${API_ID}.execute-api.us-east-1.amazonaws.com/v1/settings

# Settings (with Google OAuth)
curl -H "Authorization: Bearer YOUR_GOOGLE_ID_TOKEN" \
  https://${API_ID}.execute-api.us-east-1.amazonaws.com/v1/settings
```

## Monitoring

### View Pipeline Execution

```bash
aws codepipeline get-pipeline-state \
  --name dev-GameChecker-Pipeline \
  --region us-east-1
```

### View Build Logs

```bash
# List builds
aws codebuild list-builds-for-project \
  --project-name dev-GameChecker-Build \
  --region us-east-1

# Get build logs
aws codebuild batch-get-builds \
  --ids <build-id> \
  --region us-east-1
```

### CloudWatch Logs

Build logs are automatically sent to CloudWatch Logs:
- `/aws/codebuild/dev-GameChecker-Build`
- `/aws/codebuild/dev-GameChecker-Test`
- `/aws/codebuild/dev-GameChecker-Deploy`

## Cleanup

To delete the pipeline and all resources:

```bash
# Delete the pipeline stack
aws cloudformation delete-stack \
  --stack-name game-checker-pipeline-dev \
  --region us-east-1

# Empty and delete artifact bucket (if needed)
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name game-checker-pipeline-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ArtifactBucketName`].OutputValue' \
  --output text \
  --region us-east-1)

aws s3 rm s3://${BUCKET} --recursive
```

## Troubleshooting

### Pipeline Fails at Source Stage
- Verify GitHub token has correct permissions
- Check webhook is registered in GitHub repo settings

### Build Stage Fails
- Check CodeBuild logs in CloudWatch
- Verify package.json files are present
- Check TypeScript compilation errors

### Deploy Stage Fails
- Verify IAM permissions for CodeBuild role
- Che✅ GitHub token stored in AWS Secrets Manager
   - ✅ Google OAuth credentials stored in AWS Secrets Manager
   - Rotate tokens regularly
   - Use IAM roles instead of access keys
   - Never commit secrets to version control

2. **IAM Permissions**
   - Follow principle of least privilege
   - Pipeline has access only to required secrets
   - Use separate roles for build and deploy
   - Enable CloudTrail for audit logs

3. **Network Security**
   - Use VPC for CodeBuild if accessing private resources
   - Enable VPC endpoints for AWS services
   - Use security groups and NACLs

## Secrets Manager Configuration

The pipeline expects secrets in the following format:

### GitHub Token Secret
```json
{
  "token": "ghp_your_github_token_here",
  "owner": "your-github-username"
}
```

### Google OAuth Credentials Secret
```json
{
  "client_id": "your-client-id.apps.googleusercontent.com",
  "secret": "your-oauth-client-secret"
}
```

To update secrets:
```bash
# Update GitHub token
aws secretsmanager update-secret \
  --secret-id Github-bXV4Bs \
  --secret-string '{"token":"new-token","owner":"username"}' \
  --region us-east-1

# Update Google credentials
aws secretsmanager update-secret \
  --secret-id GoogleCredentials-bj6epK \
  --secret-string '{"client_id":"new-id","secret":"new-secret"}' \
  --region us-east-1
```and deploy
   - Enable CloudTrail for audit logs

3. **Network Security**
   - Use VPC for CodeBuild if accessing private resources
   - Enable VPC endpoints for AWS services
   - Use security groups and NACLs

## Cost Optimization

- Build artifacts expire after 30 days
- Use S3 caching for node_modules
- Use smaller CodeBuild instance types when possible
- Delete unused pipelines and resources

## Next Steps

1. Add integration tests
2. Implement blue/green deployments
3. Add manual approval step for production
4. Configure SNS notifications for pipeline events
5. Add canary deployments for Lambda functions
