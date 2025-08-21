import { ReturnValue } from "@aws-sdk/client-dynamodb";
import { z } from "zod";

import {
  generateQueryExpression,
  generateUpdateExpression,
} from "./expressions";
import {
  expandPayload,
  expandPartialPayload,
  parseInstance,
  resolveKey,
  parsePagedResult,
  resolveKeyAndIndex,
  resolveIndex,
} from "./parsing";
import { Entity, EntityDefinition } from "./types/entity";

export const defineEntity = <S extends z.ZodObject>(
  definition: EntityDefinition<S>,
): Entity<EntityDefinition<S>> => {
  // @ts-expect-error missing
  const entity: Entity<EntityDefinition<S>> = {
    definition,
  };

  entity.put = async (data) => {
    const payload = await expandPayload(definition, data);
    await definition.table.put({
      Item: payload,
    });

    return parseInstance(definition, entity, payload);
  };

  entity.update = async (key, patch) => {
    const payload = await expandPartialPayload(definition, patch);
    const Key = await resolveKey(definition, "table", key);

    for (const field of Object.keys(definition.keys)) {
      if (field in payload) {
        delete payload[field];
      }
    }

    const { Attributes } = await definition.table.update({
      Key,
      ...generateUpdateExpression(payload, ["createdAt"]),
      ReturnValues: ReturnValue.ALL_NEW,
    });

    return parseInstance(definition, entity, Attributes);
  };

  entity.query = async (key, options) => {
    const [IndexName, Key] = await resolveIndex(definition, key);


    const { filters, ...dynamoDbOptions } = options || {};
    const query = generateQueryExpression(Key, filters);

    const { Items, LastEvaluatedKey } = await definition.table.query({
      ...query,
      IndexName: IndexName === "table" ? undefined : IndexName,
      ...dynamoDbOptions,
    });

    const next = () =>
      entity.query(key, { ...options, ExclusiveStartKey: LastEvaluatedKey });

    return parsePagedResult(definition, entity, Items, LastEvaluatedKey, next);
  };

  entity.queryOne = (key, options) => {
    return entity
      .query(key, { Limit: 1, ...options })
      .then((result) => result[0] || null);
  };

  entity.queryAll = async (key, options) => {
    let next = () => entity.query(key, options);

    const items: any[] = [];
    while (next) {
      const result = await next();
      items.push(...result);
      if (!result.next) break;
      next = result.next;
    }

    return items;
  };

  entity.get = async (key) => {
    const Key = await resolveKey(definition, "table", key);
    const { Item } = await definition.table.get({
      Key,
    });

    if (!Item) return null;

    return parseInstance(definition, entity, Item);
  };

  return entity;
};
