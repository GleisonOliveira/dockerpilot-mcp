import { describe, it, expect } from "vitest";
import { buildAssistantMessage } from "../../../../../src/docker/prompts/compose-service/messages/assistant.message.js";

describe("buildAssistantMessage (compose-service)", () => {
  it("returns non-empty string without args", () => {
    expect(buildAssistantMessage("", "").trim()).not.toBe("");
  });

  it("returns non-empty string with service_name", () => {
    expect(buildAssistantMessage("api", "").trim()).not.toBe("");
  });

  it("returns non-empty string with service_name and action", () => {
    expect(buildAssistantMessage("api", "restart").trim()).not.toBe("");
  });
});
