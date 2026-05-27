import { describe, it, expect } from "vitest";
import { buildComposeRestartMessages } from "../../../../src/docker/prompts/compose-restart/compose-restart.template.js";

describe("buildComposeRestartMessages", () => {
  it("returns two messages with no args", () => {
    expect(buildComposeRestartMessages({})).toHaveLength(2);
  });

  it("first message has role user with non-empty text", () => {
    const [user] = buildComposeRestartMessages({});
    expect(user.role).toBe("user");
    expect(user.content.type).toBe("text");
    expect(user.content.text.trim()).not.toBe("");
  });

  it("second message has role assistant with non-empty text", () => {
    const [, assistant] = buildComposeRestartMessages({});
    expect(assistant.role).toBe("assistant");
    expect(assistant.content.type).toBe("text");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with project_dir", () => {
    const [user, assistant] = buildComposeRestartMessages({ project_dir: "/home/user/myapp" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });
});
