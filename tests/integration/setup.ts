import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const TABLE_NAME =
  process.env.TURBINE_TEST_TABLE || "turbine-integration-tests";
const REGION =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

const ddb = new DynamoDBClient({ region: REGION });

async function ensureTable() {
  try {
    const describe = await ddb.send(
      new DescribeTableCommand({ TableName: TABLE_NAME }),
    );
    if (describe.Table?.TableStatus === "ACTIVE") return;
  } catch (_) {
    // not found, create
    try {
      await ddb.send(
        new CreateTableCommand({
          TableName: TABLE_NAME,
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [
            { AttributeName: "pk", AttributeType: "S" },
            { AttributeName: "sk", AttributeType: "S" },
            { AttributeName: "type", AttributeType: "S" },
            { AttributeName: "gsi1pk", AttributeType: "S" },
            { AttributeName: "gsi1sk", AttributeType: "S" },
            { AttributeName: "gsi2pk", AttributeType: "S" },
            { AttributeName: "gsi2sk", AttributeType: "S" },
          ],
          KeySchema: [
            { AttributeName: "pk", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "gsi1",
              KeySchema: [
                { AttributeName: "type", KeyType: "HASH" },
                { AttributeName: "sk", KeyType: "RANGE" },
              ],
              Projection: { ProjectionType: "ALL" },
            },
            {
              IndexName: "gsi2",
              KeySchema: [
                { AttributeName: "gsi1pk", KeyType: "HASH" },
                { AttributeName: "gsi1sk", KeyType: "RANGE" },
              ],
              Projection: { ProjectionType: "ALL" },
            },
            {
              IndexName: "gsi3",
              KeySchema: [
                { AttributeName: "gsi2pk", KeyType: "HASH" },
                { AttributeName: "gsi2sk", KeyType: "RANGE" },
              ],
              Projection: { ProjectionType: "ALL" },
            },
          ],
        }),
      );
    } catch (err) {
      if (!(err instanceof ResourceInUseException)) throw err;
    }

    // Wait until the table is ACTIVE
    await waitUntilTableExists(
      { client: ddb, maxWaitTime: 60, minDelay: 2, maxDelay: 5 },
      { TableName: TABLE_NAME },
    );
    // Give GSIs a brief extra moment to become queryable
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export default async function globalSetup() {
  process.env.AWS_REGION = REGION;
  process.env.TURBINE_TEST_TABLE = TABLE_NAME;
  await ensureTable();
}
