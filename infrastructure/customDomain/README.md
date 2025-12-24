# Custom Domain Setup

This directory contains infrastructure for custom domains:
- **UI**: `https://doiownthatgame.com`
- **API**: `https://api.doiownthatgame.com`

## Architecture

- **API**: API Gateway custom domain with ACM certificate
- **UI**: S3 + CloudFront with ACM certificate
- **DNS**: Route 53 records pointing to both services

## Deployment Steps

### 1. Deploy Infrastructure
```bash
./deploy.sh
```

This creates:
- ACM certificates (with automatic DNS validation)
- API Gateway custom domain mapping
- S3 bucket for UI hosting
- CloudFront distribution
- Route 53 DNS records

⚠️ **Note**: Certificate validation can take 5-30 minutes. The stack will wait for validation to complete.

### 2. Build and Deploy UI
```bash
./deploy-ui.sh
```

This:
- Builds the Angular app for production
- Uploads files to S3
- Creates CloudFront invalidation

## Manual Steps (if needed)

### Check Certificate Status
```bash
aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[?DomainName==`doiownthatgame.com`||DomainName==`api.doiownthatgame.com`]'
```

### Test API
```bash
curl https://api.doiownthatgame.com/health
```

### Test UI
```bash
curl -I https://doiownthatgame.com
```

## Updating the UI

To deploy UI updates:
1. Make changes to the Angular app
2. Run `./deploy-ui.sh`
3. Wait ~5 minutes for CloudFront cache to clear

## Stack Outputs

After deployment, view outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name game-checker-custom-domain-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```
