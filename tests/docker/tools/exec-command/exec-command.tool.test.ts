import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecCommandTool } from "../../../../src/docker/tools/exec-command/exec-command.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Readable } from "stream";

const mockListContainers = vi.fn();
const mockExec = vi.fn();
const mockExecStart = vi.fn();
const mockExecInspect = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

function makeStream(text: string): Readable {
  // Build a proper dockerode multiplexed stream frame
  const payload = Buffer.from(text, "utf8");
  const header = Buffer.alloc(8);
  header.writeUInt8(1, 0); // stdout
  header.writeUInt32BE(payload.length, 4);
  const frame = Buffer.concat([header, payload]);

  const stream = new Readable({ read() {} });
  stream.push(frame);
  stream.push(null);
  return stream;
}

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({
      exec: mockExec,
    }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new ExecCommandTool(mockClient);
}

const fakeContainer = {
  Id: "abc123def456ghi7",
  Names: ["/my-app"],
  State: "running",
};

type CallbackInput = { id?: string; command?: string; silent?: boolean };

describe("ExecCommandTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckConnection.mockResolvedValue(undefined);
    mockListContainers.mockResolvedValue([fakeContainer]);
    mockExecInspect.mockResolvedValue({ ExitCode: 0 });
    mockExecStart.mockResolvedValue(makeStream("hello world\n"));
    mockExec.mockResolvedValue({ start: mockExecStart, inspect: mockExecInspect });

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
      const result = (await capturedCallback({ id: "", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/id is required/);
    });

    it("returns error when id is whitespace-only", async () => {
      const result = (await capturedCallback({ id: "   ", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/id is required/);
    });

    it("returns error when command is empty", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/command is required/);
    });

    it("returns error when command is whitespace-only", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "   " })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/command is required/);
    });
  });

  describe("success", () => {
    it("returns output and exitCode 0", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "echo hello" })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(result.isError).toBeUndefined();
      expect(parsed.exitCode).toBe(0);
      expect(parsed.output).toBe("hello world");
    });

    it("returns short containerId (12 chars)", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "ls" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.containerId).toHaveLength(12);
    });

    it("returns echoed command string", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "ls -la" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.command).toBe("ls -la");
    });

    it("splits command into args array for exec", async () => {
      await capturedCallback({ id: "abc123", command: "ls -la /app" });
      expect(mockExec).toHaveBeenCalledWith(expect.objectContaining({ Cmd: ["ls", "-la", "/app"] }));
    });

    it("trims whitespace from id before matching", async () => {
      const result = (await capturedCallback({ id: "  abc123  ", command: "ls" })) as {
        content: { text: string }[];
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.exitCode).toBe(0);
    });

    it("returns nonzero exitCode on command failure", async () => {
      mockExecInspect.mockResolvedValue({ ExitCode: 1 });
      const result = (await capturedCallback({ id: "abc123", command: "false" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.exitCode).toBe(1);
    });

    it("omits output when silent=true", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "echo hello", silent: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.output).toBeUndefined();
    });

    it("includes output when silent=false (default)", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "echo hello", silent: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.output).toBeDefined();
    });

    it("includes success field in response", async () => {
      const result = (await capturedCallback({ id: "abc123", command: "echo hello" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it("success=false when exitCode nonzero", async () => {
      mockExecInspect.mockResolvedValue({ ExitCode: 1 });
      const result = (await capturedCallback({ id: "abc123", command: "false", silent: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
    });
  });

  describe("not found", () => {
    it("returns isError when container not found by id", async () => {
      mockListContainers.mockResolvedValue([]);
      const result = (await capturedCallback({ id: "deadbeef", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Container not found/);
    });

    it("does NOT match by name (id only)", async () => {
      const result = (await capturedCallback({ id: "my-app", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Container not found/);
    });
  });

  describe("stopped container", () => {
    it("returns isError when container is stopped", async () => {
      mockListContainers.mockResolvedValue([{ ...fakeContainer, State: "exited" }]);
      const result = (await capturedCallback({ id: "abc123", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/not running/);
    });
  });

  describe("errors", () => {
    it("returns isError when exec throws", async () => {
      mockExec.mockRejectedValue(new Error("exec failed"));
      const result = (await capturedCallback({ id: "abc123", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/exec failed/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValue(new Error("Docker is not running"));
      const result = (await capturedCallback({ id: "abc123", command: "ls" })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });

  describe("registration", () => {
    it("registers with name exec_command", () => {
      const tool = buildTool();
      let registeredName = "";
      const fakeServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredName = name;
        },
      } as unknown as McpServer;
      tool.register(fakeServer);
      expect(registeredName).toBe("exec_command");
    });
  });

  describe("stream parsing edge cases", () => {
    it("falls back to raw utf8 when stream has no valid multiplexed frames", async () => {
      // Buffer smaller than 8 bytes — no valid frame header, falls back to raw.toString("utf8")
      mockExecStart.mockResolvedValue(makeStream("hi"));
      // Override makeStream behavior by using a stream that emits raw bytes without multiplexed header
      mockExecStart.mockImplementation(
        () =>
          new Promise((resolve) => {
            const s = new Readable({ read() {} });
            setImmediate(() => {
              s.push(Buffer.from("hi"));
              s.push(null);
            });
            resolve(s);
          }),
      );

      const result = (await capturedCallback({ id: "abc123", command: "echo hi" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.output).toBe("hi");
    });

    it("stops parsing when frame claims more bytes than buffer has", async () => {
      // Header claims 1000 bytes but only 4 follow — truncated, falls back to raw
      mockExecStart.mockImplementation(
        () =>
          new Promise((resolve) => {
            const header = Buffer.alloc(8);
            header.writeUInt8(1, 0);
            header.writeUInt32BE(1000, 4);
            const truncated = Buffer.concat([header, Buffer.from("abcd")]);
            const s = new Readable({ read() {} });
            setImmediate(() => {
              s.push(truncated);
              s.push(null);
            });
            resolve(s);
          }),
      );

      const result = (await capturedCallback({ id: "abc123", command: "echo hi" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(typeof parsed.output).toBe("string");
    });
  });
});
