import { describe, it, expect } from "@jest/globals";
import { v4 as uuid } from "uuid";

import { post } from "./schema";
import { Operator } from "../../src";

describe("integration: filters", () => {
  it("filters out deleted posts", async () => {
    const runId = uuid();

    await post.put({
      id: `${runId}-p1`,
      authorId: runId,
      title: `Hello World!`,
      deletedAt: new Date().toISOString(),
    });
    await post.put({
      id: `${runId}-p2`,
      authorId: runId,
      title: `Hello Moon!`,
    });

    const results = await post.queryAll(
      { authorId: runId },
      {
        filters: [
          {
            attr: "deletedAt",
            op: Operator.NotExists,
          },
        ],
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Hello Moon!");
  });

  it("filters posts by title", async () => {
    const runId = uuid();

    await post.put({
      id: `${runId}-p3`,
      authorId: runId,
      title: `Hello World!`,
    });
    await post.put({
      id: `${runId}-p4`,
      authorId: runId,
      title: `Goodbye World!`,
    });

    const results = await post.queryAll(
      { authorId: runId },
      {
        filters: [
          {
            attr: "title",
            op: Operator.BeginsWith,
            value: "Hello",
          },
        ],
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toContain("-p3");
  });
});
