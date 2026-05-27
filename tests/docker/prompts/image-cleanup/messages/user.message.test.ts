import { describe, it, expect } from "vitest";
import { buildUserMessage } from "../../../../../src/docker/prompts/image-cleanup/messages/user.message.js";

describe("buildUserMessage", () => {
  it("returns non-empty string", () => {
    const result = buildUserMessage();
    expect(result.trim()).not.toBe("");
  });

  it("returns string type", () => {
    const result = buildUserMessage();
    expect(typeof result).toBe("string");
  });
});
