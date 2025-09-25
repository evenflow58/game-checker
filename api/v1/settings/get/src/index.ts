import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { getSettings } from "./service";
import { APIGatewayProxyEventV2WithAuth } from "./types";

function getDyanmoClient(): DynamoDBDocumentClient {
    const clientConfig: any = {
        region: process.env["AWS_REGION"] || "us-east-1",
    };

    if (process.env["DYNAMODB_ENDPOINT"]) {
        clientConfig.endpoint = process.env["DYNAMODB_ENDPOINT"];
    }

    if (process.env["AWS_ACCESS_KEY_ID"] && process.env["AWS_SECRET_ACCESS_KEY"]) {
        clientConfig.credentials = {
            accessKeyId: process.env["AWS_ACCESS_KEY_ID"],
            secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"],
        };
    }

    const client = new DynamoDBClient(clientConfig);
    return DynamoDBDocumentClient.from(client);
}

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2WithAuth) => {
    console.log("Event used", event)
    try {
        const TABLE_NAME = process.env["TABLE_NAME"]!;
        const email = event.requestContext.authorizer?.jwt?.claims?.email;

        if (!TABLE_NAME) {
            throw new Error("TABLE_NAME is not set");
        }

        if (!email) {
            throw new Error("No email found on the token");
        }

        const settings = await getSettings(
            getDyanmoClient(),
            TABLE_NAME,
            email,
        );

        return {
            statusCode: 200,
            body: JSON.stringify(settings),
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
