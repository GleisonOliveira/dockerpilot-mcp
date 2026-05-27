import { describe, it, expect } from "vitest";
import { buildComposeServiceMessages } from "../../../../src/docker/prompts/compose-service/compose-service.template.js";

describe("buildComposeServiceMessages", () => {
  it("returns two messages with no args", () => {
    expect(buildComposeServiceMessages({})).toHaveLength(2);
  });

  it("first message has role user with non-empty text", () => {
    const [user] = buildComposeServiceMessages({});
    expect(user.role).toBe("user");
    expect(user.content.type).toBe("text");
    expect(user.content.text.trim()).not.toBe("");
  });

  it("second message has role assistant with non-empty text", () => {
    const [, assistant] = buildComposeServiceMessages({});
    expect(assistant.role).toBe("assistant");
    expect(assistant.content.type).toBe("text");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with service_name", () => {
    const [user, assistant] = buildComposeServiceMessages({ service_name: "api" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with service_name and action", () => {
    const [user, assistant] = buildComposeServiceMessages({ service_name: "api", action: "restart" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });
});
