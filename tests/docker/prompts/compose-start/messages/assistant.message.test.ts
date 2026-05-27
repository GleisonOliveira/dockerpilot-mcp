import { describe, it, expect } from "vitest";
import { buildAssistantMessage } from "../../../../../src/docker/prompts/compose-start/messages/assistant.message.js";

describe("buildAssistantMessage (compose-start)", () => {
  it("returns non-empty string without project_dir", () => {
    expect(buildAssistantMessage("").trim()).not.toBe("");
  });

  it("returns non-empty string with project_dir", () => {
    expect(buildAssistantMessage("/home/user/myapp").trim()).not.toBe("");
  });
});
