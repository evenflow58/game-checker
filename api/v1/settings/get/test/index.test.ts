import { handler } from "../src/index";
import { getSettings } from "../src/service";
import { APIGatewayProxyEventV2WithAuth } from "../src/types";

jest.mock("../src/service");
const mockedGetSettings = getSettings as unknown as jest.MockedFunction<typeof getSettings>;

describe("handler", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, TABLE_NAME: "TestTable" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it("should fail", () => {
    expect(true).toBe(false);
  });

  it("returns settings when email is present", async () => {
    mockedGetSettings.mockResolvedValue({ theme: "dark" });

    const event = {
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

    const result: any = await handler(event, {} as any, {} as any);

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("theme");
    expect(result.headers).toMatchObject({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "PATCH,OPTIONS",
    });
    expect(mockedGetSettings).toHaveBeenCalledWith(
      expect.anything(),
      "TestTable",
      "test@example.com"
    );
  });

  it("returns 500 if email is missing", async () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {},
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithAuth;

    const result: any = await handler(event, {} as any, {} as any);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: "Internal server error" });
    expect(mockedGetSettings).not.toHaveBeenCalled();
  });

  it("returns 500 if getSettings throws", async () => {
    mockedGetSettings.mockRejectedValue(new Error("DynamoDB error"));

    const event = {
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

    const result: any = await handler(event, {} as any, {} as any);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: "Internal server error" });
  });

  it("returns 500 if TABLE_NAME is missing", async () => {
    delete process.env["TABLE_NAME"];

    const event = {
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

    const result: any = await handler(event, {} as any, {} as any);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: "Internal server error" });
    expect(mockedGetSettings).not.toHaveBeenCalled();
  });
});