import { describe, it, expect, vi, afterEach } from "vitest";
import z from "zod";

import { defineEntity, defineTable } from "../../src";

const table = defineTable({
  name: "test",
  indexes: {
    table: { hashKey: "pk", rangeKey: "sk" },
  },
});

const schema = z.object({
  id: z.string(),
  name: z.string(),
  pk: z.string(),
  sk: z.string(),
});

const storedItem = {
  pk: "user#123",
  sk: "profile",
  id: "123",
  name: "Ada",
};

const key = { pk: "user#123", sk: "profile" };

const mockStoredItem = (item: object) => {
  vi.spyOn(table.client, "send").mockResolvedValue({
    Item: item,
    Items: [item],
  } as never);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("strictReads", () => {
  it("strips unknown keys on read by default", async () => {
    const users = defineEntity({ table, schema });
    mockStoredItem({ ...storedItem, legacyField: "not in the schema" });

    const user = await users.get(key);

    expect(user).toEqual({ ...storedItem, update: expect.any(Function) });
  });

  it("strips unknown keys on read when strictReads is false", async () => {
    const users = defineEntity({ table, schema, strictReads: false });
    mockStoredItem({ ...storedItem, legacyField: "not in the schema" });

    const user = await users.get(key);

    expect(user).toEqual({ ...storedItem, update: expect.any(Function) });
  });

  it("strips unknown keys even on strict schemas", async () => {
    const users = defineEntity({
      table,
      schema: z.strictObject({
        id: z.string(),
        name: z.string(),
        pk: z.string(),
        sk: z.string(),
      }),
      strictReads: false,
    });
    mockStoredItem({ ...storedItem, legacyField: "not in the schema" });

    const user = await users.get(key);

    expect(user).toEqual({ ...storedItem, update: expect.any(Function) });
  });

  it("throws on unknown keys when strictReads is true", async () => {
    const users = defineEntity({ table, schema, strictReads: true });
    mockStoredItem({ ...storedItem, legacyField: "not in the schema" });

    await expect(users.get(key)).rejects.toThrow(/unrecognized key/i);
  });

  it("reads items that match the schema when strictReads is true", async () => {
    const users = defineEntity({ table, schema, strictReads: true });
    mockStoredItem(storedItem);

    const user = await users.get(key);

    expect(user).toEqual({ ...storedItem, update: expect.any(Function) });
  });

  it("applies strictReads to query results", async () => {
    const users = defineEntity({ table, schema, strictReads: true });
    mockStoredItem({ ...storedItem, legacyField: "not in the schema" });

    await expect(users.query({ pk: "user#123" })).rejects.toThrow(
      /unrecognized key/i,
    );
  });
});
