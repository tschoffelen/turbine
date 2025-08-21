import { v4 as uuid } from "uuid";
import { describe, it, expect } from "vitest";

import { post, user } from "./schema";

describe("integration: get", () => {
  it("creates a post and can retrieve via id index", async () => {
    const run = uuid();
    const u = await user.put({
      id: `${run}-u`,
      email: `${run}@example.com`,
      username: `user_${run}`,
      createdAt: new Date().toISOString(),
    });
    const pId = `${run}-p`;
    await post.put({
      id: pId,
      authorId: u.id,
      title: "Scan me",
      createdAt: new Date().toISOString(),
    });

    const found = await post.queryOne({
      index: "gsi3",
      gsi2pk: "post#id",
      gsi2sk: pId,
    });
    expect(found?.title).toBe("Scan me");
  });

  it("get returns null for missing", async () => {
    const result = await user.get({
      pk: ["user", "missing"],
      sk: ["user", "no@no.no"],
    });
    expect(result).toBeNull();
  });
});
