# Settings API - Google OAuth Authentication

## Overview
The Settings GET endpoint is protected with Google OAuth 2.0 authentication using JWT tokens.

## Setup

### 1. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID (Web application)
7. Copy the Client ID

### 2. Configure Environment Variables
Set the `GOOGLE_CLIENT_ID` environment variable when deploying:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

Or pass it directly in deploy-all.sh or when running the deployment.

### 3. Deploy
```bash
cd api/v1/settings
npm run build
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" npm run deploy
```

## Testing with Google OAuth

### LocalStack Limitations
**Note:** LocalStack may not fully validate Google JWT tokens. For production testing, deploy to actual AWS API Gateway.

### Get a Google ID Token

#### Option 1: Using OAuth 2.0 Playground
1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click settings (gear icon), check "Use your own OAuth credentials"
3. Enter your OAuth Client ID and Client Secret
4. Select scopes: `openid`, `email`, `profile`
5. Click "Authorize APIs"
6. Exchange authorization code for tokens
7. Copy the `id_token`

#### Option 2: Using gcloud CLI
```bash
gcloud auth print-identity-token
```

### Make Authenticated Request
```bash
# Get your ID token from Google
ID_TOKEN="your-google-id-token"

# Call the API with Authorization header
curl -H "Authorization: Bearer $ID_TOKEN" \
  http://b2066d53.execute-api.localhost.localstack.cloud:4566/v1/settings
```

### Expected Response (Authenticated)
```json
{
  "userId": "google-user-id-123",
  "email": "user@example.com",
  "name": "John Doe",
  "settings": {
    "notifications": true,
    "theme": "dark",
    "language": "en"
  },
  "authenticated": true,
  "timestamp": "2025-12-23T14:00:00.000Z"
}
```

### Expected Response (Unauthenticated/LocalStack)
```json
{
  "userId": "default",
  "email": "not-authenticated",
  "name": "Guest",
  "settings": {
    "notifications": true,
    "theme": "dark",
    "language": "en"
  },
  "authenticated": false,
  "timestamp": "2025-12-23T14:00:00.000Z"
}
```

## JWT Claims
The handler extracts the following claims from the Google JWT:
- `sub` - Google user ID
- `email` - User's email address
- `name` - User's display name

## Testing without Authentication (LocalStack Development)
For local development, the endpoint will work without authentication if the authorizer creation fails in LocalStack:

```bash
curl http://b2066d53.execute-api.localhost.localstack.cloud:4566/v1/settings
```

## Architecture

### JWT Authorizer Configuration
- **Type:** JWT
- **Identity Source:** `Authorization` header
- **Issuer:** `https://accounts.google.com`
- **Audience:** Your Google OAuth Client ID
- **JWKS URI:** (Automatically fetched from `https://www.googleapis.com/.well-known/openid-configuration`)

### Flow
1. Client obtains Google ID token via OAuth 2.0
2. Client sends request with `Authorization: Bearer <id_token>` header
3. API Gateway validates JWT signature and claims
4. If valid, JWT claims are passed to Lambda in `event.requestContext.authorizer.jwt.claims`
5. Lambda extracts user info and returns personalized response

## Production Deployment
When deploying to real AWS (not LocalStack):

```bash
# Set your Google Client ID
export GOOGLE_CLIENT_ID="123456-abc.apps.googleusercontent.com"

# Deploy to AWS
sam deploy --guided
```

The authorizer will properly validate Google JWT tokens against Google's public keys.
