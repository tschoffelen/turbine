import { Migration } from "../../../../src";
import { calls } from "../calls";

export default class First extends Migration {
  async up() {
    calls.push("first:up");
  }

  async down() {
    calls.push("first:down");
  }
}
