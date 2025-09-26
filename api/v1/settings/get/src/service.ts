import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

export async function getSettings(
  dbClient: DynamoDBDocumentClient,
  tableName: string,
  id: string,
) {
  // Step 1: Get current item
  const getResult = await dbClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { id },
    })
  );
  
  return getResult.Item?.['settings'];
}
