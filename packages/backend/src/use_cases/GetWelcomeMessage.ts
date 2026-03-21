import { Message } from "../domain/entities/Message";

export class GetWelcomeMessageUseCase {
  execute(): Message {
    return new Message("Hello from Backend (Clean Architecture)!");
  }
}
