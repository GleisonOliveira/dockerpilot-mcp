import { describe, it, expect } from "vitest";
import { buildImageCleanupMessages } from "../../../../src/docker/prompts/image-cleanup/image-cleanup.template.js";

describe("buildImageCleanupMessages", () => {
  it("returns two messages", () => {
    const messages = buildImageCleanupMessages();
    expect(messages).toHaveLength(2);
  });

  it("first message has role user with non-empty text", () => {
    const [user] = buildImageCleanupMessages();
    expect(user.role).toBe("user");
    expect(user.content.type).toBe("text");
    expect(user.content.text.trim()).not.toBe("");
  });

  it("second message has role assistant with non-empty text", () => {
    const [, assistant] = buildImageCleanupMessages();
    expect(assistant.role).toBe("assistant");
    expect(assistant.content.type).toBe("text");
    expect(assistant.content.text.trim()).not.toBe("");
  });
});
