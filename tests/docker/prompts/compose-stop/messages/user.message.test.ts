import { describe, it, expect } from "vitest";
import { buildUserMessage } from "../../../../../src/docker/prompts/compose-stop/messages/user.message.js";

describe("buildUserMessage (compose-stop)", () => {
  it("returns non-empty string without args", () => {
    expect(buildUserMessage().trim()).not.toBe("");
  });

  it("returns non-empty string with project_dir", () => {
    expect(buildUserMessage("/home/user/myapp").trim()).not.toBe("");
  });
});
