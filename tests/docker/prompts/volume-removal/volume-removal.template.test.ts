import { describe, it, expect } from "vitest";
import { buildVolumeRemovalMessages } from "../../../../src/docker/prompts/volume-removal/volume-removal.template.js";

describe("buildVolumeRemovalMessages", () => {
  it("returns two messages", () => {
    const messages = buildVolumeRemovalMessages();
    expect(messages).toHaveLength(2);
  });

  it("first message has role user with non-empty text", () => {
    const [user] = buildVolumeRemovalMessages();
    expect(user.role).toBe("user");
    expect(user.content.type).toBe("text");
    expect(user.content.text.trim()).not.toBe("");
  });

  it("second message has role assistant with non-empty text", () => {
    const [, assistant] = buildVolumeRemovalMessages();
    expect(assistant.role).toBe("assistant");
    expect(assistant.content.type).toBe("text");
    expect(assistant.content.text.trim()).not.toBe("");
  });
});
