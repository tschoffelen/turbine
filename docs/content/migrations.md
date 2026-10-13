+++
title = "Migrations"
+++

Turbine includes a small runner for data migrations: backfills, seed data and attribute cleanups. Migrations are files in a directory, run in filename order, and every applied migration is recorded as an item in your table.

## Setup

Create a script that defines your migrations and hands the command line to `cli()`:

```typescript
// scripts/migrate.ts
import { defineMigrations } from "dynamodb-turbine";

import { table } from "../src/table";

defineMigrations({ table, directory: "./migrations" }).cli();
```

Run it with [tsx](https://tsx.is) so TypeScript migration files can be loaded:

```bash
npx tsx scripts/migrate.ts                 # run all pending migrations
npx tsx scripts/migrate.ts down            # roll back the last applied migration
npx tsx scripts/migrate.ts down 2026-01-15-add-user-type
npx tsx scripts/migrate.ts redo            # roll back and re-apply the last one
npx tsx scripts/migrate.ts new "add user type"
```

`new` creates a date-prefixed file such as `migrations/2026-01-15-add-user-type.ts`.

## Writing migrations

A migration default-exports a class extending `Migration`:

```typescript
import { Migration } from "dynamodb-turbine";

import { table } from "../src/table";

export default class AddUserType extends Migration {
  async up() {
    await this.forEachItem(table, { index: "type-sk", type: "user" }, (item) =>
      table.update({
        Key: { pk: item.pk, sk: item.sk },
        UpdateExpression: "SET #userType = :userType",
        ExpressionAttributeNames: { "#userType": "userType" },
        ExpressionAttributeValues: { ":userType": "member" },
      }),
    );
  }

  async down() {
    // revert the change
  }
}
```

The `Migration` base class provides:

| Member | Description |
|--------|-------------|
| `forEachItem(table, key, callback, { concurrency })` | Pages through all raw items matching the key condition and runs the callback for each, up to `concurrency` (default 25) at a time. Returns the number of items scanned. |
| `isConditionalCheckFailure(error)` | Whether an error is a `ConditionalCheckFailedException`. |
| `alwaysRun` | Set to `true` to run the migration on every `up`, even when it has been applied before. It must then be idempotent. |

The `key` for `forEachItem` uses the same syntax as [entity queries](/querying): an optional `index` name plus key conditions such as `{ sk: { beginsWith: "user#" } }`.

## Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `table` | `Table` | | The table to record applied migrations in |
| `directory` | `string` | `"./migrations"` | Where migration files live (`.ts` and `.js`) |
| `schema` | `ZodObject` | `{ id, appliedAt }` | Schema for the migration records |
| `keys` | `object` | see below | Key definitions for the migration records |

By default, a migration is stored with your table's hash key set to `system-migration#<filename>` and its range key (if any) set to `system-migration`.

### Custom schema and keys

Pass `schema` and `keys` to change how applied migrations are stored, for example to record who ran them or to make them show up in a GSI:

```typescript
defineMigrations({
  table,
  schema: z.object({
    id: z.string(),
    appliedAt: z.iso.datetime(),
    appliedBy: z.string().default(() => process.env.USER ?? "unknown"),
  }),
  keys: {
    pk: (migration) => ["migration", migration.id],
    sk: "migration",
    type: "migration",
  },
});
```

The schema must include an `id` field, which holds the migration's filename. The runner sets `appliedAt` when it records a migration; any other fields need a default. The table keys must be derivable from `id` alone, because that is all the runner has when it looks a migration up.

## Programmatic use

Besides `cli()`, the object returned by `defineMigrations` exposes each command directly, which is useful in deploy scripts or tests:

```typescript
const migrations = defineMigrations({ table });

await migrations.up();
await migrations.down("2026-01-15-add-user-type");
await migrations.redo();
await migrations.create("backfill emails");
```

These throw on failure, where `cli()` prints the error and sets a non-zero exit code.
