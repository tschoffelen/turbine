# Turbine 🪭

[![NPM](https://img.shields.io/npm/v/dynamodb-turbine)](https://npmjs.com/package/dynamodb-turbine) ![License](https://img.shields.io/npm/l/dynamodb-turbine)

Entity mapping and query helpers for DynamoDB using Zod schemas and the AWS SDK v3. Define your table and entities once, then put, get, update, and query with type-safe objects.

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

// Or entity-level update (keys must be specified precisely)
await users.update(
  { pk: ["user", user.id], sk: user.email },
  { email: "randy@example.com" },
);

// Lookups - keys must be specified precisely
const byPrimaryKey = await users.get({ pk: ["user", user.id], sk: user.email });
const one = await users.queryOne({
  pk: ["user", user.id],
  sk: { beginsWith: "user@" },
});
const all = await users.queryAll({ pk: ["user", user.id] });
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
- get(key): requires key specification using actual key names (e.g., `pk`, `sk`), reads, returns instance or null.
- update(key, patch): requires key specification, validates/expands, updates, and returns the new instance.
- query(key, options?): requires key specification; supports partial expressions like `{beginsWith: "prefix"}`. Returns a paged array with `lastEvaluatedKey` and `next()`.
- queryOne(key, options?): first match or null.
- queryAll(key, options?): collects all pages for convenience.
- delete(key): requires key specification, deletes the item.

### Key Specification

Keys must be specified precisely using the actual key names defined in your entity. Key arrays are automatically converted to strings joined with `#`.

```ts
// Get with precise keys
await users.get({ pk: ["user", "123"], sk: "user@example.com" });

// Query with complex key expressions and custom indexes
await posts.query({
  index: "type-sk",
  type: "comment",
  sk: { beginsWith: "user#123#" },
});
```

Query options match DynamoDB’s `QueryCommandInput` (minus the expression fields that Turbine builds for you), so you can set things like `Limit`, `ExclusiveStartKey`, `ScanIndexForward`, `ConsistentRead`, etc.

## Types and validation

- Inputs are validated by your Zod schema (defaults apply too).
- Returned instances are typed and include an `update(patch)` helper that delegates to `entity.update`.

## Error handling

Invalid input or unresolved keys throw an error. Ensure required fields for the index you target are provided (for example, missing `pk` or `sk` parts in your derived keys).
