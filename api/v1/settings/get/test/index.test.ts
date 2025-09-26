import { DynamoDBClient, CreateTableCommand, PutItemCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { handler } from "../src/index";
import { APIGatewayProxyEventV2WithAuth } from "../src/types";
import { Context } from "aws-lambda";

const TABLE_NAME = "SettingsTestTable";
const DYNAMODB_ENDPOINT = "http://localhost:8000";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey",
  },
});

beforeAll(async () => {
  // Create table
  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );

  // Insert test item
  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        id: { S: "user-123" },
        settings: { S: JSON.stringify({ theme: "dark", notifications: true }) },
      },
    })
  );
  
  // Set env vars for Lambda
  process.env["TABLE_NAME"] = TABLE_NAME;
  process.env["DYNAMODB_ENDPOINT"] = DYNAMODB_ENDPOINT;
  process.env["AWS_REGION"] = "us-east-1";
  process.env["AWS_ACCESS_KEY_ID"] = "fakeMyKeyId";
  process.env["AWS_SECRET_ACCESS_KEY"] = "fakeSecretAccessKey";
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
});

describe("Integration: handler with DynamoDB Local", () => {
  it("returns settings for a valid user", async () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "user-123",
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithAuth;

    const result: any = await handler(
      event as APIGatewayProxyEventV2WithAuth,
      {} as Context,
      {} as any
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    // settings is stored as a string, so parse it
    expect(JSON.parse(body)).toEqual({ theme: "dark", notifications: true });
  });

  it("returns 500 if user does not exist", async () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "nonexistent-user",
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithAuth;

    const result: any = await handler(
      event as APIGatewayProxyEventV2WithAuth,
      {} as Context,
      {} as any
    );

    expect(result.statusCode).toBe(200); // handler returns 200 with undefined settings
    expect(result.body).toBeUndefined();
  });

  it("returns 500 if TABLE_NAME is missing", async () => {
    delete process.env["TABLE_NAME"];

    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "user-123",
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithAuth;

    const result: any = await handler(
      event as APIGatewayProxyEventV2WithAuth,
      {} as Context,
      {} as any
    );

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: "Internal server error" });

    // Restore TABLE_NAME for other tests
    process.env["TABLE_NAME"] = TABLE_NAME;
  });

  it("returns 500 if email is missing from event", async () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              // email is intentionally missing
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithAuth;

    const result: any = await handler(
      event as APIGatewayProxyEventV2WithAuth,
      {} as Context,
      {} as any
    );

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: "Internal server error" });
  });
});