import { describe, it, expect, vi, beforeEach } from "vitest";
import { DockerStatusTool } from "../../../../src/docker/tools/docker-status/docker-status.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockInfo = vi.fn();
const mockVersion = vi.fn();
const mockDf = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    info: mockInfo,
    version: mockVersion,
    df: mockDf,
  }),
} as unknown as DockerClient;

function buildTool() {
  return new DockerStatusTool(mockClient);
}

const fakeInfo = {
  Name: "docker-desktop",
  OperatingSystem: "Docker Desktop",
  OSType: "linux",
  KernelVersion: "5.15.0",
  Architecture: "x86_64",
  NCPU: 4,
  MemTotal: 8 * 1024 * 1024 * 1024,
  DockerRootDir: "/var/lib/docker",
  LoggingDriver: "json-file",
  CgroupDriver: "cgroupfs",
  CgroupVersion: "2",
  Containers: 5,
  ContainersRunning: 3,
  ContainersPaused: 0,
  ContainersStopped: 2,
  Images: 10,
  Plugins: {
    Volume: ["local"],
    Network: ["bridge", "host", "overlay"],
    Log: ["json-file", "syslog"],
  },
  Swarm: { LocalNodeState: "inactive" },
  Warnings: [],
};

const fakeVersion = {
  Version: "24.0.5",
  ApiVersion: "1.43",
  GoVersion: "go1.20.6",
  Os: "linux",
  Arch: "amd64",
  KernelVersion: "5.15.0",
  BuildTime: "2023-07-19T18:02:38.000000000+00:00",
};

const fakeDf = {
  Images: [
    { Size: 100 * 1024 * 1024, ReclaimableSize: 0, Containers: 1 },
    { Size: 200 * 1024 * 1024, ReclaimableSize: 200 * 1024 * 1024, Containers: 0 },
  ],
  Volumes: [{ UsageData: { Size: 50 * 1024 * 1024 } }, { UsageData: { Size: 30 * 1024 * 1024 } }],
  BuildCache: [{ Size: 10 * 1024 * 1024 }, { Size: 5 * 1024 * 1024 }],
};

describe("DockerStatusTool", () => {
  let capturedCallback: () => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckConnection.mockResolvedValue(undefined);
    mockInfo.mockResolvedValue(fakeInfo);
    mockVersion.mockResolvedValue(fakeVersion);
    mockDf.mockResolvedValue(fakeDf);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("success", () => {
    it("returns status running", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[]; isError?: boolean };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBeUndefined();
      expect(parsed.status).toBe("running");
    });

    it("returns version fields", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { version } = JSON.parse(result.content[0].text);

      expect(version.engine).toBe("24.0.5");
      expect(version.api).toBe("1.43");
      expect(version.go).toBe("go1.20.6");
      expect(version.os).toBe("linux");
      expect(version.arch).toBe("amd64");
    });

    it("returns system fields", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { system } = JSON.parse(result.content[0].text);

      expect(system.hostname).toBe("docker-desktop");
      expect(system.cpus).toBe(4);
      expect(system.memory_total_bytes).toBe(8 * 1024 * 1024 * 1024);
      expect(system.logging_driver).toBe("json-file");
    });

    it("returns container counts", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { containers } = JSON.parse(result.content[0].text);

      expect(containers.total).toBe(5);
      expect(containers.running).toBe(3);
      expect(containers.paused).toBe(0);
      expect(containers.stopped).toBe(2);
    });

    it("returns image count", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { images } = JSON.parse(result.content[0].text);

      expect(images.total).toBe(10);
    });

    it("returns disk usage with correct totals", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { disk_usage } = JSON.parse(result.content[0].text);

      expect(disk_usage.images.count).toBe(2);
      expect(disk_usage.images.total_size_bytes).toBe(300 * 1024 * 1024);
      expect(disk_usage.images.reclaimable_bytes).toBe(200 * 1024 * 1024);

      expect(disk_usage.volumes.count).toBe(2);
      expect(disk_usage.volumes.total_size_bytes).toBe(80 * 1024 * 1024);

      expect(disk_usage.build_cache.count).toBe(2);
      expect(disk_usage.build_cache.total_size_bytes).toBe(15 * 1024 * 1024);
    });

    it("returns plugins", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { plugins } = JSON.parse(result.content[0].text);

      expect(plugins.volume).toContain("local");
      expect(plugins.network).toContain("bridge");
      expect(plugins.log).toContain("json-file");
    });

    it("returns swarm inactive state", async () => {
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { swarm } = JSON.parse(result.content[0].text);

      expect(swarm.active).toBe(false);
      expect(swarm.state).toBe("inactive");
    });

    it("returns swarm active when state is active", async () => {
      mockInfo.mockResolvedValue({ ...fakeInfo, Swarm: { LocalNodeState: "active" } });

      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { swarm } = JSON.parse(result.content[0].text);

      expect(swarm.active).toBe(true);
      expect(swarm.state).toBe("active");
    });

    it("returns warnings array", async () => {
      mockInfo.mockResolvedValue({ ...fakeInfo, Warnings: ["low memory"] });

      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { warnings } = JSON.parse(result.content[0].text);

      expect(warnings).toContain("low memory");
    });

    it("handles empty disk usage gracefully", async () => {
      mockDf.mockResolvedValue({ Images: [], Volumes: [], BuildCache: [] });

      const result = (await capturedCallback()) as { content: { text: string }[]; isError?: boolean };
      const { disk_usage } = JSON.parse(result.content[0].text);

      expect(result.isError).toBeUndefined();
      expect(disk_usage.images.count).toBe(0);
      expect(disk_usage.images.total_size_bytes).toBe(0);
      expect(disk_usage.volumes.count).toBe(0);
      expect(disk_usage.build_cache.count).toBe(0);
    });
  });

  describe("errors", () => {
    it("returns isError when docker is unavailable", async () => {
      mockCheckConnection.mockRejectedValue(new Error("Docker is not running"));

      const result = (await capturedCallback()) as { content: { text: string }[]; isError: boolean };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.status).toBe("unavailable");
      expect(parsed.error).toContain("Docker is not running");
    });

    it("returns isError when info call fails", async () => {
      mockInfo.mockRejectedValue(new Error("connection refused"));

      const result = (await capturedCallback()) as { content: { text: string }[]; isError: boolean };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.status).toBe("unavailable");
    });
  });

  describe("registration", () => {
    it("registers with name docker_status", () => {
      const tool = buildTool();
      let registeredName = "";
      const fakeServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredName = name;
        },
      } as unknown as McpServer;

      tool.register(fakeServer);
      expect(registeredName).toBe("docker_status");
    });

    it("registers with empty inputSchema", () => {
      const tool = buildTool();
      let registeredConfig: Record<string, unknown> = {};
      const fakeServer = {
        registerTool: (_name: string, config: typeof registeredConfig, _cb: unknown) => {
          registeredConfig = config;
        },
      } as unknown as McpServer;

      tool.register(fakeServer);
      expect(registeredConfig.inputSchema).toEqual({});
    });
  });

  describe("null/undefined df and info fields", () => {
    it("handles undefined df fields gracefully", async () => {
      mockDf.mockResolvedValue({ Images: undefined, Volumes: undefined, BuildCache: undefined });
      const result = (await capturedCallback()) as { content: { text: string }[]; isError?: boolean };
      expect(result.isError).toBeUndefined();
      const { disk_usage } = JSON.parse(result.content[0].text);
      expect(disk_usage.images.count).toBe(0);
      expect(disk_usage.images.total_size_bytes).toBe(0);
      expect(disk_usage.images.reclaimable_bytes).toBe(0);
      expect(disk_usage.volumes.count).toBe(0);
      expect(disk_usage.volumes.total_size_bytes).toBe(0);
      expect(disk_usage.build_cache.count).toBe(0);
      expect(disk_usage.build_cache.total_size_bytes).toBe(0);
    });

    it("uses empty arrays when Plugins fields are undefined", async () => {
      mockInfo.mockResolvedValue({ ...fakeInfo, Plugins: { Volume: undefined, Network: undefined, Log: undefined } });
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { plugins } = JSON.parse(result.content[0].text);
      expect(plugins.volume).toEqual([]);
      expect(plugins.network).toEqual([]);
      expect(plugins.log).toEqual([]);
    });

    it("uses inactive when Swarm is undefined", async () => {
      mockInfo.mockResolvedValue({ ...fakeInfo, Swarm: { LocalNodeState: undefined } });
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { swarm } = JSON.parse(result.content[0].text);
      expect(swarm.active).toBe(false);
      expect(swarm.state).toBe("inactive");
    });

    it("uses empty array when Warnings is undefined", async () => {
      mockInfo.mockResolvedValue({ ...fakeInfo, Warnings: undefined });
      const result = (await capturedCallback()) as { content: { text: string }[]; isError?: boolean };
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.warnings).toEqual([]);
    });

    it("handles images with undefined Size in total_size_bytes", async () => {
      mockDf.mockResolvedValue({
        ...fakeDf,
        Images: [{ Size: undefined, ReclaimableSize: 0, Containers: 1 }],
      });
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { disk_usage } = JSON.parse(result.content[0].text);
      expect(disk_usage.images.total_size_bytes).toBe(0);
    });

    it("skips reclaimable when image Containers is not 0", async () => {
      mockDf.mockResolvedValue({
        ...fakeDf,
        Images: [{ Size: 100, ReclaimableSize: 999, Containers: 2 }],
      });
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { disk_usage } = JSON.parse(result.content[0].text);
      expect(disk_usage.images.reclaimable_bytes).toBe(0);
    });

    it("handles volumes with undefined UsageData in total_size_bytes", async () => {
      mockDf.mockResolvedValue({
        ...fakeDf,
        Volumes: [{ UsageData: undefined }, { UsageData: { Size: undefined } }],
      });
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { disk_usage } = JSON.parse(result.content[0].text);
      expect(disk_usage.volumes.total_size_bytes).toBe(0);
    });

    it("handles build cache with undefined Size", async () => {
      mockDf.mockResolvedValue({
        ...fakeDf,
        BuildCache: [{ Size: undefined }],
      });
      const result = (await capturedCallback()) as { content: { text: string }[] };
      const { disk_usage } = JSON.parse(result.content[0].text);
      expect(disk_usage.build_cache.total_size_bytes).toBe(0);
    });
  });
});
