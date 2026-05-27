import { describe, it, expect } from "vitest";
import { buildAssistantMessage } from "../../../../../src/docker/prompts/image-cleanup/messages/assistant.message.js";

describe("buildAssistantMessage", () => {
  it("returns non-empty string", () => {
    const result = buildAssistantMessage();
    expect(result.trim()).not.toBe("");
  });

  it("returns string type", () => {
    const result = buildAssistantMessage();
    expect(typeof result).toBe("string");
  });

  it("mentions prune_images tool", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("prune_images");
  });

  it("mentions confirmed: false for preview step", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("confirmed: false");
  });

  it("mentions confirmed: true for deletion step", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("confirmed: true");
  });
});
