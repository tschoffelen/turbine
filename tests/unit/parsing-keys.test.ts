import { describe, it, expect } from "vitest";
import z from "zod";

import { defineEntity, defineTable } from "../../src";
import { resolveKey, resolveKeyAndIndex } from "../../src/parsing";

const table = defineTable({
  name: "test",
  indexes: {
    table: {
      hashKey: "pk",
      rangeKey: "sk",
    },
    gsi1: {
      hashKey: "type",
      rangeKey: "sk",
    },
  },
});

const user = defineEntity({
  table,
  schema: z.object({
    id: z.string(),
    email: z.email(),
  }),
  keys: {
    type: () => "user",
    pk: (user) => ["user", user.id],
    sk: (user) => user.email,
  },
});

describe("parsing: keys", () => {
  it("resolves key from payload", async () => {
    const keyData = { id: "123", email: "user@example.com" };
    const resolvedKey = await resolveKey(user.definition, "table", keyData);
    expect(resolvedKey).toEqual({
      pk: "user#123",
      sk: "user@example.com",
    });
  });

  it("finds key to query - table (pk+sk)", async () => {
    const keyData = { id: "123", email: "user@example.com" };
    const resolvedKey = await resolveKeyAndIndex(user.definition, keyData);
    expect(resolvedKey).toEqual({
      Key: {
        pk: "user#123",
        sk: "user@example.com",
      },
      IndexName: "table",
    });
  });

  it("finds key to query - table (pk)", async () => {
    const keyData = { id: "123" };
    const resolvedKey = await resolveKeyAndIndex(user.definition, keyData);
    expect(resolvedKey).toEqual({
      Key: {
        pk: "user#123",
      },
      IndexName: "table",
    });
  });

  it("finds key to query - gsi1", async () => {
    const keyData = { email: "user@example.com" };
    const resolvedKey = await resolveKeyAndIndex(user.definition, keyData);
    expect(resolvedKey).toEqual({
      Key: {
        type: "user",
        sk: "user@example.com",
      },
      IndexName: "gsi1",
    });
  });
});
