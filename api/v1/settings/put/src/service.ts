import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function upsertSettings(
  dbClient: DynamoDBDocumentClient,
  tableName: string,
  id: string,
  steamId?: string
) {
  // Step 1: Get current item
  const getResult = await dbClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { id },
    })
  );

  console.log("getResult", getResult);

  // Merge existing settings (if any) with steamId
  const existingSettings = getResult.Item?.['settings'] || {};

  let newSettings = { ...existingSettings };

  if (steamId) {
    newSettings.steamId = steamId;
  }

  // Step 2: Update the settings map
  const updateResult = await dbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: "SET #settings = :newSettings",
      ExpressionAttributeNames: { "#settings": "settings" },
      ExpressionAttributeValues: { ":newSettings": newSettings },
      ReturnValues: "ALL_NEW",
    })
  );

  return updateResult;
}
