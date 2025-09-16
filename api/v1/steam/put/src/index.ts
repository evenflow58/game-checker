import { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { upsertSteamId } from "./service";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env["TABLE_NAME"]!;

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
    console.log("Event used", event)
    try {
        // await upsertSteamId(ddbDocClient, TABLE_NAME, "", JSON.parse(event.body || "").steamId);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
            },
        };
    } catch (err) {
        console.error("DynamoDB query failed", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};
