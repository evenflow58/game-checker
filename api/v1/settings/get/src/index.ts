import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { getSettings } from "./service";
import { APIGatewayProxyEventV2WithAuth } from "./types";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env["TABLE_NAME"]!;

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2WithAuth) => {
    console.log("Event used", event)
    try {
        const email = event.requestContext.authorizer?.jwt?.claims?.email;

        if (!email) {
            throw new Error("No email found on the token");
        }

        await getSettings(
            ddbDocClient, TABLE_NAME,
            email,
        );

        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "PATCH,OPTIONS",
            },
        };
    } catch (err) {
        console.error("Lambda failed", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};
