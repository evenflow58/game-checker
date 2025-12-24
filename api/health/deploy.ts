import {
  LambdaClient,
  CreateFunctionCommand,
  GetFunctionCommand,
  UpdateFunctionCodeCommand,
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
} from "@aws-sdk/client-apigatewayv2";
import { readFileSync } from "fs";
import { join } from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const pipelineAsync = promisify(pipeline);

const FUNCTION_NAME = process.env.FUNCTION_NAME || "HealthCheck";
const API_NAME = process.env.API_NAME || "GameCheckerAPI";
const ENDPOINT = process.env.API_GATEWAY_ENDPOINT;
const REGION = process.env.AWS_REGION || "us-east-1";
const ROUTE_KEY = process.env.ROUTE_KEY || "GET /health";
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
    
    const response = await lambdaClient.send(updateCommand);
    console.log(`✅ Lambda function updated`);
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

  // Get AWS account ID
  const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
  const stsClient = new STSClient({ region: REGION });
  const identity = await stsClient.send(new GetCallerIdentityCommand({}));
  const accountId = identity.Account;

  // Add permission for API Gateway to invoke Lambda
  try {
    const permissionCommand = new AddPermissionCommand({
      FunctionName: FUNCTION_NAME,
      StatementId: `apigateway-${apiId}`,
      Action: "lambda:InvokeFunction",
      Principal: "apigateway.amazonaws.com",
      SourceArn: `arn:aws:execute-api:${REGION}:${accountId}:${apiId}/*`,
    });
    
    await lambdaClient.send(permissionCommand);
    console.log(`✅ Permission added for API Gateway to invoke Lambda`);
  } catch (error: any) {
    if (error.name !== "ResourceConflictException") {
      throw error;
    }
    console.log(`  Permission already exists`);
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

  // Create route (or skip if it already exists)
  console.log(`Creating route: ${ROUTE_KEY}...`);
  
  try {
    const createRouteCommand = new CreateRouteCommand({
      ApiId: apiId,
      RouteKey: ROUTE_KEY,
      Target: `integrations/${integrationResponse.IntegrationId}`,
    });

    const routeResponse = await apiClient.send(createRouteCommand);
    console.log(`✅ Route created (ID: ${routeResponse.RouteId})`);
  } catch (error: any) {
    if (error.name === "ConflictException") {
      console.log(`  Route already exists, skipping...`);
    } else {
      throw error;
    }
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
  
  console.log(`\n✅ Health check endpoint deployed!`);
  console.log(`   Endpoint: http://${apiId}.execute-api.localhost.localstack.cloud:4566/health`);
}

async function deploy(): Promise<void> {
  try {
    console.log(`Deploying health check Lambda function...`);
    
    const functionArn = await deployLambda();
    await attachToApiGateway(functionArn);
    
    console.log(`\n✅ Health check deployment complete!`);
  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

// Run the script
deploy()
  .then(() => {
    console.log("\n✅ Health check setup complete!");
  })
  .catch((error) => {
    console.error("\n❌ Health check setup failed:", error);
    process.exit(1);
  });
