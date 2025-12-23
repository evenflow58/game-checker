import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "GameCheckerTable";
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://localhost:4566";
const REGION = process.env.AWS_REGION || "us-east-1";

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function createTable(): Promise<void> {
  try {
    // Check if table already exists
    if (await tableExists(TABLE_NAME)) {
      console.log(`✅ Table '${TABLE_NAME}' already exists`);
      return;
    }

    console.log(`Creating table '${TABLE_NAME}'...`);

    const command = new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    });

    const response = await client.send(command);
    console.log(`✅ Table created successfully!`);
    console.log(`   Table ARN: ${response.TableDescription?.TableArn}`);
    console.log(`   Table Status: ${response.TableDescription?.TableStatus}`);
  } catch (error: any) {
    console.error("❌ Error creating table:", error.message);
    throw error;
  }
}

// Run the script
createTable()
  .then(() => {
    console.log("\n✅ Database setup complete!");
  })
  .catch((error) => {
    console.error("\n❌ Database setup failed:", error);
    process.exit(1);
  });
