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

1. **GitHub Personal Access Token**
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens
   - Generate token with `repo` and `admin:repo_hook` scopes
   - Save the token securely

2. **Google OAuth Client ID** (optional, for authentication)
   - Required if enabling Google OAuth on settings endpoint
   - Get from Google Cloud Console

3. **AWS Account** with appropriate permissions

## Deployment

### Step 1: Deploy the Pipeline

```bash
cd infrastructure/pipeline

aws cloudformation create-stack \
  --stack-name game-checker-pipeline-dev \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=YOUR_GITHUB_USERNAME \
    ParameterKey=GitHubRepo,ParameterValue=game-checker \
    ParameterKey=GitHubBranch,ParameterValue=main \
    ParameterKey=GitHubToken,ParameterValue=YOUR_GITHUB_TOKEN \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=GoogleClientId,ParameterValue=YOUR_GOOGLE_CLIENT_ID \
    ParameterKey=EnableAuth,ParameterValue=false \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### Step 2: Monitor Deployment

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

### Development
```bash
--parameters \
  ParameterKey=Environment,ParameterValue=dev \
  ParameterKey=EnableAuth,ParameterValue=false
```

### Staging
```bash
--parameters \
  ParameterKey=Environment,ParameterValue=staging \
  ParameterKey=EnableAuth,ParameterValue=true \
  ParameterKey=GoogleClientId,ParameterValue=YOUR_CLIENT_ID
```

### Production
```bash
--parameters \
  ParameterKey=Environment,ParameterValue=prod \
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
- Check AWS service quotas (Lambda, API Gateway)
- Verify environment variables are set correctly

## Security Best Practices

1. **Secrets Management**
   - Store GitHub token in AWS Secrets Manager
   - Rotate tokens regularly
   - Use IAM roles instead of access keys

2. **IAM Permissions**
   - Follow principle of least privilege
   - Use separate roles for build and deploy
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
