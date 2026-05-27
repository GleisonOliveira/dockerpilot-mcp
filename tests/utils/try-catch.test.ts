import { describe, it, expect } from "vitest";
import { tryCatch } from "../../src/utils/try-catch.js";

describe("tryCatch", () => {
  it("returns success with result when fn resolves", async () => {
    const outcome = await tryCatch(async () => 42);
    expect(outcome.success).toBe(true);
    if (outcome.success) expect(outcome.result).toBe(42);
  });

  it("returns failure with Error message when fn throws Error", async () => {
    const outcome = await tryCatch(async () => {
      throw new Error("something went wrong");
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error).toBe("something went wrong");
  });

  it("returns failure with String() when fn throws non-Error", async () => {
    const outcome = await tryCatch(async () => {
      throw "raw string error";
    });
    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error).toBe("raw string error");
  });
});
