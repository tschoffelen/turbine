import { describe, it, expect } from "@jest/globals";
import { v4 as uuid } from "uuid";

import { comment, post, user } from "./schema";

describe("integration: queries and pagination", () => {
  it("queries global feed via gsi1 and paginates", async () => {
    const run = uuid();
    const u = await user.put({
      id: `${run}-u`,
      email: `${run}@example.com`,
      username: `user_${run}`,
      createdAt: new Date().toISOString(),
    });

    // create multiple posts
    for (let i = 0; i < 4; i++) {
      await post.put({
        id: `${run}-p${i}`,
        authorId: u.id,
        title: `Post ${i}`,
        createdAt: new Date().toISOString(),
      });
      await new Promise((r) => setTimeout(r, 10));
    }

    // Do not specify IndexName so the library can auto-detect gsi1 from `type`
    const page1 = await post.query({ type: "post" }, { Limit: 2 });
    expect(page1.length).toBeLessThanOrEqual(2);
    expect(typeof page1.next === "function" || page1.next === undefined).toBe(
      true,
    );
  });

  it("queries comments on a post and uses queryOne", async () => {
    const run = uuid();
    const u = await user.put({
      id: `${run}-u`,
      email: `${run}@example.com`,
      username: `user_${run}`,
      createdAt: new Date().toISOString(),
    });
    const p = await post.put({
      id: `${run}-p`,
      authorId: u.id,
      title: "Hello",
      createdAt: new Date().toISOString(),
    });

    const c = await comment.put({
      id: `${run}-c`,
      postId: p.id,
      authorId: u.id,
      content: "Nice!",
      createdAt: new Date().toISOString(),
    });

    const found = await comment.queryOne({ postId: p.id });
    expect(found?.id).toBe(c.id);
  });
});
