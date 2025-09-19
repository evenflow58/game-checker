import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function getSettings(
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
  
  return getResult;
}
