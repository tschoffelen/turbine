import { z } from "zod";

import { KeyDefinition } from "./key";
import { Table } from "./table";

export type MigrationsDefinition = {
  table: Table;
  directory?: string;
  schema?: z.ZodObject<{ id: z.ZodString }>;
  keys?: Record<string, KeyDefinition<{ id: string }>>;
};

export type Migrations = {
  up(): Promise<void>;
  down(target?: string): Promise<void>;
  redo(target?: string): Promise<void>;
  create(name: string): Promise<string>;
  cli(argv?: string[]): Promise<void>;
};
