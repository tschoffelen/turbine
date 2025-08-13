# Turbine 🪭

Entity mapping and query helpers for DynamoDB using Zod schemas and the AWS SDK v3. Define your table and entities once, then put, get, update, query, and scan with type-safe objects.

- Small, direct, and type-friendly
- Derive keys and computed fields from your data
- Works with your existing DynamoDB DocumentClient

## Getting started

Install the package, and `zod`:

```sh
npm install dynamodb-turbine zod
# or
yarn add dynamodb-turbine zod
```

Then start using it in your code:

```ts
import z from "zod";
import { defineTable, defineEntity } from "dynamodb-turbine";

// 1) Define your table and indexes
const table = defineTable({
  name: "my-dynamodb-table",
  indexes: {
    // Required main index named "table"
    table: { hashKey: "pk", rangeKey: "sk" },

    // Optional GSIs
    type_sk: { hashKey: "type", rangeKey: "sk" },
    sk_pk: { hashKey: "sk", rangeKey: "pk" },
  },
});

// 2) Define an entity
const users = defineEntity({
  table,
  schema: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string().optional(),
    createdAt: z.iso.datetime().optional(),
    updatedAt: z.iso.datetime().optional(),
  }),
  // Compute keys/fields from the input data
  keys: {
    pk: (u) => ["user", u.id], // becomes `user#{id}`
    sk: (u) => u.email,
    createdAt: (u) => u.createdAt || new Date().toISOString(),
    updatedAt: () => new Date().toISOString(),
  },
});

// 3) Use it
const user = await users.put({
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@example.com",
});

// Instance-level update for convenience
await user.update({ name: "Randy Newman" });

// Or entity-level update
await users.update({ id: user.id }, { email: "randy@example.com" });

// Lookups
const byPrimaryKey = await users.get({ id: user.id });
const one = await users.queryOne({ email: "randy@example.com" });
const all = await users.queryAll({ email: "randy@example.com" });

// Scans and pagination
const page1 = await users.scan({ Limit: 25 });
if (page1.next) {
  const page2 = await page1.next();
}
```

## Defining tables

- You must define at least one index named `table`. This specifies the primary keys for your default index.
- The `hashKey` and optional `rangeKey` must match the attribute names you’ll store on items (for example `pk`/`sk`).
- You can add GSIs by name. Use those attribute names in your entity key derivations.

Optionally pass your own `DynamoDBDocumentClient` via `documentClient` to reuse configuration. By default, a client is created with `convertEmptyValues: true` and `removeUndefinedValues: true`.

```ts
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient());

const table = defineTable({
  name: "my-dynamodb-table",
  documentClient,
  indexes: { table: { hashKey: "pk", rangeKey: "sk" } },
});
```

## Defining entities

- `schema` is a Zod object. It drives validation and types.
- `keys` derives fields that are written to the item (e.g. `pk`, `sk`, `type`, timestamps).
    - A key value can be a string, a function, or an array of parts; arrays join with `#`.

Example:

```ts
const user = defineEntity({
  table,
  schema: z.object({
    id: z.string(),
    email: z.email(),
  }),
  keys: {
    type: () => "user",
    pk: (u) => ["user", u.id], // => "user#123"
    sk: (u) => u.email,
  },
});
```

## Operations

- put(data): validates with Zod, expands keys, writes, and returns the parsed instance.
- get(key): resolves the table key from partial data, reads, returns instance or null.
- update(key, patch): validates/expands, updates, and returns the new instance.
- query(key, options?): chooses an index based on the key shape; pass `IndexName` in options to override. Returns a paged array with `lastEvaluatedKey` and `next()`.
- queryOne(key, options?): first match or null.
- queryAll(key, options?): collects all pages for convenience.
- scan(options?): paged scan.
- scanAll(options?): collects all pages.

Query options match DynamoDB’s `QueryCommandInput` (minus the expression fields that Turbine builds for you), so you can set things like `Limit`, `ExclusiveStartKey`, `ScanIndexForward`, `ConsistentRead`, etc.

## Index selection

When you call `query(key)`, Turbine tries to resolve the best index using your `keys` definitions. Provide a more complete key (e.g. both `hashKey` and `rangeKey`) for more precise queries. To force a specific index:

```ts
await users.query({ email: "randy@example.com" }, { IndexName: "type_sk" });
```

## Types and validation

- Inputs are validated by your Zod schema (defaults apply too).
- Returned instances are typed and include an `update(patch)` helper that delegates to `entity.update`.

## Error handling

Invalid input or unresolved keys throw an error. Ensure required fields for the index you target are provided (for example, missing `pk` or `sk` parts in your derived keys).
