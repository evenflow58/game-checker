import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import { upsertSettings } from "./service.js";
import { APIGatewayProxyEventV2WithAuth } from "./types.js";
import { checkSteamProvider } from "./providers/steam.js";
import { SteamError } from "./errors/steamError.js";

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
        const TABLE_NAME = process.env["TABLE_NAME"];
        if (!TABLE_NAME) {
            throw new Error("TABLE_NAME environment variable is not set");
        }

        const client = new SecretsManagerClient({ region: process.env["AWS_REGION"] });

        const command = new GetSecretValueCommand({ SecretId: "GameChecker/APIKeys" });
        const response = await client.send(command);

        console.log("Retreived secrets");

        const secretResponse = JSON.parse(response?.SecretString || "{}");

        let steamApiKey: string | undefined = secretResponse.SteamAPI;
        if (!steamApiKey) {
            throw new Error("No steam API key found");
        }

        console.log("Found steam api key");

        const email = event.requestContext.authorizer?.jwt?.claims?.email;

        if (!email) {
            throw new Error("No email found on the token");
        }

        const body = JSON.parse(event.body || "{}");

        const steamId = body.steamId;

        if (steamId) {
            await checkSteamProvider(steamApiKey, steamId);

            await upsertSettings(
                getDyanmoClient(), 
                TABLE_NAME,
                email,
                steamId
            );
        }

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

        let body = {
            message: "Internal server error",
            provider: "None",
        }

        if (err instanceof SteamError) {
            body = {
                ...body,
                message: "Unable to retreive player with Steam Id",
                provider: "Steam",
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify(body),
        };
    }
};
