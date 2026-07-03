# Changelog

## Unreleased

### Breaking changes

- **`keys` renamed to `computed`**: The `keys` property of `defineEntity` is now called `computed` (and is optional). The `KeyDefinition*` types have been replaced by `ComputedFieldDefinition` and related types.
- **Computed fields must be declared in the schema**: Written items are now validated against the full schema after computed values are merged in, so every computed field (e.g. `pk`, `sk`, GSI keys) must be part of the Zod schema. Instances returned from reads now include these fields.
- **Strictly typed keys and indexes**: `defineTable` now infers the literal hash/range key names for the table and each GSI. Query keys are checked per index (passing `index: "gsi1"` only allows that index's key names), and `get`, `update` and `delete` keys only accept exact values or `{ equals: ... }` expressions.
- **Update patch precedence**: Values explicitly provided in an `update()` patch now take precedence over computed values. Previously the computed value always won.

### New features

- **Condition expressions**: `put`, `update` and `delete` now accept a `conditions` option, using the same syntax as query filters, which is translated into a DynamoDB `ConditionExpression`.
- **`and`/`or` filter groups**: Filters and conditions can be nested boolean groups, e.g. `{ or: [{ status: "draft" }, { and: [{ views: { greaterThan: 100 } }, { deletedAt: { notExists: true } }] }] }`.
- **Nested filter paths**: Filters and conditions can target nested attributes using dot notation, e.g. `{ "metadata.category": { equals: "tech" } }`, with type-safe path suggestions up to three levels deep.
- **`strictReads` option**: `defineEntity({ ..., strictReads: true })` makes reads throw when a stored item contains keys that aren't in the schema. Defaults to `false`, where unknown keys are silently stripped.
- **Schema input types for `put()`**: `put` now accepts the schema's input type (`z.input`), so fields with defaults or transforms no longer need to be provided.

### Other changes

- Filter expression generation was rewritten with unique value placeholders, so the same attribute can safely appear in multiple conditions across filter groups.
- Added a unit test suite covering generated DynamoDB command inputs, plus integration tests for conditions and nested filters.

### Migration guide

Rename `keys` to `computed` and declare the computed fields in your schema:

Before:

```ts
const users = defineEntity({
  table,
  schema: z.object({
    id: z.string(),
    email: z.string().email(),
  }),
  keys: {
    pk: (user) => ["user", user.id],
    sk: (user) => user.email,
  },
});
```

After:

```ts
const users = defineEntity({
  table,
  schema: z.object({
    id: z.string(),
    email: z.string().email(),
    // Computed fields are now part of the schema
    pk: z.string(),
    sk: z.string(),
  }),
  computed: {
    pk: (user) => ["user", user.id],
    sk: (user) => user.email,
  },
});
```


## 1.5.0 (2025-08-21)

### Breaking changes

- **Key specification**: Keys must now be specified precisely using the actual key names defined in your entity (e.g., `pk`, `sk`).
- **Auto resolution**: Removed auto-resolution of key expressions from entity fields. You must use the exact key names.
- **Key arrays**: Added support for specifying keys as arrays, which are automatically joined with `#`.
- **Partial key expressions**: Added support for partial key expressions like `{beginsWith: "prefix"}`, `{between: [a, b]}`.
- **New filter syntax**: Introduced a new filter syntax for more complex queries.

### Migration guide

Before:

```ts
await users.get({ id: "123" });
await users.update({ id: "123" }, { email: "new@example.com" });
await posts.query({ authorId: "123" });
await posts.query(
  { authorId: "123" },
  { filter: [{ attr: "deletedAt", op: Operations.NotExists }] },
);
```

After:

```ts
await users.get({ pk: ["user", "123"], sk: "user@example.com" });
await users.update(
  { pk: ["user", "123"], sk: "user@example.com" },
  { email: "new@example.com" },
);
await posts.query({ pk: ["user", "123"] });
await comments.query({ pk: ["post", "123"], sk: { beginsWith: "comment#" } });
await posts.query(
  { pk: ["user", "123"] },
  { filter: { deletedAt: { notExists: true } } },
);
```
