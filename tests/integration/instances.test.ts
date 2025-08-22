import { v4 as uuid } from "uuid";
import { describe, it, expect } from "vitest";

import { post } from "./schema";

describe("integration: instances", () => {
  it("creates a post and can retrieve via id index, then update it", async () => {
    const id = uuid();
    await post.put({
      id,
      authorId: "me",
      title: "Read me",
      createdAt: new Date().toISOString(),
    });

    const found = await post.queryOne({
      index: "gsi3",
      gsi2pk: "post#id",
      gsi2sk: id,
    });
    expect(found?.title).toBe("Read me");

    await found?.update({
      title: "Don't read me",
    });
    expect(found?.title).toBe("Don't read me");

    await found?.update({
      title: "Read me again",
    });

    const found2 = await post.queryOne({
      index: "gsi3",
      gsi2pk: "post#id",
      gsi2sk: id,
    });
    expect(found2?.title).toBe("Read me again");
  });
});
