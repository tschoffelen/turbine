import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { defineEntity } from "./entity";
import { TurbineError } from "./error";
import { Migration } from "./migration";
import { parseKeys } from "./parsing";
import { Migrations, MigrationsDefinition } from "./types/migrations";

const USAGE = `Commands:
  up                 Run all pending migrations (default)
  down [migration]   Roll back a migration (defaults to the last applied one)
  redo [migration]   Roll back and re-apply a migration (defaults to the last applied one)
  new <name>         Create a new migration file`;

const template = (
  className: string,
) => `import { Migration } from "dynamodb-turbine";

export default class ${className} extends Migration {
  public async up(): Promise<void> {
    throw new Error("Not implemented");
  }

  public async down(): Promise<void> {
    throw new Error("Not implemented");
  }
}
`;

const defaultSchema = z.object({
  id: z.string(),
  appliedAt: z.iso.datetime().optional(),
});

export const defineMigrations = ({
  table,
  directory = "./migrations",
  schema = defaultSchema,
  keys,
}: MigrationsDefinition): Migrations => {
  const { hashKey, rangeKey } = table.definition.indexes.table;

  const entity = defineEntity({
    table,
    schema: schema as typeof defaultSchema,
    keys: keys ?? {
      [hashKey]: (migration) => ["system-migration", migration.id],
      ...(rangeKey ? { [rangeKey]: "system-migration" } : {}),
    },
  });

  const keyOf = (id: string) => parseKeys(entity.definition, { id });
  const isApplied = async (id: string) => !!(await entity.get(keyOf(id)));

  const listFiles = async () =>
    (await fs.readdir(directory))
      .filter((file) => /\.[jt]s$/.test(file))
      .sort();

  const load = async (file: string): Promise<Migration> => {
    const { default: MigrationClass } = await import(
      path.resolve(directory, file)
    );
    return new MigrationClass();
  };

  const apply = async (file: string, migration: Migration) => {
    console.log(`* ${file} (applying)`);
    await migration.up();
    await entity.put({ id: file, appliedAt: new Date().toISOString() });
    console.log("  ✔ applied");
  };

  const revert = async (file: string, migration: Migration) => {
    console.log(`* ${file} (rolling back)`);
    await migration.down();
    await entity.delete(keyOf(file));
    console.log("  ✔ rolled back");
  };

  const findApplied = async (target?: string) => {
    const files = await listFiles();
    if (!target) {
      for (const file of files.reverse()) {
        if (await isApplied(file)) return file;
      }
      throw new TurbineError("No applied migrations found");
    }

    const file = files.find(
      (file) => file === target || path.parse(file).name === target,
    );
    if (!file) {
      throw new TurbineError(`Migration ${target} not found in ${directory}`);
    }
    if (!(await isApplied(file))) {
      throw new TurbineError(`Migration ${file} has not been applied`);
    }
    return file;
  };

  const up = async () => {
    for (const file of await listFiles()) {
      const migration = await load(file);
      if (!migration.alwaysRun && (await isApplied(file))) {
        console.log(`- ${file} (already applied)`);
        continue;
      }
      await apply(file, migration);
    }
  };

  const down = async (target?: string) => {
    const file = await findApplied(target);
    await revert(file, await load(file));
  };

  const redo = async (target?: string) => {
    const file = await findApplied(target);
    const migration = await load(file);
    await revert(file, migration);
    await apply(file, migration);
  };

  const create = async (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) {
      throw new TurbineError("Provide a name for the migration");
    }

    const className = slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
      .replace(/^(?=\d)/, "Migration");

    const date = new Date().toISOString().slice(0, 10);
    const file = path.resolve(directory, `${date}-${slug}.ts`);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(file, template(className), { flag: "wx" });
    console.log(`Created ${file}`);
    return file;
  };

  const cli = async (
    [command = "up", arg]: string[] = process.argv.slice(2),
  ) => {
    const commands: Record<string, () => Promise<unknown>> = {
      up,
      down: () => down(arg),
      redo: () => redo(arg),
      new: () => create(arg ?? ""),
    };

    if (command === "--help" || command === "-h") {
      console.log(USAGE);
      return;
    }

    const run = commands[command];
    if (!run) {
      console.error(`Unknown command: ${command}\n\n${USAGE}`);
      process.exitCode = 1;
      return;
    }

    try {
      await run();
    } catch (error) {
      console.error(error instanceof TurbineError ? error.message : error);
      process.exitCode = 1;
    }
  };

  return { up, down, redo, create, cli };
};
