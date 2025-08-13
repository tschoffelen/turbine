import { describe, it, expect, beforeAll } from "@jest/globals";
import { v4 as uuid } from "uuid";

import { like, post, table, user } from "./schema";
import { resolveKey } from "../../src/parsing";

const runId = uuid();

describe("integration: CRUD", () => {
  let uId: string = uuid();
  let pId: string = uuid();

  beforeAll(() => {
    // sanity
    expect(!!process.env.TURBINE_TEST_TABLE).toBe(true);
  });

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

  it("creates a post and queries by user timeline", async () => {
    pId = `${runId}-p1`;
    const created = await post.put({
      id: pId,
      authorId: uId,
      title: `Hello ${pId}`,
      createdAt: new Date().toISOString(),
    });
    expect(created.id).toBe(pId);
    

    const page = await post.query({ authorId: uId });
    expect(page.length).toBeGreaterThanOrEqual(1);
    expect(page[0].title).toContain(pId);
  });

  it("likes a post and queries likes by post and user", async () => {
    const l1 = await like.put({
      userId: uId,
      postId: pId,
      createdAt: new Date().toISOString(),
    });
    expect(l1.postId).toBe(pId);

    const byPost = await like.query({ postId: pId });
    expect(byPost.length).toBeGreaterThanOrEqual(1);

    const byUser = await like.query({ userId: uId }, { IndexName: "gsi1" });
    expect(byUser.length).toBeGreaterThanOrEqual(1);
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
