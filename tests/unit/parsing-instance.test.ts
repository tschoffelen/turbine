import { describe, it, expect } from "@jest/globals";
import z from "zod";

import { defineEntity, defineTable } from "../../src";
import { parseInstance, parsePagedResult } from "../../src/parsing";

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

describe("parsing: instance", () => {
  it("parses instance from data", async () => {
    const raw = {
      pk: "user#123",
      sk: "user@example.com",
      type: "user",
      id: "123",
      email: "user@example.com",
      unknownKey: "hi from alien",
    };

    expect(await parseInstance(user.definition, user, raw)).toEqual({
      id: "123",
      email: "user@example.com",
      update: expect.any(Function),
    });
  });

  it("parses a paged result", async () => {
    const raw = {
      Items: [
        {
          pk: "user#123",
          sk: "user@example.com",
          type: "user",
          id: "123",
          email: "user@example.com",
        },
      ],
      LastEvaluatedKey: {
        pk: "user#123",
        sk: "user@example.com",
      },
    };

    const page = await parsePagedResult(
      user.definition,
      user,
      raw.Items,
      raw.LastEvaluatedKey,
      // @ts-expect-error not assignable
      () => {},
    );
    expect(page.length).toBe(1);
    expect(page[0]).toEqual({
      id: "123",
      email: "user@example.com",
      update: expect.any(Function),
    });

    expect(page.lastEvaluatedKey).toEqual({
      pk: "user#123",
      sk: "user@example.com",
    });
    expect(page.next).toBeDefined();
  });
});
