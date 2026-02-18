import { describe, expect, it } from "bun:test";
import { add, formatDate } from "../src/index";

describe("Shared Utilities", () => {
  it("adds two numbers correctly", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("formats date correctly", () => {
    const date = new Date("2023-10-25T12:00:00Z");
    expect(formatDate(date)).toBe("2023-10-25");
  });
});
