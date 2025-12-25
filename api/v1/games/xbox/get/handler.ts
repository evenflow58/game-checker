import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "GameCheckerTable";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const REGION = process.env.AWS_REGION || "us-east-1";
const XBOX_CLIENT_ID = process.env.XBOX_CLIENT_ID || "";
const XBOX_CLIENT_SECRET = process.env.XBOX_CLIENT_SECRET || "";

const clientConfig: any = {
  region: REGION,
};

// Only set endpoint and credentials for LocalStack
if (DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = DYNAMODB_ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  };
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

interface XboxGame {
  titleId: string;
  name: string;
  achievements?: {
    currentAchievements: number;
    totalAchievements: number;
  };
  titleHistory?: {
    lastTimePlayed: string;
  };
  displayImage?: string;
}

interface XboxGamesResponse {
  xboxGamertag: string;
  gameCount: number;
  games: XboxGame[];
}

export const handler = async (event: any) => {
  console.log("Games Xbox GET invoked");
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // Extract user information from JWT claims
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const userEmail = claims?.email || event.queryStringParameters?.email || "test@example.com";
  
  console.log("Email:", userEmail);
  
  try {
    // Get user's Xbox gamertag from DynamoDB
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: userEmail },
    });
    
    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "User not found",
        }),
      };
    }
    
    const xboxGamertag = result.Item.systemIds?.xbox;
    
    if (!xboxGamertag) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "Xbox gamertag not configured",
        }),
      };
    }
    
    console.log(`Fetching Xbox games for gamertag: ${xboxGamertag}`);
    
    // Note: Xbox API requires OAuth2 authentication flow
    // This is a simplified example - in production, you'd need to:
    // 1. Get user authorization
    // 2. Exchange authorization code for access token
    // 3. Use access token to call Xbox Live API
    
    // For now, return a placeholder response
    // To implement: Use Xbox Live API endpoints
    // - Authentication: https://login.live.com/oauth20_token.srf
    // - Profile: https://profile.xboxlive.com/users/gt({gamertag})/profile/settings
    // - Games: https://titlehub.xboxlive.com/users/xuid({xuid})/titles/titlehistory/decoration/detail
    
    console.log("Xbox API integration requires OAuth2 flow - returning empty games list");
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        xboxGamertag: xboxGamertag,
        gameCount: 0,
        games: [],
        message: "Xbox API integration requires OAuth2 setup. Configure Xbox Client ID and Secret.",
      }),
    };
  } catch (error) {
    console.error("Error getting Xbox games:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        error: "Failed to get Xbox games",
      }),
    };
  }
};
