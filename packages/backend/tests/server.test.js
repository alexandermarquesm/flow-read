import { describe, expect, it } from "bun:test";
import { GetWelcomeMessageUseCase } from "../src/application/use-cases/GetWelcomeMessage";
describe("Backend Use Cases", () => {
    it("should return correct welcome message", () => {
        const useCase = new GetWelcomeMessageUseCase();
        const message = useCase.execute();
        expect(message.content).toBe("Hello from Backend (Clean Architecture)!");
    });
});
