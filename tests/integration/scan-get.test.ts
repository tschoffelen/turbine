import { describe, it, expect } from "@jest/globals";
import { v4 as uuid } from "uuid";

import { post, user } from "./schema";

describe("integration: scan and get", () => {
  it.only("scans and scanAll returns items", async () => {
    const run = uuid();
    const u = await user.put({
      id: `${run}-u`,
      email: `${run}@example.com`,
      username: `user_${run}`,
      createdAt: new Date().toISOString(),
    });
    await post.put({
      id: `${run}-p`,
      authorId: u.id,
      title: "Scan me",
      createdAt: new Date().toISOString(),
    });

    const page = await post.scan({ Limit: 1 });
    expect(page.length).toBeGreaterThanOrEqual(1);
    const all = await post.scanAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it("get returns null for missing", async () => {
    const result = await user.get({ id: "missing", email: "no@no.no" });
    expect(result).toBeNull();
  });
});
