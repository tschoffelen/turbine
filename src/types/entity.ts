import { z } from "zod";
import { KeyDefinition } from "./key";
import { Table } from "./table";
import { QueryCommandInput, ScanCommandInput } from "@aws-sdk/lib-dynamodb";

export type EntityDefinition<S extends z.ZodObject> = {
  table: Table;
  schema: S;
  keys: Record<string, KeyDefinition<z.infer<S>>>;
};

export type PagedResult<D extends EntityDefinition<z.ZodObject>> =
  EntityInstance<D>[] & {
    lastEvaluatedKey?: Record<string, any> | undefined;
    next?: () => Promise<PagedResult<D>>;
  };

export type QueryOptions = Omit<
  QueryCommandInput,
  | "TableName"
  | "IndexName"
  | "KeyConditionExpression"
  | "ExpressionAttributeNames"
  | "ExpressionAttributeValues"
>;

export type ScanOptions = Omit<ScanCommandInput, "TableName">;

export type Entity<D extends EntityDefinition<z.ZodObject>> = {
  get(key: Partial<z.infer<D["schema"]>>): Promise<EntityInstance<D> | null>;
  query(
    key: Partial<z.infer<D["schema"]>>,
    options?: QueryOptions
  ): Promise<PagedResult<D>>;
  queryOne(
    key: Partial<z.infer<D["schema"]>>,
    options?: QueryOptions
  ): Promise<EntityInstance<D> | null>;
  queryAll(
    key: Partial<z.infer<D["schema"]>>,
    options?: QueryOptions
  ): Promise<EntityInstance<D>[]>;
  scan(options?: ScanOptions): Promise<PagedResult<D>>;
  scanAll(options?: ScanOptions): Promise<EntityInstance<D>[]>;
  put(data: z.infer<D["schema"]>): Promise<EntityInstance<D>>;
  update(
    key: Partial<z.infer<D["schema"]>>,
    patch: Partial<z.infer<D["schema"]>>
  ): Promise<EntityInstance<D>>;
};

export type EntityInstance<D extends EntityDefinition<z.ZodObject>> = z.infer<
  D["schema"]
> & {
  update(data: Partial<z.infer<D["schema"]>>): Promise<EntityInstance<D>>;
};
