import { describe, it, expect } from "vitest";
import { buildAssistantMessage } from "../../../../../src/docker/prompts/compose-service/messages/assistant.message.js";

describe("buildAssistantMessage (compose-service)", () => {
  it("returns non-empty string without args", () => {
    expect(buildAssistantMessage("", "").trim()).not.toBe("");
  });

  it("returns non-empty string with service_name", () => {
    expect(buildAssistantMessage("api", "").trim()).not.toBe("");
  });

  it("returns non-empty string with service_name and action", () => {
    expect(buildAssistantMessage("api", "restart").trim()).not.toBe("");
  });

  it("does NOT reference exec_command with a nonexistent args shape (DT3)", () => {
    const message = buildAssistantMessage("api", "");
    expect(message).not.toMatch(/tool:\s*exec_command[\s\S]*?args:\s*\{\s*command:\s*"cat"/);
    expect(message).not.toContain("exec_command");
  });

  it("orients service identification via list_containers with includeComposeMetadata (DT3)", () => {
    const message = buildAssistantMessage("api", "");
    expect(message).toContain("tool: list_containers");
    expect(message).toContain("includeComposeMetadata: true");
    expect(message).toContain("compose_metadata.service");
  });

  it("orients via MCP tools only (list/start/stop/restart/logs)", () => {
    const message = buildAssistantMessage("api", "");
    for (const tool of [
      "list_containers",
      "start_containers",
      "stop_containers",
      "restart_container",
      "container_logs",
    ]) {
      expect(message).toContain(`tool: ${tool}`);
    }
    expect(message).not.toContain("docker compose");
  });
});
