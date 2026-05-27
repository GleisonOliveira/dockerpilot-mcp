import { describe, it, expect } from "vitest";
import { buildUserMessage } from "../../../../../src/docker/prompts/compose-service/messages/user.message.js";

describe("buildUserMessage (compose-service)", () => {
  it("returns non-empty string without args", () => {
    expect(buildUserMessage().trim()).not.toBe("");
  });

  it("returns non-empty string with service_name", () => {
    expect(buildUserMessage("api").trim()).not.toBe("");
  });

  it("returns non-empty string with service_name and action", () => {
    expect(buildUserMessage("api", "restart").trim()).not.toBe("");
  });
});
