import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListVolumesTool } from "../../../../src/docker/tools/list-volumes/list-volumes.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListVolumes = vi.fn();
const mockListContainers = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listVolumes: mockListVolumes,
    listContainers: mockListContainers,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new ListVolumesTool(mockClient);
}

const makeVolume = (name: string, driver = "local", usageData?: { Size: number; RefCount: number } | null) => ({
  Name: name,
  Driver: driver,
  Mountpoint: `/var/lib/docker/volumes/${name}/_data`,
  Scope: "local" as const,
  Labels: {},
  Options: null,
  UsageData: usageData ?? null,
});

const makeContainer = (id: string, name: string, state = "running") => ({
  Id: id,
  Names: [`/${name}`],
  State: state,
});

type CallbackInput = {
  name?: string;
  driver?: string;
  includeContainers?: boolean;
  includeUsage?: boolean;
  dangling?: boolean;
};

describe("ListVolumesTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListContainers.mockResolvedValue([]);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("basic listing", () => {
    it("returns all volumes with base fields", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("vol-a"), makeVolume("vol-b")] });

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toMatchObject({ name: "vol-a", driver: "local", scope: "local" });
      expect(parsed[0].mountpoint).toContain("vol-a");
    });

    it("returns empty array when no volumes", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [] });

      const result = (await capturedCallback({})) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(0);
    });
  });

  describe("name filter", () => {
    it("filters by partial name match (case-insensitive)", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("postgres-data"), makeVolume("redis-cache")] });

      const result = (await capturedCallback({ name: "POSTGRES" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("postgres-data");
    });
  });

  describe("driver filter", () => {
    it("passes driver filter to listVolumes", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [] });

      await capturedCallback({ driver: "local" });

      expect(mockListVolumes).toHaveBeenCalledWith(
        expect.objectContaining({ filters: expect.stringContaining("local") }),
      );
    });
  });

  describe("dangling filter", () => {
    it("passes dangling=true filter to listVolumes", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [] });

      await capturedCallback({ dangling: true });

      const call = mockListVolumes.mock.calls[0][0];
      const filters = JSON.parse(call.filters);
      expect(filters.dangling).toEqual(["true"]);
    });
  });

  describe("includeContainers=true", () => {
    it("includes containers using the volume", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("pg-data")] });
      mockListContainers.mockResolvedValue([makeContainer("abc123def456ghi7", "postgres", "running")]);

      const result = (await capturedCallback({ includeContainers: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].containers).toHaveLength(1);
      expect(parsed[0].containers[0]).toMatchObject({ id: "abc123def456", name: "postgres", state: "running" });
    });

    it("queries listContainers with volume filter", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("pg-data")] });

      await capturedCallback({ includeContainers: true });

      expect(mockListContainers).toHaveBeenCalledWith(
        expect.objectContaining({ filters: expect.stringContaining("pg-data") }),
      );
    });

    it("returns empty containers array when volume is unused", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("orphan-vol")] });
      mockListContainers.mockResolvedValue([]);

      const result = (await capturedCallback({ includeContainers: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].containers).toEqual([]);
    });

    it("does not call listContainers when includeContainers is false", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("pg-data")] });

      await capturedCallback({});

      expect(mockListContainers).not.toHaveBeenCalled();
    });
  });

  describe("includeUsage=true", () => {
    it("includes usage when UsageData is present", async () => {
      mockListVolumes.mockResolvedValue({
        Volumes: [makeVolume("big-vol", "local", { Size: 52428800, RefCount: 2 })],
      });

      const result = (await capturedCallback({ includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].usage).toMatchObject({ size_mb: 50, ref_count: 2 });
    });

    it("omits usage field when UsageData is null", async () => {
      mockListVolumes.mockResolvedValue({ Volumes: [makeVolume("no-usage-vol", "local", null)] });

      const result = (await capturedCallback({ includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].usage).toBeUndefined();
    });
  });

  describe("errors", () => {
    it("returns isError when listVolumes throws", async () => {
      mockListVolumes.mockRejectedValue(new Error("daemon error"));

      const result = (await capturedCallback({})) as { content: { text: string }[]; isError?: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/daemon error/);
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({})) as { content: { text: string }[]; isError?: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Docker is not running/);
    });
  });
});
