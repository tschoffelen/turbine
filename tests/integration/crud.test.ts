import { v4 as uuid } from "uuid";
import { describe, it, expect } from "vitest";

import { like, post, table, user } from "./schema";
import { resolveKey } from "../../src/parsing";

const runId = uuid();

describe("integration: CRUD", () => {
  let uId: string = uuid();
  let pId: string = uuid();

  it("creates and gets a user", async () => {
    uId = `${runId}-u1`;
    const created = await user.put({
      id: uId,
      email: `${uId}@example.com`,
      username: `user_${uId}`,
      createdAt: new Date().toISOString(),
    });

    expect(created.id).toBe(uId);

    const fetched = await user.get({ id: uId, email: `${uId}@example.com` });
    expect(fetched?.username).toBe(`user_${uId}`);
  });

  it("updates an entity (user)", async () => {
    const updated = await user.update(
      { id: uId, email: `${uId}@example.com` },
      { username: `updated_${uId}` },
    );
    expect(updated.username).toBe(`updated_${uId}`);
  });

  it("creates a post and queries it by id (gsi3)", async () => {
    pId = `${runId}-p1`;
    const created = await post.put({
      id: pId,
      authorId: uId,
      title: `Hello ${pId}`,
      createdAt: new Date().toISOString(),
    });
    expect(created.id).toBe(pId);

    // Query post by id using the id-based index
    const found = await post.queryOne({ id: pId }, { IndexName: "gsi3" });
    expect(found?.id).toBe(pId);
  });

  it("likes a post and can find it among likes", async () => {
    const l1 = await like.put({
      userId: uId,
      postId: pId,
      createdAt: new Date().toISOString(),
    });
    expect(l1.postId).toBe(pId);

    // Without specifying IndexName, auto-detect will choose gsi1 (type/sk),
    // which returns all likes; ensure ours is present.
    const likes = await like.query({});
    expect(likes.some((x) => x.userId === uId && x.postId === pId)).toBe(true);
  });

  it("deletes a user item", async () => {
    const Key = await resolveKey(user.definition, "table", {
      id: uId,
      email: `${uId}@example.com`,
    });
    await table.delete({ Key });

    const fetched = await user.get({ id: uId, email: `${uId}@example.com` });
    expect(fetched).toBeNull();
  });
});
