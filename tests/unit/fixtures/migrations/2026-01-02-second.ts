import { Migration } from "../../../../src";
import { calls } from "../calls";

export default class Second extends Migration {
  async up() {
    calls.push("second:up");
  }

  async down() {
    calls.push("second:down");
  }
}
