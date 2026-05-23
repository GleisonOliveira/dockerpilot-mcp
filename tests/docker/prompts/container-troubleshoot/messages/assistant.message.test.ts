import { describe, it, expect } from "vitest";
import { buildAssistantMessage } from "../../../../../src/docker/prompts/container-troubleshoot/messages/assistant.message.js";

describe("buildAssistantMessage", () => {
  it("returns non-empty string with default refs", () => {
    const result = buildAssistantMessage("the affected container", "<name>");
    expect(result.trim()).not.toBe("");
  });

  it("returns non-empty string with container name", () => {
    const result = buildAssistantMessage("`my-container`", "my-container");
    expect(result.trim()).not.toBe("");
  });
});
