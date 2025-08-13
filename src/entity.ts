import { z } from "zod";
import { Entity, EntityDefinition } from "./types/entity";
import { ReturnValue } from "@aws-sdk/client-dynamodb";
import {
  generateKeyConditionExpression,
  generateUpdateExpression,
} from "./expressions";
import {
  expandPayload,
  expandPartialPayload,
  parseInstance,
  resolveKey,
  parsePagedResult,
  resolveKeyAndIndex,
} from "./parsing";

export const defineEntity = <S extends z.ZodObject>(
  definition: EntityDefinition<S>
): Entity<EntityDefinition<S>> => {
  // @ts-expect-error missing
  const entity: Entity<EntityDefinition<S>> = {};

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
    const { Key, IndexName } = await resolveKeyAndIndex(definition, key);
    const { Items, LastEvaluatedKey } = await definition.table.query({
      ...generateKeyConditionExpression(Key),
      IndexName,
      ...options,
    });

    const next = () =>
      entity.query(key, { ExclusiveStartKey: LastEvaluatedKey });

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

  entity.scan = async (options) => {
    const { Items, LastEvaluatedKey } = await definition.table.scan({
      ...options,
    });

    const next = () =>
      entity.scan({ ExclusiveStartKey: LastEvaluatedKey, ...options });

    return parsePagedResult(definition, entity, Items, LastEvaluatedKey, next);
  };

  entity.scanAll = async (options) => {
    let next = () => entity.scan(options);

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
