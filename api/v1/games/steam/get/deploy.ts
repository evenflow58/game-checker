import {
  LambdaClient,
  CreateFunctionCommand,
  GetFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  AddPermissionCommand,
} from "@aws-sdk/client-lambda";
import {
  ApiGatewayV2Client,
  GetApisCommand,
  CreateIntegrationCommand,
  CreateRouteCommand,
  GetIntegrationsCommand,
  GetRoutesCommand,
  CreateStageCommand,
  GetStagesCommand,
  GetAuthorizersCommand,
} from "@aws-sdk/client-apigatewayv2";
import { readFileSync } from "fs";
import { join } from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const pipelineAsync = promisify(pipeline);

const FUNCTION_NAME = process.env.FUNCTION_NAME || "GamesSteamGet";
const API_NAME = process.env.API_NAME || "GameCheckerAPI";
const ENDPOINT = process.env.API_GATEWAY_ENDPOINT;
const REGION = process.env.AWS_REGION || "us-east-1";
const ROUTE_KEY = "GET /v1/games/steam";
const TABLE_NAME = process.env.TABLE_NAME || "GameCheckerTable";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const STEAM_API_KEY = process.env.STEAM_API_KEY || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com";
const ENABLE_AUTH = process.env.ENABLE_AUTH === "true";
const LAMBDA_ROLE_ARN = process.env.LAMBDA_ROLE_ARN || "arn:aws:iam::000000000000:role/lambda-role";

const lambdaConfig: any = {
  region: REGION,
};

const apiConfig: any = {
  region: REGION,
};

// Only set endpoint and credentials for LocalStack
if (ENDPOINT) {
  lambdaConfig.endpoint = ENDPOINT;
  lambdaConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  };
  apiConfig.endpoint = ENDPOINT;
  apiConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  };
}

const lambdaClient = new LambdaClient(lambdaConfig);
const apiClient = new ApiGatewayV2Client(apiConfig);

async function createZipFile(): Promise<Buffer> {
  const zipPath = join(__dirname, "function.zip");
  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.file(join(__dirname, "handler.js"), { name: "handler.js" });
  await archive.finalize();

  await new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", reject);
  });

  return readFileSync(zipPath);
}

async function lambdaExists(functionName: string): Promise<boolean> {
  try {
    await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }));
    return true;
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function getApiId(apiName: string): Promise<string | null> {
  const response = await apiClient.send(new GetApisCommand({}));
  const api = response.Items?.find((item) => item.Name === apiName);
  return api?.ApiId || null;
}

async function deployLambda(): Promise<string> {
  console.log(`Creating deployment package...`);
  const zipBuffer = await createZipFile();

  if (await lambdaExists(FUNCTION_NAME)) {
    console.log(`Lambda function '${FUNCTION_NAME}' already exists, updating code...`);
    
    const updateCommand = new UpdateFunctionCodeCommand({
      FunctionName: FUNCTION_NAME,
      ZipFile: zipBuffer,
    });
    
    await lambdaClient.send(updateCommand);
    console.log(`✅ Lambda function code updated`);
    
    // Wait for the Lambda to finish updating
    console.log(`Waiting for Lambda to finish updating...`);
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      try {
        const getFunctionCommand = new GetFunctionCommand({
          FunctionName: FUNCTION_NAME,
        });
        const funcResponse = await lambdaClient.send(getFunctionCommand);
        
        if (funcResponse.Configuration?.LastUpdateStatus === 'Successful') {
          break;
        } else if (funcResponse.Configuration?.LastUpdateStatus === 'Failed') {
          throw new Error(`Lambda update failed: ${funcResponse.Configuration?.LastUpdateStatusReason}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error: any) {
        if (attempts >= maxAttempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    // Update environment variables
    console.log(`Updating Lambda configuration...`);
    const updateConfigCommand = new UpdateFunctionConfigurationCommand({
      FunctionName: FUNCTION_NAME,
      Environment: {
        Variables: {
          NODE_ENV: "development",
          TABLE_NAME: TABLE_NAME,
          DYNAMODB_ENDPOINT: DYNAMODB_ENDPOINT || "",
          STEAM_API_KEY: STEAM_API_KEY,
        },
      },
    });
    
    await lambdaClient.send(updateConfigCommand);
    console.log(`✅ Lambda environment updated`);
    
    const getFunctionCommand = new GetFunctionCommand({
      FunctionName: FUNCTION_NAME,
    });
    const response = await lambdaClient.send(getFunctionCommand);
    
    return response.Configuration!.FunctionArn!;
  } else {
    console.log(`Creating Lambda function '${FUNCTION_NAME}'...`);
    
    const createCommand = new CreateFunctionCommand({
      FunctionName: FUNCTION_NAME,
      Runtime: "nodejs22.x",
      Role: LAMBDA_ROLE_ARN,
      Handler: "handler.handler",
      Code: {
        ZipFile: zipBuffer,
      },
      Environment: {
        Variables: {
          NODE_ENV: "development",
          TABLE_NAME: TABLE_NAME,
          DYNAMODB_ENDPOINT: DYNAMODB_ENDPOINT || "",
          STEAM_API_KEY: STEAM_API_KEY,
        },
      },
      Timeout: 30,
    });
    
    const response = await lambdaClient.send(createCommand);
    console.log(`✅ Lambda function created`);
    
    return response.FunctionArn!;
  }
}

async function setupApiGateway(functionArn: string) {
  console.log(`Setting up API Gateway...`);
  
  const apiId = await getApiId(API_NAME);
  if (!apiId) {
    throw new Error(`API '${API_NAME}' not found. Please create it first.`);
  }
  
  console.log(`✅ Found API: ${apiId}`);
  
  // Add Lambda permission for API Gateway
  try {
    const addPermissionCommand = new AddPermissionCommand({
      FunctionName: FUNCTION_NAME,
      StatementId: `apigateway-${Date.now()}`,
      Action: "lambda:InvokeFunction",
      Principal: "apigateway.amazonaws.com",
      SourceArn: `arn:aws:execute-api:${REGION}:*:${apiId}/*`,
    });
    
    await lambdaClient.send(addPermissionCommand);
    console.log(`✅ Lambda permission added`);
  } catch (error: any) {
    if (error.name !== "ResourceConflictException") {
      console.log(`⚠️  Could not add permission: ${error.message}`);
    }
  }
  
  // Create integration
  console.log(`Creating integration...`);
  
  const createIntegrationCommand = new CreateIntegrationCommand({
    ApiId: apiId,
    IntegrationType: "AWS_PROXY",
    IntegrationUri: functionArn,
    PayloadFormatVersion: "2.0",
    IntegrationMethod: "POST",
  });

  const integrationResponse = await apiClient.send(createIntegrationCommand);
  console.log(`✅ Integration created (ID: ${integrationResponse.IntegrationId})`);

  // Get existing Google OAuth authorizer (should be created by infrastructure setup)
  let authorizerId: string | undefined;
  
  if (ENABLE_AUTH) {
    console.log(`Looking up Google OAuth authorizer...`);
    
    try {
      const authorizersResponse = await apiClient.send(new GetAuthorizersCommand({ ApiId: apiId }));
      const existingAuthorizer = authorizersResponse.Items?.find(
        (auth) => auth.Name === "GoogleOAuthAuthorizer"
      );
      
      if (existingAuthorizer) {
        authorizerId = existingAuthorizer.AuthorizerId;
        console.log(`✅ Using existing Google OAuth authorizer (ID: ${authorizerId})`);
      } else {
        console.log(`⚠️  GoogleOAuthAuthorizer not found!`);
        console.log(`   Ensure infrastructure/apiGateway has been deployed with ENABLE_AUTH=true`);
        console.log(`   Proceeding without authentication`);
        authorizerId = undefined;
      }
    } catch (error: any) {
      console.log(`  ⚠️  Could not lookup authorizer: ${error.message}`);
      console.log(`  Proceeding without authentication`);
      authorizerId = undefined;
    }
  } else {
    console.log(`⚠️  Authentication disabled (ENABLE_AUTH not set to "true")`);
    console.log(`   For production, set ENABLE_AUTH=true and GOOGLE_CLIENT_ID`);
  }

  // Create route
  console.log(`Setting up route: ${ROUTE_KEY}...`);
  
  try {
    const getRoutesCommand = new GetRoutesCommand({ ApiId: apiId });
    const routesResponse = await apiClient.send(getRoutesCommand);
    const existingRoute = routesResponse.Items?.find(route => route.RouteKey === ROUTE_KEY);
    
    if (existingRoute) {
      console.log(`  Route already exists, skipping creation`);
    } else {
      const createRouteCommand = new CreateRouteCommand({
        ApiId: apiId,
        RouteKey: ROUTE_KEY,
        Target: `integrations/${integrationResponse.IntegrationId}`,
        AuthorizationType: authorizerId ? "JWT" : "NONE",
        AuthorizerId: authorizerId,
      });
      
      await apiClient.send(createRouteCommand);
      console.log(`✅ Route created`);
    }
  } catch (error: any) {
    console.log(`  ⚠️  Could not create route: ${error.message}`);
  }
  
  // Ensure $default stage exists
  console.log(`Checking for $default stage...`);
  const getStagesCommand = new GetStagesCommand({ ApiId: apiId });
  const stagesResponse = await apiClient.send(getStagesCommand);
  
  if (!stagesResponse.Items?.some(stage => stage.StageName === "$default")) {
    console.log(`Creating $default stage...`);
    const createStageCommand = new CreateStageCommand({
      ApiId: apiId,
      StageName: "$default",
      AutoDeploy: true,
    });
    await apiClient.send(createStageCommand);
    console.log(`✅ Stage created`);
  } else {
    console.log(`✅ Stage already exists`);
  }
  
  console.log(`\n✅ Games Steam GET setup complete!`);
  console.log(`   Route: ${ROUTE_KEY}`);
  if (ENDPOINT) {
    console.log(`   LocalStack URL: ${ENDPOINT.replace(':4566', `:4566/restapis/${apiId}/test/_user_request_/v1/games/steam`)}`);
  }
}

// Run deployment
deployLambda()
  .then((functionArn) => {
    console.log(`Lambda ARN: ${functionArn}`);
    return setupApiGateway(functionArn);
  })
  .then(() => {
    console.log("\n✅ Deployment complete!");
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
