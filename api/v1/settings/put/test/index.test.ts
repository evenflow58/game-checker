import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { handler } from "../src/index";
import { APIGatewayProxyEventV2WithAuth } from "../src/types";
import { mockClient } from "aws-sdk-client-mock";
import { Context } from "aws-lambda";
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const TABLE_NAME = "SettingsTestTable";
const DYNAMODB_ENDPOINT = "http://localhost:8000";

// Setup MSW
const server = setupServer(
  http.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/*', ({ request }) => {
    const url = new URL(request.url);
    const steamids = url.searchParams.get('steamids');

    if (steamids === '12345') {
      return HttpResponse.json({
        response: {
          players: [
            {
              steamid: '12345',
              personaname: 'TestUser',
              profileurl: 'http://steamcommunity.com/id/testuser/',
            }
          ]
        }
      });
    }

    // Return empty response for invalid IDs
    return HttpResponse.json({
      response: {
        players: []
      }
    });
  })
);

// Mock Secrets Manager since we can't use local version
const secretsManagerMock = mockClient(SecretsManagerClient);
secretsManagerMock.resolves({
  SecretString: JSON.stringify({ SteamAPI: "fake-api-key" })
});

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey",
  },
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

beforeAll(async () => {
  // Start MSW Server
  server.listen();

  // Create table
  const result = await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );

  console.log("Create table result", result);

  // Set env vars for Lambda
  process.env["TABLE_NAME"] = TABLE_NAME;
  process.env["DYNAMODB_ENDPOINT"] = DYNAMODB_ENDPOINT;
  process.env["AWS_REGION"] = "us-east-1";
});

afterAll(async () => {
  // Stop MSW Server
  server.close();
  await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
});

beforeEach(() => {
  process.env["TABLE_NAME"] = TABLE_NAME;

  server.resetHandlers();
  secretsManagerMock.reset();
  secretsManagerMock.resolves({
    SecretString: JSON.stringify({ SteamAPI: "fake-api-key" })
  });
});

describe("Integration: PUT handler with DynamoDB Local", () => {
  it.only("successfully validates steam ID with Steam API", async () => {
    const event = {
      body: JSON.stringify({ steamId: "12345" }),
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "test@example.com",
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

    expect(result.statusCode).toBe(204);

    // Verify the data was stored with Steam profile info
    const getResult = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: "test@example.com" } },
      })
    );

    console.log("Settings", getResult.Item);

    const settings =
      getResult.Item && getResult.Item["settings"] && getResult.Item["settings"]["M"]
        ? getResult.Item["settings"]["M"]
        : {};
    expect(settings["steamId"]["S"]).toBe("12345");
  });

  it("handles invalid Steam ID gracefully", async () => {
    const event = {
      body: JSON.stringify({ steamId: "invalid-id" }),
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "test@example.com",
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
    expect(JSON.parse(result.body)).toEqual({
      message: "Unable to retreive player with Steam Id",
      provider: "Steam",
    });
  });

  it("returns 500 if TABLE_NAME is missing", async () => {
    delete process.env["TABLE_NAME"];

    const event = {
      body: JSON.stringify({ steamId: "12345" }),
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "test@example.com",
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
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
      provider: "None",
    });
  });

  it("returns 500 if steam API key is missing", async () => {
    secretsManagerMock.resolves({
      SecretString: JSON.stringify({}) // Empty secrets object
    });

    const event = {
      body: JSON.stringify({ steamId: "12345" }),
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "test@example.com",
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
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
      provider: "None",
    });
  });

  it("returns 500 if email is missing from claims", async () => {
    const event = {
      body: JSON.stringify({ steamId: "12345" }),
      requestContext: {
        authorizer: {
          jwt: {
            claims: {} // Empty claims object
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
    expect(JSON.parse(result.body)).toEqual({
      message: "Internal server error",
      provider: "None",
    });
  });

  it("handles Steam API failure gracefully", async () => {
    // Override the default MSW handler for this test
    server.use(
      http.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/*', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const event = {
      body: JSON.stringify({ steamId: "12345" }),
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              email: "test@example.com",
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
    expect(JSON.parse(result.body)).toEqual({
      message: "Unable to retreive player with Steam Id",
      provider: "Steam",
    });
  });
});