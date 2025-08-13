import { describe, it, expect } from "@jest/globals";
import { v4 as uuid } from "uuid";

import { post, user } from "./schema";

describe("integration: scan and get", () => {
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

    const found = await post.queryOne({ id: pId }, { IndexName: "gsi3" });
    expect(found?.title).toBe("Scan me");
  });

  it("get returns null for missing", async () => {
    const result = await user.get({ id: "missing", email: "no@no.no" });
    expect(result).toBeNull();
  });
});
