import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "GameCheckerTable";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const REGION = process.env.AWS_REGION || "us-east-1";
const STEAM_API_KEY = process.env.STEAM_API_KEY || "";

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

export const handler = async (event: any) => {
  console.log("Games Steam GET invoked");
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // Extract user information from JWT claims
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const userEmail = claims?.email;
  
  console.log("Email:", userEmail);
  
  try {
    // Require authentication
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
    
    // Get user's Steam ID from DynamoDB
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
    
    const steamId = result.Item.systemIds?.steam;
    
    if (!steamId) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "Steam ID not configured for this user",
        }),
      };
    }
    
    if (!STEAM_API_KEY) {
      console.error("STEAM_API_KEY not configured");
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "Steam API not configured",
        }),
      };
    }
    
    // Fetch games from Steam API
    const steamApiUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`;
    
    console.log(`Fetching games for Steam ID: ${steamId}`);
    
    const steamResponse = await fetch(steamApiUrl);
    
    if (!steamResponse.ok) {
      console.error(`Steam API error: ${steamResponse.status} ${steamResponse.statusText}`);
      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "Failed to fetch games from Steam",
        }),
      };
    }
    
    const steamData = await steamResponse.json();
    
    console.log(`Found ${steamData.response?.game_count || 0} games`);
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        steamId: steamId,
        gameCount: steamData.response?.game_count || 0,
        games: steamData.response?.games || [],
      }),
    };
  } catch (error) {
    console.error("Error getting Steam games:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        error: "Failed to get Steam games",
      }),
    };
  }
};
