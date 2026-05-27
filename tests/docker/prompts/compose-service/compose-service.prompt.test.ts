import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ComposeServicePrompt } from "../../../../src/docker/prompts/compose-service/compose-service.prompt.js";

function makeMockServer() {
  return { registerPrompt: vi.fn() } as unknown as McpServer;
}

describe("ComposeServicePrompt", () => {
  it("registers prompt with name compose_service", () => {
    const server = makeMockServer();
    new ComposeServicePrompt().register(server);
    expect(server.registerPrompt).toHaveBeenCalledOnce();
    expect(server.registerPrompt).toHaveBeenCalledWith("compose_service", expect.any(Object), expect.any(Function));
  });

  it("callback returns messages array without args", () => {
    const server = makeMockServer();
    new ComposeServicePrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({}) as { messages: unknown[] };
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("callback returns messages with service_name and action", () => {
    const server = makeMockServer();
    new ComposeServicePrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as (args: Record<string, unknown>) => unknown;
    const result = callback({ service_name: "api", action: "restart" }) as { messages: unknown[] };
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("registered config has description and argsSchema", () => {
    const server = makeMockServer();
    new ComposeServicePrompt().register(server);
    const config = vi.mocked(server.registerPrompt).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof config.description).toBe("string");
    expect(config.description).not.toBe("");
    expect(config.argsSchema).toBeDefined();
  });
});
