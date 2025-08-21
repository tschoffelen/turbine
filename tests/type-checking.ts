import { z } from "zod";

import { defineTable, defineEntity } from "../src";

const table = defineTable({
  name: "my-dynamodb-table",
  indexes: {
    table: {
      hashKey: "pk",
      rangeKey: "sk",
    },
    type_sk: {
      hashKey: "type",
      rangeKey: "sk",
    },
    sk_pk: {
      hashKey: "sk",
      rangeKey: "pk",
    },
  },
});

const users = defineEntity({
  table,
  schema: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string().optional(),
    createdAt: z.iso.datetime().optional(),
    updatedAt: z.iso.datetime().optional(),
  }),
  keys: {
    pk: (user) => ["user", user.id], // turns into `user#{id}`
    sk: (user) => user.email,
    createdAt: (user) => user.createdAt || new Date().toISOString(),
    updatedAt: () => new Date().toISOString(),
  },
});

(async () => {
  const newUser = await users.put({
    id: "00000000-0000-0000-0000-000000000001",
    email: "user@example.com",
  });

  const updatedUser = await newUser.update({
    name: "Randy Newman",
  });

  console.log(newUser);
  console.log(newUser.email);
  console.log(updatedUser.name);

  await users.update(
    {
      id: "00000000-0000-0000-0000-000000000001",
    },
    {
      email: "randy@example.com",
    },
  );

  const randy = await users.get({
    id: "00000000-0000-0000-0000-000000000001",
  });

  console.log(randy?.email);

  const randyByEmail = await users.queryOne({
    email: "randy@example.com",
  });

  console.log(randyByEmail?.name);

  const allRandys = await users.queryAll({
    index: "type_ssssssss",
    email: "randy@example.com",
  });

  console.log(allRandys.length);

  const firstPageOfUsers = await users.query({ email: "randy@example.com" });
  console.log(firstPageOfUsers.length);
  console.log(firstPageOfUsers[0]?.name);
  const secondPageOfUsers = await firstPageOfUsers.next!();
  console.log(secondPageOfUsers.length);
  console.log(secondPageOfUsers[0]?.name);

  const randomQuery = await users.query(
    {
      email: "random@example.com",
    },
    {
      Limit: 10,
    },
  );
  console.log(randomQuery.length);

  const allUsers = await users.queryAll({ email: "someone@example.com" });
  console.log(allUsers.length);
  console.log(allUsers[0]?.name);
})();
