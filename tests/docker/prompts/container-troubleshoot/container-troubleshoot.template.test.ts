import { describe, it, expect } from "vitest";
import { buildContainerTroubleshootMessages } from "../../../../src/docker/prompts/container-troubleshoot/container-troubleshoot.template.js";

describe("buildContainerTroubleshootMessages", () => {
  it("returns two messages with no args", () => {
    const messages = buildContainerTroubleshootMessages({});
    expect(messages).toHaveLength(2);
  });

  it("first message has role user with non-empty text", () => {
    const [user] = buildContainerTroubleshootMessages({});
    expect(user.role).toBe("user");
    expect(user.content.type).toBe("text");
    expect(user.content.text.trim()).not.toBe("");
  });

  it("second message has role assistant with non-empty text", () => {
    const [, assistant] = buildContainerTroubleshootMessages({});
    expect(assistant.role).toBe("assistant");
    expect(assistant.content.type).toBe("text");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with container_name", () => {
    const [user, assistant] = buildContainerTroubleshootMessages({ container_name: "my-container" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with symptom", () => {
    const [user, assistant] = buildContainerTroubleshootMessages({ symptom: "port conflict" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });

  it("returns non-empty texts with all args", () => {
    const [user, assistant] = buildContainerTroubleshootMessages({ container_name: "my-container", symptom: "keeps crashing" });
    expect(user.content.text.trim()).not.toBe("");
    expect(assistant.content.text.trim()).not.toBe("");
  });
});
