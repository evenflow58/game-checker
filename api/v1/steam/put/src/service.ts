import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";

export async function upsertSteamId(dbClient: DynamoDBDocumentClient, tableName: string, id: string, steamId: string) {
    const queryParams: UpdateCommandInput = {
        TableName: tableName,
        Key: { id },
        UpdateExpression: "SET steamId = :steamId",
        ExpressionAttributeValues: {
            ":steamId": steamId,
        },
    };

    return await dbClient.send(new UpdateCommand(queryParams));
}