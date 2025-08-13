export class TurbineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurbineError";
  }
}
