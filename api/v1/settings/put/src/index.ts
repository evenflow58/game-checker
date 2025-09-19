import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import { upsertSettings } from "./service";
import { APIGatewayProxyEventV2WithAuth } from "./types";
import { checkSteamProvider } from "./providers/steam";
import { SteamError } from "./errors/steamError";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env["TABLE_NAME"]!;

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2WithAuth) => {
    console.log("Event used", event)
    try {
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
                ddbDocClient, TABLE_NAME,
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
