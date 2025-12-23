import {
  ApiGatewayV2Client,
  CreateApiCommand,
  CreateRouteCommand,
  CreateIntegrationCommand,
  GetApisCommand,
  GetRoutesCommand,
} from "@aws-sdk/client-apigatewayv2";

const API_NAME = process.env.API_NAME || "GameCheckerAPI";
const ENDPOINT = process.env.API_GATEWAY_ENDPOINT || "http://localhost:4566";
const REGION = process.env.AWS_REGION || "us-east-1";
const LAMBDA_FUNCTION_ARN = process.env.LAMBDA_FUNCTION_ARN || "";

const client = new ApiGatewayV2Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

async function apiExists(apiName: string): Promise<string | null> {
  try {
    const command = new GetApisCommand({});
    const response = await client.send(command);
    
    const existingApi = response.Items?.find(api => api.Name === apiName);
    return existingApi?.ApiId || null;
  } catch (error: any) {
    console.error("Error checking for existing API:", error.message);
    return null;
  }
}

async function createApi(): Promise<void> {
  try {
    // Check if API already exists
    const existingApiId = await apiExists(API_NAME);
    if (existingApiId) {
      console.log(`✅ API '${API_NAME}' already exists (ID: ${existingApiId})`);
      console.log(`   API Endpoint: ${ENDPOINT}/restapis/${existingApiId}/test/_user_request_`);
      return;
    }

    console.log(`Creating HTTP API '${API_NAME}'...`);

    // Create HTTP API
    const createApiCommand = new CreateApiCommand({
      Name: API_NAME,
      ProtocolType: "HTTP",
      Description: "Game Checker API Gateway",
      CorsConfiguration: {
        AllowOrigins: ["*"],
        AllowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        AllowHeaders: ["*"],
        MaxAge: 300,
      },
    });

    const apiResponse = await client.send(createApiCommand);
    const apiId = apiResponse.ApiId!;

    console.log(`✅ API created successfully!`);
    console.log(`   API ID: ${apiId}`);
    console.log(`   API Endpoint: ${apiResponse.ApiEndpoint}`);

    // Create integration if Lambda ARN is provided
    if (LAMBDA_FUNCTION_ARN) {
      console.log(`Creating Lambda integration...`);
      
      const createIntegrationCommand = new CreateIntegrationCommand({
        ApiId: apiId,
        IntegrationType: "AWS_PROXY",
        IntegrationUri: LAMBDA_FUNCTION_ARN,
        PayloadFormatVersion: "2.0",
      });

      const integrationResponse = await client.send(createIntegrationCommand);
      console.log(`✅ Integration created (ID: ${integrationResponse.IntegrationId})`);

      // Create a default route
      console.log(`Creating default route...`);
      
      const createRouteCommand = new CreateRouteCommand({
        ApiId: apiId,
        RouteKey: "$default",
        Target: `integrations/${integrationResponse.IntegrationId}`,
      });

      const routeResponse = await client.send(createRouteCommand);
      console.log(`✅ Route created (ID: ${routeResponse.RouteId})`);
    } else {
      console.log(`ℹ️  No Lambda ARN provided. Skipping integration and route creation.`);
      console.log(`   Set LAMBDA_FUNCTION_ARN environment variable to create integrations.`);
    }

    console.log(`\n✅ API Gateway setup complete!`);
    console.log(`   Test with: curl ${ENDPOINT}/restapis/${apiId}/test/_user_request_/`);
  } catch (error: any) {
    console.error("❌ Error creating API:", error.message);
    throw error;
  }
}

// Run the script
createApi()
  .then(() => {
    console.log("\n✅ API Gateway setup complete!");
  })
  .catch((error) => {
    console.error("\n❌ API Gateway setup failed:", error);
    process.exit(1);
  });
