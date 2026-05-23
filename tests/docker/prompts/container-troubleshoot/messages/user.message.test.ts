import { describe, it, expect } from "vitest";
import { buildUserMessage } from "../../../../../src/docker/prompts/container-troubleshoot/messages/user.message.js";

describe("buildUserMessage", () => {
  it("returns non-empty string without args", () => {
    const result = buildUserMessage("the affected container");
    expect(result.trim()).not.toBe("");
  });

  it("returns non-empty string with container name", () => {
    const result = buildUserMessage("`my-container`");
    expect(result.trim()).not.toBe("");
  });

  it("returns non-empty string with symptom", () => {
    const result = buildUserMessage("the affected container", "container keeps crashing");
    expect(result.trim()).not.toBe("");
  });

  it("returns non-empty string with container name and symptom", () => {
    const result = buildUserMessage("`my-container`", "port already in use");
    expect(result.trim()).not.toBe("");
  });
});
