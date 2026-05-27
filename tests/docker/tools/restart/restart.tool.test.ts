import { describe, it, expect, vi, beforeEach } from "vitest";
import { RestartContainerTool } from "../../../../src/docker/tools/restart/restart.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListContainers = vi.fn();
const mockRestart = vi.fn();
const mockInspect = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({ restart: mockRestart, inspect: mockInspect }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new RestartContainerTool(mockClient);
}

const fakeContainer = {
  Id: "abc123def456ghi7",
  Names: ["/my-app"],
  State: "running",
};

const fakeInspect = {
  State: { Status: "running" },
};

type CallbackInput = { id?: string };

describe("RestartContainerTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListContainers.mockResolvedValue([fakeContainer]);
    mockRestart.mockResolvedValue(undefined);
    mockInspect.mockResolvedValue(fakeInspect);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("validation", () => {
    it("returns error when id is empty", async () => {
      const result = (await capturedCallback({ id: "" })) as { content: { text: string }[]; isError: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/id is required/);
    });

    it("returns error when id is whitespace-only", async () => {
      const result = (await capturedCallback({ id: "   " })) as { content: { text: string }[]; isError: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/id is required/);
    });
  });

  describe("success", () => {
    it("returns restarted true by name", async () => {
      const result = (await capturedCallback({ id: "my-app" })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(result.isError).toBeUndefined();
      expect(parsed.restarted).toBe(true);
    });

    it("returns restarted true by id prefix", async () => {
      const result = (await capturedCallback({ id: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.restarted).toBe(true);
    });

    it("returns short id (12 chars)", async () => {
      const result = (await capturedCallback({ id: "my-app" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.container.id).toHaveLength(12);
    });

    it("returns container name without leading slash", async () => {
      const result = (await capturedCallback({ id: "my-app" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.container.name).toBe("my-app");
    });

    it("returns status from inspect", async () => {
      const result = (await capturedCallback({ id: "my-app" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.container.status).toBe("running");
    });

    it("matches name case-insensitively", async () => {
      const result = (await capturedCallback({ id: "MY-APP" })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.restarted).toBe(true);
    });

    it("trims whitespace from id", async () => {
      const result = (await capturedCallback({ id: "  my-app  " })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.restarted).toBe(true);
    });

    it("uses id as name when Names is empty", async () => {
      mockListContainers.mockResolvedValue([{ ...fakeContainer, Names: [] }]);
      const result = (await capturedCallback({ id: "abc123" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.container.name).toBe("abc123def456");
    });
  });

  describe("not found", () => {
    it("returns isError when container not found", async () => {
      mockListContainers.mockResolvedValue([]);
      const result = (await capturedCallback({ id: "unknown-container" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Container not found/);
    });
  });

  describe("errors", () => {
    it("returns isError when restart throws", async () => {
      mockRestart.mockRejectedValue(new Error("cannot restart container"));
      const result = (await capturedCallback({ id: "my-app" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/cannot restart container/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValue(new Error("Docker is not running"));
      const result = (await capturedCallback({ id: "my-app" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });

  describe("registration", () => {
    it("registers with name restart_container", () => {
      const tool = buildTool();
      let registeredName = "";
      const fakeServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredName = name;
        },
      } as unknown as McpServer;
      tool.register(fakeServer);
      expect(registeredName).toBe("restart_container");
    });
  });
});
