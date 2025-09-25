import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getSettings } from "../src/service";

describe("getSettings", () => {
  const mockSend = jest.fn();
  const mockDbClient = { send: mockSend } as unknown as DynamoDBDocumentClient;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns settings when item exists", async () => {
    mockSend.mockResolvedValue({
      Item: { settings: { theme: "dark", notifications: true } }
    });

    const result = await getSettings(mockDbClient, "TestTable", "user-123");
    expect(result).toEqual({ theme: "dark", notifications: true });
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand));
    expect(mockSend.mock.calls[0][0].input).toMatchObject({
      TableName: "TestTable",
      Key: { id: "user-123" }
    });
  });

  it("returns undefined when item does not exist", async () => {
    mockSend.mockResolvedValue({});

    const result = await getSettings(mockDbClient, "TestTable", "user-123");
    expect(result).toBeUndefined();
  });

  it("returns undefined when item exists but has no settings", async () => {
    mockSend.mockResolvedValue({ Item: { other: "value" } });

    const result = await getSettings(mockDbClient, "TestTable", "user-123");
    expect(result).toBeUndefined();
  });

  it("throws if DynamoDB throws", async () => {
    mockSend.mockRejectedValue(new Error("DynamoDB error"));

    await expect(getSettings(mockDbClient, "TestTable", "user-123")).rejects.toThrow("DynamoDB error");
  });
});