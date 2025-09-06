import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env["TABLE_NAME"]!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Example: query by a partition key "pk"
    // Replace pk with your actual partition key name
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pkValue",
      ExpressionAttributeNames: {
        "#pk": "id", // 👈 replace with your partition key field
      },
      ExpressionAttributeValues: {
        ":pkValue": "entry_type", // 👈 replace with the actual key you want to query
      },
    };

    const result = await ddbDocClient.send(new QueryCommand(queryParams));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify({
        message: "Query success!",
        items: result.Items ?? [],
      }),
    };
  } catch (err) {
    console.error("DynamoDB query failed", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
