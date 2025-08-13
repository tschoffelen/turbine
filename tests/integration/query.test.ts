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
    const created: string[] = [];
    for (let i = 0; i < 4; i++) {
      const p = await post.put({
        id: `${run}-p${i}`,
        authorId: u.id,
        title: `Post ${i}`,
        createdAt: new Date().toISOString(),
      });
      created.push(p.id);
      // small delay to ensure ordering uniqueness
      await new Promise((r) => setTimeout(r, 10));
    }

    const first = await post.query(
      {
        /* auto detect gsi1 via type/sk */
      },
      { IndexName: "gsi1" },
    );
    expect(first.length).toBeGreaterThan(0);

    const page1 = await post.query(
      {
        /* auto detect */
      },
      { IndexName: "gsi1", Limit: 2 },
    );
    expect(page1.length).toBeLessThanOrEqual(2);
    expect(page1.next).toBeDefined();
    const page2 = page1.next ? await page1.next() : [];
    expect(page2.length).toBeGreaterThan(0);
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
