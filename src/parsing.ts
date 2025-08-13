import { z } from "zod";
import {
  Entity,
  EntityDefinition,
  EntityInstance,
  PagedResult,
} from "./types/entity";
import { KeyDefinitionPrimitive } from "./types/key";
import { TurbineError } from "./error";

export const parsePagedResult = async <D extends EntityDefinition<z.ZodObject>>(
  definition: D,
  entity: Entity<D>,
  items: unknown[] | undefined | null,
  lastEvaluatedKey: Record<string, any> | undefined,
  next?: () => Promise<PagedResult<D>>
): Promise<PagedResult<D>> => {
  const output: PagedResult<D> = await Promise.all(
    (items || []).map((item) => parseInstance(definition, entity, item))
  );

  if (lastEvaluatedKey) {
    output.lastEvaluatedKey = lastEvaluatedKey;
    output.next = next;
  }

  return output;
};

export const resolveKey = async <S extends z.ZodObject>(
  definition: EntityDefinition<S>,
  indexName: string,
  keyData: Partial<z.infer<S>>
): Promise<Record<string, unknown>> => {
  const values = await expandPartialPayload(definition, keyData);

  const index = definition.table.definition.indexes[indexName];
  if (!index) {
    throw new TurbineError(
      `Index with name "${indexName}" is not defined in table "${definition.table.definition.name}"`
    );
  }

  const key = {};
  if (index.hashKey) {
    const hashKeyValue = values[index.hashKey];
    if (hashKeyValue === undefined || hashKeyValue === null) {
      throw new TurbineError(`No value found for "${index.hashKey}"`);
    }
    key[index.hashKey] = values[index.hashKey];
  }
  if (index.rangeKey) {
    const rangeKeyValue = values[index.rangeKey];
    if (rangeKeyValue === undefined || rangeKeyValue === null) {
      throw new TurbineError(`No value found for "${index.rangeKey}"`);
    }
    key[index.rangeKey] = values[index.rangeKey];
  }

  return key;
};

export const resolveKeyAndIndex = async <S extends z.ZodObject>(
  definition: EntityDefinition<S>,
  keyData: Partial<z.infer<S>>
): Promise<{ IndexName: string; Key: Record<string, unknown> }> => {
  const { indexes } = definition.table.definition;

  for (const IndexName of Object.keys(indexes)) {
    try {
      const Key = await resolveKey(definition, IndexName, keyData);
      return { IndexName, Key };
    } catch (e) {}
  }

  throw new TurbineError(
    `No matching index found for key data: ${JSON.stringify(keyData)}`
  );
};

export const expandPayload = async <S extends z.ZodObject>(
  definition: EntityDefinition<S>,
  data: z.infer<S>
): Promise<Partial<z.infer<S>>> => {
  const parsedData = await definition.schema.parseAsync(data);
  return {
    ...parsedData,
    ...parseKeys(definition, parsedData),
  };
};

export const expandPartialPayload = async <S extends z.ZodObject>(
  definition: EntityDefinition<S>,
  data: Partial<z.infer<S>>
): Promise<Partial<Record<string, KeyDefinitionPrimitive>>> => {
  const parsedData = await definition.schema.partial().parseAsync(data);
  return {
    ...parsedData,
    ...parseKeys(definition, parsedData),
  };
};

export const parseKeys = <S extends z.ZodObject>(
  definition: EntityDefinition<S>,
  data: Record<string, unknown>
): Partial<Record<string, KeyDefinitionPrimitive>> => {
  const keys: Partial<Record<string, KeyDefinitionPrimitive>> = {};
  for (const key in definition.keys) {
    if (typeof definition.keys[key] === "function") {
      keys[key] = definition.keys[key](data as z.infer<S>);
    } else {
      keys[key] = definition.keys[key];
    }
  }
  return keys;
};

export const parseInstance = async <D extends EntityDefinition<z.ZodObject>>(
  definition: D,
  entity: Entity<D>,
  input: unknown
): Promise<EntityInstance<D>> => {
  const result = await definition.schema.parseAsync(input);

  result.update = async (patch: Partial<z.infer<D["schema"]>>) =>
    entity.update(input as Partial<z.infer<D["schema"]>>, patch);

  return result as EntityInstance<D>;
};
