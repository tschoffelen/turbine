# Changelog

## 1.5.0 (2025-08-21)

### Breaking Changes

- **Key specification**: Keys must now be specified precisely using the actual key names defined in your entity (e.g., `pk`, `sk`).
- **Auto resolution**: Removed auto-resolution of key expressions from entity fields. You must use the exact key names.
- **Key arrays**: Added support for specifying keys as arrays, which are automatically joined with `#`.
- **Partial key expressions**: Added support for partial key expressions like `{beginsWith: "prefix"}`, `{between: [a, b]}`.
- **New filter syntax**: Introduced a new filter syntax for more complex queries.

### Migration Guide

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
