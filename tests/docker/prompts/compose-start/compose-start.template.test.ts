import { describe, it, expect } from "vitest";
import { buildComposeStartMessages } from "../../../../src/docker/prompts/compose-start/compose-start.template.js";

describe("buildComposeStartMessages", () => {
  it("returns two messages with no args", () => {
    expect(buildComposeStartMessages({})).toHaveLength(2);
  });

  it("first message has role user with non-empty text", () => {
    const [user] = buildComposeStartMessages({});
    expect(user.role).toBe("user");
    expect(user.content.type).toBe("text");
    expect(user.content.text.trim()).not.toBe("");
  });

  it("second message has role assistant with non-empty text", () => {
    const [, assistant] = buildComposeStartMessages({});
    expect(assistant.role).toBe("assistant");
    expect(assistant.content.type).toBe("text");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with project_dir", () => {
    const [user, assistant] = buildComposeStartMessages({ project_dir: "/home/user/myapp" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });
});
