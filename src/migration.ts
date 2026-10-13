import { generateQueryExpression } from "./expressions";
import { RangeKeyConditionExpression } from "./types/entity";
import { Table } from "./types/table";

export type ItemsQuery = { index?: string } & Record<
  string,
  RangeKeyConditionExpression
>;

export abstract class Migration {
  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  /**
   * Run this migration on every `up`, even if it has already been applied.
   */
  alwaysRun = false;

  /**
   * Run the callback for every raw item matching the key condition, processing
   * up to `concurrency` items at a time. Returns the number of items scanned.
   */
  protected async forEachItem(
    table: Table,
    { index, ...key }: ItemsQuery,
    callback: (item: Record<string, any>) => Promise<unknown>,
    { concurrency = 25 }: { concurrency?: number } = {},
  ): Promise<number> {
    let scanned = 0;
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const page = await table.query({
        ...generateQueryExpression(key),
        IndexName: index,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const queue = [...(page.Items ?? [])];
      scanned += queue.length;

      const worker = async () => {
        while (queue.length > 0) {
          await callback(queue.shift()!);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, worker),
      );

      console.log(`  Processed ${scanned} items`);
      lastEvaluatedKey = page.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return scanned;
  }

  protected isConditionalCheckFailure(error: unknown): boolean {
    return (
      error instanceof Error && error.name === "ConditionalCheckFailedException"
    );
  }
}
