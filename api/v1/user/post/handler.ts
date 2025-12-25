import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

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
  console.log("User creation POST invoked");
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
  
  // For local testing without authentication, use a test email
  const effectiveEmail = userEmail || "test@example.com";
  
  console.log("User ID:", userId);
  console.log("Email:", effectiveEmail);
  console.log("Name:", userName);
  
  try {
    // Check if user already exists
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: effectiveEmail },
    });
    
    const existingUser = await docClient.send(getCommand);
    
    if (existingUser.Item) {
      // User already exists, return their data
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          message: "User already exists",
          user: {
            email: existingUser.Item.id,
          },
          created: false,
        }),
      };
    }
    
    // Create new user record
    const newUserRecord = {
      id: effectiveEmail,
      systemIds: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: newUserRecord,
    });
    
    await docClient.send(putCommand);
    console.log(`Created new user record for ${effectiveEmail}`);
    
    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        message: "User created successfully",
        user: {
          email: effectiveEmail,
        },
        created: true,
      }),
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        error: "Failed to create user",
      }),
    };
  }
};
