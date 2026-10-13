import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import z from "zod";

import { defineMigrations, defineTable, Migration } from "../../src";
import { calls } from "./fixtures/calls";

const directory = path.join(__dirname, "fixtures/migrations");
const items = new Map<string, Record<string, any>>();

const send = vi.fn(async (command: any) => {
  const { Key, Item } = command.input;
  switch (command.constructor.name) {
    case "GetCommand":
      return { Item: items.get(Key.pk) };
    case "PutCommand":
      items.set(Item.pk, Item);
      return {};
    case "DeleteCommand":
      items.delete(Key.pk);
      return {};
  }
});

const table = defineTable({
  name: "test",
  documentClient: { send } as unknown as DynamoDBDocumentClient,
  indexes: { table: { hashKey: "pk", rangeKey: "sk" } },
});

const migrations = defineMigrations({ table, directory });

beforeEach(() => {
  items.clear();
  calls.length = 0;
  send.mockClear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("defineMigrations", () => {
  it("applies pending migrations in order and records them", async () => {
    await migrations.up();

    expect(calls).toEqual(["first:up", "second:up"]);
    expect(items.get("system-migration#2026-01-01-first.ts")).toMatchObject({
      id: "2026-01-01-first.ts",
      sk: "system-migration",
      appliedAt: expect.any(String),
    });
  });

  it("skips migrations that have already been applied", async () => {
    await migrations.up();
    await migrations.up();

    expect(calls).toEqual(["first:up", "second:up"]);
  });

  it("rolls back the last applied migration", async () => {
    await migrations.up();
    await migrations.down();

    expect(calls).toEqual(["first:up", "second:up", "second:down"]);
    expect(items.has("system-migration#2026-01-02-second.ts")).toBe(false);
  });

  it("redoes a specific migration by name", async () => {
    await migrations.up();
    await migrations.redo("2026-01-01-first");

    expect(calls.slice(2)).toEqual(["first:down", "first:up"]);
    expect(items.has("system-migration#2026-01-01-first.ts")).toBe(true);
  });

  it("refuses to roll back a migration that was not applied", async () => {
    await expect(migrations.down("2026-01-01-first")).rejects.toThrow(
      "has not been applied",
    );
  });

  it("uses a custom schema and keys", async () => {
    const custom = defineMigrations({
      table,
      directory,
      schema: z.object({
        id: z.string(),
        appliedBy: z.string().default("ci"),
      }),
      keys: { pk: (m) => ["migration", m.id], sk: "migration" },
    });

    await custom.up();

    expect(items.get("migration#2026-01-01-first.ts")).toEqual({
      id: "2026-01-01-first.ts",
      appliedBy: "ci",
      pk: "migration#2026-01-01-first.ts",
      sk: "migration",
    });
  });

  it("creates a new migration file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "turbine-"));
    const file = await defineMigrations({ table, directory: dir }).create(
      "2fa Backfill!",
    );

    expect(path.basename(file)).toMatch(/^\d{4}-\d{2}-\d{2}-2fa-backfill\.ts$/);
    expect(await fs.readFile(file, "utf8")).toContain(
      "export default class Migration2faBackfill extends Migration",
    );
  });

  it("sets a failing exit code when a command fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await migrations.cli(["down"]);

    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});

describe("Migration.forEachItem", () => {
  class Backfill extends Migration {
    async up() {}
    async down() {}
    run = this.forEachItem.bind(this);
  }

  it("pages through every matching item", async () => {
    send
      .mockResolvedValueOnce({
        Items: [{ id: 1 }, { id: 2 }],
        LastEvaluatedKey: { id: 2 },
      })
      .mockResolvedValueOnce({ Items: [{ id: 3 }] });

    const seen: number[] = [];
    const scanned = await new Backfill().run(
      table,
      { index: "type-sk", type: "user" },
      async (item) => {
        seen.push(item.id);
      },
    );

    expect(scanned).toBe(3);
    expect(seen).toEqual([1, 2, 3]);
    expect(send.mock.calls[0]![0].input).toMatchObject({
      TableName: "test",
      IndexName: "type-sk",
      KeyConditionExpression: "#key_type = :key_type",
      ExpressionAttributeValues: { ":key_type": "user" },
    });
    expect(send.mock.calls[1]![0].input.ExclusiveStartKey).toEqual({ id: 2 });
  });
});
