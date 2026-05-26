import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContainerLogsTool } from "../../../../src/docker/tools/container-logs/container-logs.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListContainers = vi.fn();
const mockLogs = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

function makeLogBuffer(lines: string[]): Buffer {
  const frames = lines.map((line) => {
    const payload = Buffer.from(line, "utf8");
    const header = Buffer.alloc(8);
    header.writeUInt8(1, 0); // stdout
    header.writeUInt32BE(payload.length, 4);
    return Buffer.concat([header, payload]);
  });
  return Buffer.concat(frames);
}

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({
      logs: mockLogs,
    }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new ContainerLogsTool(mockClient);
}

const fakeContainer = {
  Id: "abc123def456ghi7",
  Names: ["/my-app"],
  State: "running",
};

type CallbackInput = { id?: string; tail?: number };

describe("ContainerLogsTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListContainers.mockResolvedValue([fakeContainer]);
    mockLogs.mockResolvedValue(makeLogBuffer(["line1\n", "line2\n", "line3\n", "line4\n", "line5\n"]));

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
      const result = (await capturedCallback({ id: "" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/id is required/);
    });

    it("returns error when id is whitespace-only", async () => {
      const result = (await capturedCallback({ id: "   " })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/id is required/);
    });
  });

  describe("success", () => {
    it("returns logs with default tail=5", async () => {
      const result = (await capturedCallback({ id: "abc123", tail: 5 })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.logs).toContain("line1");
      expect(Array.isArray(parsed.logs)).toBe(true);
      expect(parsed.tail).toBe(5);
    });

    it("passes tail param to docker.logs", async () => {
      await capturedCallback({ id: "abc123", tail: 10 });
      expect(mockLogs).toHaveBeenCalledWith(expect.objectContaining({ tail: 10 }));
    });

    it("returns short containerId (12 chars)", async () => {
      const result = (await capturedCallback({ id: "abc123" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.containerId).toHaveLength(12);
    });

    it("trims whitespace from id before matching", async () => {
      const result = (await capturedCallback({ id: "  abc123  " })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBeUndefined();
    });

    it("returns tail value in response", async () => {
      const result = (await capturedCallback({ id: "abc123", tail: 20 })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tail).toBe(20);
    });

    it("returns logs as array of lines", async () => {
      mockLogs.mockResolvedValue(makeLogBuffer(["hello\n", "world\n"]));
      const result = (await capturedCallback({ id: "abc123" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed.logs)).toBe(true);
      expect(parsed.logs).toEqual(["hello", "world"]);
    });

    it("filters empty lines from logs", async () => {
      mockLogs.mockResolvedValue(makeLogBuffer(["hello\n", "\n", "world\n"]));
      const result = (await capturedCallback({ id: "abc123" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.logs).toEqual(["hello", "world"]);
    });
  });

  describe("not found", () => {
    it("returns isError when container not found", async () => {
      mockListContainers.mockResolvedValue([]);
      const result = (await capturedCallback({ id: "deadbeef" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Container not found/);
    });

    it("does NOT match by name (id only)", async () => {
      const result = (await capturedCallback({ id: "my-app" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Container not found/);
    });
  });

  describe("errors", () => {
    it("returns isError when logs throws", async () => {
      mockLogs.mockRejectedValue(new Error("permission denied"));
      const result = (await capturedCallback({ id: "abc123" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/permission denied/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValue(new Error("Docker is not running"));
      const result = (await capturedCallback({ id: "abc123" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });

  describe("registration", () => {
    it("registers with name container_logs", () => {
      const tool = buildTool();
      let registeredName = "";
      const fakeServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredName = name;
        },
      } as unknown as McpServer;
      tool.register(fakeServer);
      expect(registeredName).toBe("container_logs");
    });
  });
});
