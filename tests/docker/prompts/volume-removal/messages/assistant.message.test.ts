import { describe, it, expect } from "vitest";
import { buildAssistantMessage } from "../../../../../src/docker/prompts/volume-removal/messages/assistant.message.js";

describe("buildAssistantMessage", () => {
  it("returns non-empty string", () => {
    const result = buildAssistantMessage();
    expect(result.trim()).not.toBe("");
  });

  it("returns string type", () => {
    const result = buildAssistantMessage();
    expect(typeof result).toBe("string");
  });

  it("mentions list_volumes tool", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("list_volumes");
  });

  it("mentions delete_volume tool", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("delete_volume");
  });

  it("mentions stop_containers tool", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("stop_containers");
  });

  it("mentions start_containers tool", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("start_containers");
  });

  it("mentions confirmed: true for deletion step", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("confirmed: true");
  });

  it("warns about data loss", () => {
    const result = buildAssistantMessage();
    expect(result).toMatch(/data.loss|data loss|permanently/i);
  });

  it("mentions high-risk indicators", () => {
    const result = buildAssistantMessage();
    expect(result).toContain("high-risk");
  });
});
