import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "GameCheckerTable";
const ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const REGION = process.env.AWS_REGION || "us-east-1";

const clientConfig: any = {
  region: REGION,
};

// Only set endpoint and credentials for LocalStack
if (ENDPOINT) {
  clientConfig.endpoint = ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  };
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log("Settings GET invoked");
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // Extract user information from JWT claims (when authenticated via Google OAuth)
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const authenticatedUserId = claims?.sub; // Google user ID from JWT
  const userEmail = claims?.email;
  const userName = claims?.name;
  
  // Fall back to query parameters for testing or when not authenticated
  const userId = authenticatedUserId || 
                 event.pathParameters?.userId || 
                 event.queryStringParameters?.userId || 
                 "default";
  
  console.log("User ID:", userId);
  console.log("Email:", userEmail);
  console.log("Name:", userName);
  
  try {
    // Require authentication - only use test email if explicitly in development mode
    if (!userEmail) {
      console.error("No email found in JWT claims. Event context:", JSON.stringify(event.requestContext, null, 2));
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "User email not found in authentication",
        }),
      };
    }
    
    const effectiveEmail = userEmail;
    
    // Get existing settings from DynamoDB
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: effectiveEmail },
    });
    
    const result = await docClient.send(getCommand);
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        user: {
          sub: userId,
          email: effectiveEmail,
          name: userName || "Guest",
        },
        steamId: result.Item?.systemIds?.steam || "",
        authenticated: !!authenticatedUserId,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error getting settings:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        error: "Failed to retrieve settings",
      }),
    };
  }
};
