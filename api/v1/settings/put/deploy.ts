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
  CreateAuthorizerCommand,
  GetAuthorizersCommand,
} from "@aws-sdk/client-apigatewayv2";
import { readFileSync } from "fs";
import { join } from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const pipelineAsync = promisify(pipeline);

const FUNCTION_NAME = process.env.FUNCTION_NAME || "SettingsPut";
const API_NAME = process.env.API_NAME || "GameCheckerAPI";
const ENDPOINT = process.env.API_GATEWAY_ENDPOINT;
const REGION = process.env.AWS_REGION || "us-east-1";
const ROUTE_KEY = "PUT /v1/settings";
const TABLE_NAME = process.env.TABLE_NAME || "GameCheckerTable";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com";
const ENABLE_AUTH = process.env.ENABLE_AUTH === "true"; // Set to "true" to enable Google OAuth
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
    
    // Wait for the Lambda to finish updating before updating configuration
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
        
        // Wait 1 second before checking again
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
        },
      },
    });
    
    const response = await lambdaClient.send(updateConfigCommand);
    console.log(`✅ Lambda configuration updated`);
    return response.FunctionArn!;
  }

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
      },
    },
  });

  const response = await lambdaClient.send(createCommand);
  console.log(`✅ Lambda function created`);
  console.log(`   Function ARN: ${response.FunctionArn}`);
  
  return response.FunctionArn!;
}

async function attachToApiGateway(functionArn: string): Promise<void> {
  console.log(`\nAttaching Lambda to API Gateway...`);
  
  const apiId = await getApiId(API_NAME);
  if (!apiId) {
    throw new Error(`API '${API_NAME}' not found. Please create the API Gateway first.`);
  }

  console.log(`Found API: ${apiId}`);

  // Get AWS account ID (use LocalStack default for local, real account ID for AWS)
  const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
  const stsConfig: any = { region: REGION };
  if (ENDPOINT) {
    stsConfig.endpoint = ENDPOINT;
    stsConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    };
  }
  const stsClient = new STSClient(stsConfig);
  const identity = await stsClient.send(new GetCallerIdentityCommand({}));
  const accountId = identity.Account;

  // Add permission for API Gateway to invoke Lambda
  // Remove existing permission first to ensure we have the correct account ID
  try {
    const { RemovePermissionCommand } = require("@aws-sdk/client-lambda");
    await lambdaClient.send(new RemovePermissionCommand({
      FunctionName: FUNCTION_NAME,
      StatementId: `apigateway-${apiId}`,
    }));
    console.log(`  Removed existing permission`);
  } catch (error: any) {
    if (error.name !== "ResourceNotFoundException") {
      // Ignore if permission doesn't exist
    }
  }

  // Add the permission with correct account ID
  const permissionCommand = new AddPermissionCommand({
    FunctionName: FUNCTION_NAME,
    StatementId: `apigateway-${apiId}`,
    Action: "lambda:InvokeFunction",
    Principal: "apigateway.amazonaws.com",
    SourceArn: `arn:aws:execute-api:${REGION}:${accountId}:${apiId}/*`,
  });
  
  await lambdaClient.send(permissionCommand);
  console.log(`✅ Permission added for API Gateway to invoke Lambda`);

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

  // Delete and recreate PUT route to ensure it uses the new authorizer
  console.log(`Setting up route: ${ROUTE_KEY}...`);
  
  try {
    // Check if PUT route exists and delete it
    const getRoutesCommand = new GetRoutesCommand({ ApiId: apiId });
    const routesResponse = await apiClient.send(getRoutesCommand);
    const existingRoute = routesResponse.Items?.find(route => route.RouteKey === ROUTE_KEY);
    
    if (existingRoute) {
      console.log(`  Deleting existing route to update configuration...`);
      const { DeleteRouteCommand } = require("@aws-sdk/client-apigatewayv2");
      await apiClient.send(new DeleteRouteCommand({
        ApiId: apiId,
        RouteId: existingRoute.RouteId
      }));
      console.log(`  Deleted old route`);
    }
    
    // Create new PUT route with current authorizer
    const createRouteCommand = new CreateRouteCommand({
      ApiId: apiId,
      RouteKey: ROUTE_KEY,
      Target: `integrations/${integrationResponse.IntegrationId}`,
      AuthorizationType: authorizerId ? "JWT" : "NONE",
      AuthorizerId: authorizerId,
    });

    const routeResponse = await apiClient.send(createRouteCommand);
    console.log(`✅ Route created (ID: ${routeResponse.RouteId})`);
    if (authorizerId) {
      console.log(`   🔒 Protected with Google OAuth`);
    }
  } catch (error: any) {
    console.error(`Failed to create route: ${error.message}`);
    throw error;
  }
  
  // Create $default stage for auto-deployment
  console.log(`Creating $default stage...`);
  try {
    const stagesResponse = await apiClient.send(new GetStagesCommand({ ApiId: apiId }));
    const defaultStage = stagesResponse.Items?.find(stage => stage.StageName === "$default");
    
    if (!defaultStage) {
      const createStageCommand = new CreateStageCommand({
        ApiId: apiId,
        StageName: "$default",
        AutoDeploy: true,
      });
      await apiClient.send(createStageCommand);
      console.log(`✅ $default stage created with auto-deploy enabled`);
    } else {
      console.log(`  $default stage already exists`);
    }
  } catch (error: any) {
    console.log(`  Note: Could not create stage - ${error.message}`);
  }
  
  console.log(`\n✅ Settings GET endpoint deployed!`);
  console.log(`   Endpoint: http://${apiId}.execute-api.localhost.localstack.cloud:4566/v1/settings`);
}

async function deploy(): Promise<void> {
  try {
    console.log(`Deploying settings GET Lambda function...`);
    
    const functionArn = await deployLambda();
    await attachToApiGateway(functionArn);
    
    console.log(`\n✅ Settings GET deployment complete!`);
  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

// Run the script
deploy()
  .then(() => {
    console.log("\n✅ Settings GET setup complete!");
  })
  .catch((error) => {
    console.error("\n❌ Settings GET setup failed:", error);
    process.exit(1);
  });
