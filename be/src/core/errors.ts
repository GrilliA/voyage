export class BadInput extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadInput";
  }
}

export class NotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFound";
  }
}
