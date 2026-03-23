export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor() {
    super("This email is already registered. Please sign in instead.");
    this.name = "UserAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}
