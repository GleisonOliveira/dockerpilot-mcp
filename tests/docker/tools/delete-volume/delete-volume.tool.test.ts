import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteVolumeTool } from "../../../../src/docker/tools/delete-volume/delete-volume.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListVolumes = vi.fn();
const mockListContainers = vi.fn();
const mockVolumeRemove = vi.fn();
const mockGetVolume = vi.fn(() => ({ remove: mockVolumeRemove }));
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listVolumes: mockListVolumes,
    listContainers: mockListContainers,
    getVolume: mockGetVolume,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new DeleteVolumeTool(mockClient);
}

const makeVolume = (name: string, driver = "local") => ({
  Name: name,
  Driver: driver,
  Mountpoint: `/var/lib/docker/volumes/${name}/_data`,
  Scope: "local",
  Labels: {},
  Options: {},
});

const makeContainer = (id: string, name: string, state = "running") => ({
  Id: id,
  Names: [`/${name}`],
  State: state,
});

type CallbackInput = { name?: string; confirmed?: boolean };

describe("DeleteVolumeTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckConnection.mockResolvedValue(undefined);
    mockListContainers.mockResolvedValue([]);
    mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("my-vol")] });
    mockVolumeRemove.mockResolvedValue(undefined);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("validation", () => {
    it("returns error when name is empty", async () => {
      const result = (await capturedCallback({ name: "", confirmed: true })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/name is required/);
    });

    it("returns error when name is whitespace-only", async () => {
      const result = (await capturedCallback({ name: "   ", confirmed: true })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/name is required/);
    });
  });

  describe("preview (confirmed=false)", () => {
    it("returns preview with volume info when not confirmed", async () => {
      const result = (await capturedCallback({ name: "my-vol", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.confirmed).toBe(false);
      expect(parsed.preview.name).toBe("my-vol");
      expect(parsed.preview.driver).toBe("local");
      expect(parsed.message).toMatch(/confirmed must be true/);
    });

    it("includes usingContainers in preview", async () => {
      mockListContainers.mockResolvedValue([makeContainer("abc123def456ghi7", "web", "running")]);

      const result = (await capturedCallback({ name: "my-vol", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.preview.usingContainers).toHaveLength(1);
      expect(parsed.preview.usingContainers[0]).toMatchObject({ id: "abc123def456", name: "web", state: "running" });
    });

    it("includes warning when volume is in use", async () => {
      mockListContainers.mockResolvedValue([makeContainer("abc123def456ghi7", "web", "running")]);

      const result = (await capturedCallback({ name: "my-vol", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.preview.warning).toMatch(/in use/);
      expect(parsed.preview.warning).toMatch(/force/);
    });

    it("warning is null when volume is not in use", async () => {
      const result = (await capturedCallback({ name: "my-vol", confirmed: false })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.preview.warning).toBeNull();
    });

    it("returns error when volume not found during preview", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [] });

      const result = (await capturedCallback({ name: "ghost-vol", confirmed: false })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No volume found/);
    });
  });

  describe("deletion (confirmed=true)", () => {
    it("deletes volume and returns success", async () => {
      const result = (await capturedCallback({ name: "my-vol", confirmed: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.name).toBe("my-vol");
    });

    it("calls getVolume with correct name", async () => {
      await capturedCallback({ name: "my-vol", confirmed: true });

      expect(mockGetVolume).toHaveBeenCalledWith("my-vol");
      expect(mockVolumeRemove).toHaveBeenCalled();
    });

    it("returns error when volume is in use", async () => {
      mockListContainers.mockResolvedValue([makeContainer("abc123def456ghi7", "web", "running")]);

      const result = (await capturedCallback({ name: "my-vol", confirmed: true })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/in use by container/);
      expect(result.content[0].text).toMatch(/web/);
    });

    it("does not call remove when volume is in use", async () => {
      mockListContainers.mockResolvedValue([makeContainer("abc123def456ghi7", "web", "running")]);

      await capturedCallback({ name: "my-vol", confirmed: true });

      expect(mockVolumeRemove).not.toHaveBeenCalled();
    });
  });

  describe("errors", () => {
    it("returns isError when remove throws", async () => {
      mockVolumeRemove.mockRejectedValue(new Error("volume in use"));

      const result = (await capturedCallback({ name: "my-vol", confirmed: true })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/volume in use/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({ name: "my-vol", confirmed: true })) as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });
});
