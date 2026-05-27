import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VolumeRemovalPrompt } from "../../../../src/docker/prompts/volume-removal/volume-removal.prompt.js";

function makeMockServer() {
  return { registerPrompt: vi.fn() } as unknown as McpServer;
}

describe("VolumeRemovalPrompt", () => {
  it("registers prompt with name volume_removal", () => {
    const server = makeMockServer();
    new VolumeRemovalPrompt().register(server);
    expect(server.registerPrompt).toHaveBeenCalledOnce();
    expect(server.registerPrompt).toHaveBeenCalledWith("volume_removal", expect.any(Object), expect.any(Function));
  });

  it("callback returns messages array", () => {
    const server = makeMockServer();
    new VolumeRemovalPrompt().register(server);
    const callback = vi.mocked(server.registerPrompt).mock.calls[0][2] as () => unknown;
    const result = callback() as { messages: unknown[] };
    expect(result.messages).toHaveLength(2);
  });

  it("registered config has description", () => {
    const server = makeMockServer();
    new VolumeRemovalPrompt().register(server);
    const config = vi.mocked(server.registerPrompt).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof config.description).toBe("string");
    expect(config.description).not.toBe("");
  });
});
