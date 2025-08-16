import { QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import { KeyDefinition } from "./key";
import { Table } from "./table";

export type EntityDefinition<S extends z.ZodObject> = {
  table: Table;
  schema: S;
  keys: Record<string, KeyDefinition<z.infer<S>>>;
};

export type PagedResult<D extends EntityDefinition<z.ZodObject>> = Instance<
  Entity<D>
>[] & {
  lastEvaluatedKey?: Record<string, any> | undefined;
  next?: () => Promise<PagedResult<D>>;
};

export enum Operator {
  Equals = "=",
  NotEquals = "<>",
  GreaterThan = ">",
  LessThan = "<",
  GreaterThanOrEquals = ">=",
  LessThanOrEquals = "<=",
  Contains = "contains",
  NotContains = "not contains",
  BeginsWith = "begins_with",
  Exists = "exists",
  NotExists = "not exists",
}

export type ExistenceOperator = Operator.Exists | Operator.NotExists;
export type ComparisonOperator = Exclude<Operator, ExistenceOperator>;

export type Filter<D extends EntityDefinition<z.ZodObject>> =
  | {
      attr: keyof z.infer<D["schema"]> & keyof D["keys"];
      op: ComparisonOperator;
      value: unknown;
    }
  | {
      attr: keyof z.infer<D["schema"]> & keyof D["keys"];
      op: ExistenceOperator;
    };

export type QueryOptions<D extends EntityDefinition<z.ZodObject>> = Omit<
  QueryCommandInput,
  | "TableName"
  | "KeyConditionExpression"
  | "ExpressionAttributeNames"
  | "ExpressionAttributeValues"
> & {
  filters?: Filter<D>[];
};

export type Entity<D extends EntityDefinition<z.ZodObject>> = {
  definition: D;
  get(key: Partial<z.infer<D["schema"]>>): Promise<Instance<Entity<D>> | null>;
  query(
    key: Partial<z.infer<D["schema"]>>,
    options?: QueryOptions<D>,
  ): Promise<PagedResult<D>>;
  queryOne(
    key: Partial<z.infer<D["schema"]>>,
    options?: QueryOptions<D>,
  ): Promise<Instance<Entity<D>> | null>;
  queryAll(
    key: Partial<z.infer<D["schema"]>>,
    options?: QueryOptions<D>,
  ): Promise<Instance<Entity<D>>[]>;
  put(
    data: Partial<z.infer<D["schema"]>> &
      Omit<z.infer<D["schema"]>, keyof D["keys"]>,
  ): Promise<Instance<Entity<D>>>;
  update(
    key: Partial<z.infer<D["schema"]>>,
    patch: Partial<z.infer<D["schema"]>>,
  ): Promise<Instance<Entity<D>>>;
};

export type Instance<E extends Entity<EntityDefinition<z.ZodObject>>> = z.infer<
  E["definition"]["schema"]
> & {
  update(
    data: Partial<z.infer<E["definition"]["schema"]>>,
  ): Promise<Instance<E>>;
};
