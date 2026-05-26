import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListContainersTool } from "../../../../src/docker/tools/list/list.tool.js";
import { DockerClient } from "../../../../src/docker/client.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockStats = vi.fn();
const mockInspect = vi.fn();
const mockListContainers = vi.fn();
const mockCheckConnection = vi.fn().mockResolvedValue(undefined);

const mockClient = {
  checkConnection: mockCheckConnection,
  getDocker: () => ({
    listContainers: mockListContainers,
    getContainer: (_id: string) => ({ stats: mockStats, inspect: mockInspect }),
  }),
} as unknown as DockerClient;

function buildTool() {
  return new ListContainersTool(mockClient);
}

const fakeStats = {
  cpu_stats: {
    cpu_usage: { total_usage: 2_000_000_000, percpu_usage: [1, 1] },
    system_cpu_usage: 20_000_000_000,
    online_cpus: 2,
  },
  precpu_stats: {
    cpu_usage: { total_usage: 1_000_000_000 },
    system_cpu_usage: 10_000_000_000,
  },
  memory_stats: {
    usage: 200 * 1024 * 1024,
    limit: 1024 * 1024 * 1024,
    stats: { cache: 50 * 1024 * 1024 },
  },
};

const fakeContainerRaw = {
  Id: "abc123def456789",
  Names: ["/my-app"],
  Image: "nginx:latest",
  Status: "Up 2 hours",
  State: "running",
  Ports: [{ IP: "0.0.0.0", PrivatePort: 80, PublicPort: 8080, Type: "tcp" }],
  Mounts: [{ Type: "bind", Source: "/host/data", Destination: "/data" }],
  Labels: {
    "com.docker.compose.project": "myproject",
    "com.docker.compose.service": "web",
    "com.docker.compose.project.config_files": "docker-compose.yml",
    "com.docker.compose.project.working_dir": "/home/user/myproject",
    "com.docker.compose.container-number": "1",
    "com.docker.compose.depends_on": "db, redis",
    app: "nginx",
  },
  NetworkSettings: {
    Networks: {
      bridge: {
        NetworkID: "net123abc456xyz",
        IPAddress: "172.17.0.2",
        Gateway: "172.17.0.1",
        MacAddress: "02:42:ac:11:00:02",
      },
    },
  },
};

const fakeInspect = {
  RestartCount: 3,
  State: {
    Status: "running",
    Running: true,
    Paused: false,
    Restarting: false,
    OOMKilled: false,
    Dead: false,
    Pid: 1234,
    ExitCode: 0,
    Error: "",
    StartedAt: "2024-01-01T00:00:00Z",
    FinishedAt: "0001-01-01T00:00:00Z",
    Health: {
      Status: "healthy",
      FailingStreak: 0,
      Log: [{ Start: "2024-01-01T00:00:00Z", End: "2024-01-01T00:00:01Z", ExitCode: 0, Output: "OK" }],
    },
  },
  HostConfig: {
    RestartPolicy: { Name: "always", MaximumRetryCount: 0 },
    Memory: 512 * 1024 * 1024,
    MemoryReservation: 256 * 1024 * 1024,
    MemorySwap: 1024 * 1024 * 1024,
    NanoCpus: 500000000,
    CpuShares: 1024,
    CpuQuota: 50000,
    CpuPeriod: 100000,
    PidsLimit: 100,
  },
};

type CallbackInput = {
  all: boolean;
  id?: string;
  name?: string;
  status?: string;
  includePorts?: boolean;
  includeMounts?: boolean;
  includeNetworks?: boolean;
  includeUsage?: boolean;
  includeLabels?: boolean;
  includeHealthcheck?: boolean;
  includeRestartInfo?: boolean;
  includeComposeMetadata?: boolean;
  includeDependencyInfo?: boolean;
  includeResourceLimits?: boolean;
  includeStateDetails?: boolean;
};

describe("ListContainersTool", () => {
  let capturedCallback: (input: CallbackInput) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStats.mockResolvedValue(fakeStats);
    mockInspect.mockResolvedValue(fakeInspect);

    const tool = buildTool();
    const fakeServer = {
      registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
        capturedCallback = cb;
      },
    } as unknown as McpServer;

    tool.register(fakeServer);
  });

  describe("base fields (always returned)", () => {
    it("returns id, names, image, status, state without any include flag", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0]).toEqual({
        id: "abc123def456",
        names: ["/my-app"],
        image: "nginx:latest",
        status: "Up 2 hours",
        state: "running",
      });
    });

    it("does not include ports, mounts, networks, usage without flags", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0]).not.toHaveProperty("ports");
      expect(parsed[0]).not.toHaveProperty("mounts");
      expect(parsed[0]).not.toHaveProperty("networks");
      expect(parsed[0]).not.toHaveProperty("usage");
    });

    it("passes all=false to listContainers by default", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      await capturedCallback({ all: false });
      expect(mockListContainers).toHaveBeenCalledWith({ all: false });
    });

    it("passes all=true to listContainers when requested", async () => {
      mockListContainers.mockResolvedValue([]);
      await capturedCallback({ all: true });
      expect(mockListContainers).toHaveBeenCalledWith({ all: true });
    });

    it("returns empty array when no containers", async () => {
      mockListContainers.mockResolvedValue([]);
      const result = (await capturedCallback({ all: false })) as { content: { text: string }[] };
      expect(JSON.parse(result.content[0].text)).toEqual([]);
    });
  });

  describe("includePorts=true", () => {
    it("includes ports and no other optional fields", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includePorts: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].ports).toEqual([{ IP: "0.0.0.0", PrivatePort: 80, PublicPort: 8080, Type: "tcp" }]);
      expect(parsed[0]).not.toHaveProperty("mounts");
      expect(parsed[0]).not.toHaveProperty("networks");
      expect(parsed[0]).not.toHaveProperty("usage");
    });
  });

  describe("includeMounts=true", () => {
    it("includes mounts and no other optional fields", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includeMounts: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].mounts).toEqual([{ Type: "bind", Source: "/host/data", Destination: "/data" }]);
      expect(parsed[0]).not.toHaveProperty("ports");
      expect(parsed[0]).not.toHaveProperty("networks");
      expect(parsed[0]).not.toHaveProperty("usage");
    });
  });

  describe("includeNetworks=true", () => {
    it("includes networks with ip, gateway, mac, network_id", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includeNetworks: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].networks).toEqual([
        {
          name: "bridge",
          ip: "172.17.0.2",
          gateway: "172.17.0.1",
          mac: "02:42:ac:11:00:02",
          network_id: "net123abc456",
        },
      ]);
    });

    it("returns empty networks array when container has no networks", async () => {
      mockListContainers.mockResolvedValue([{ ...fakeContainerRaw, NetworkSettings: { Networks: {} } }]);

      const result = (await capturedCallback({ all: false, includeNetworks: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].networks).toEqual([]);
    });
  });

  describe("includeUsage=true", () => {
    it("calculates cpu_percent correctly", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      // cpuDelta=1e9, systemDelta=1e10, numCpus=2 → (1e9/1e10)*2*100 = 20
      expect(parsed[0].usage.cpu_percent).toBe(20);
    });

    it("calculates mem_usage_mb discounting cache", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      // usage=200MB, cache=50MB → 150MB
      expect(parsed[0].usage.mem_usage_mb).toBe(150);
    });

    it("calculates mem_limit_mb correctly", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].usage.mem_limit_mb).toBe(1024);
    });

    it("calculates mem_percent correctly", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({ all: false, includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      // 150MB / 1024MB = 14.65%
      expect(parsed[0].usage.mem_percent).toBe(14.65);
    });

    it("returns usage=null for stopped containers", async () => {
      mockListContainers.mockResolvedValue([
        { ...fakeContainerRaw, Id: "aaa000bbb111ccc", State: "exited", Status: "Exited (0) 1 hour ago" },
      ]);

      const result = (await capturedCallback({ all: true, includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].usage).toBeNull();
      expect(mockStats).not.toHaveBeenCalled();
    });

    it("returns usage=null when stats throws", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      mockStats.mockRejectedValueOnce(new Error("permission denied"));

      const result = (await capturedCallback({ all: false, includeUsage: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0].usage).toBeNull();
    });

    it("does not call stats when includeUsage is false", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      await capturedCallback({ all: false });

      expect(mockStats).not.toHaveBeenCalled();
    });
  });

  describe("multiple flags", () => {
    it("returns all requested fields when all flags true", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);

      const result = (await capturedCallback({
        all: false,
        includePorts: true,
        includeMounts: true,
        includeNetworks: true,
        includeUsage: true,
      })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed[0]).toHaveProperty("ports");
      expect(parsed[0]).toHaveProperty("mounts");
      expect(parsed[0]).toHaveProperty("networks");
      expect(parsed[0]).toHaveProperty("usage");
    });
  });

  describe("id filter", () => {
    const containerA = { ...fakeContainerRaw, Id: "aaa111bbb222ccc333", Names: ["/my-app"] };
    const containerB = { ...fakeContainerRaw, Id: "ddd333eee444fff555", Names: ["/postgres-db"] };

    it("filters by partial id match", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, id: "aaa111" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].names).toEqual(["/my-app"]);
    });

    it("id filter takes precedence over name", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, id: "ddd333", name: "my-app" })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].names).toEqual(["/postgres-db"]);
    });

    it("id filter is case-insensitive", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, id: "AAA111" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].names).toEqual(["/my-app"]);
    });

    it("returns empty array when no container matches id", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, id: "zzz999" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual([]);
    });
  });

  describe("name filter", () => {
    const containerA = { ...fakeContainerRaw, Id: "aaa111bbb222ccc", Names: ["/my-app"] };
    const containerB = { ...fakeContainerRaw, Id: "ddd333eee444fff", Names: ["/postgres-db"] };

    it("returns all containers when name not provided", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(2);
    });

    it("filters containers by partial name match", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, name: "postgres" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].names).toEqual(["/postgres-db"]);
    });

    it("filter is case-insensitive", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, name: "MY-APP" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].names).toEqual(["/my-app"]);
    });

    it("returns empty array when no container matches name", async () => {
      mockListContainers.mockResolvedValue([containerA, containerB]);

      const result = (await capturedCallback({ all: false, name: "redis" })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual([]);
    });
  });

  describe("inspect call deduplication", () => {
    it("calls inspect only once per container when multiple inspect-based includes requested", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      await capturedCallback({
        all: false,
        includeHealthcheck: true,
        includeRestartInfo: true,
        includeResourceLimits: true,
        includeStateDetails: true,
      });
      expect(mockInspect).toHaveBeenCalledTimes(1);
    });

    it("does not call inspect when no inspect-based include is requested", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      await capturedCallback({ all: false, includePorts: true, includeLabels: true });
      expect(mockInspect).not.toHaveBeenCalled();
    });
  });

  describe("status filter", () => {
    it("passes status filter to listContainers", async () => {
      mockListContainers.mockResolvedValue([]);
      await capturedCallback({ all: true, status: "exited" });
      expect(mockListContainers).toHaveBeenCalledWith({
        all: true,
        filters: JSON.stringify({ status: ["exited"] }),
      });
    });

    it("does not pass filters when status not provided", async () => {
      mockListContainers.mockResolvedValue([]);
      await capturedCallback({ all: false });
      expect(mockListContainers).toHaveBeenCalledWith({ all: false });
    });
  });

  describe("includeLabels=true", () => {
    it("includes labels map", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeLabels: true })) as { content: { text: string }[] };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].labels).toMatchObject({ app: "nginx" });
    });
  });

  describe("includeHealthcheck=true", () => {
    it("includes healthcheck status and last log", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeHealthcheck: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].healthcheck).toEqual({
        status: "healthy",
        failing_streak: 0,
        last_log: { Start: "2024-01-01T00:00:00Z", End: "2024-01-01T00:00:01Z", ExitCode: 0, Output: "OK" },
      });
    });

    it("returns healthcheck=null when container has no health config", async () => {
      mockInspect.mockResolvedValueOnce({ ...fakeInspect, State: { ...fakeInspect.State, Health: undefined } });
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeHealthcheck: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].healthcheck).toBeNull();
    });

    it("returns healthcheck=null when inspect throws", async () => {
      mockInspect.mockRejectedValueOnce(new Error("permission denied"));
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeHealthcheck: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].healthcheck).toBeNull();
    });
  });

  describe("includeRestartInfo=true", () => {
    it("includes restart policy and restart count", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeRestartInfo: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].restart_info).toEqual({
        policy: "always",
        max_retry_count: 0,
        restart_count: 3,
      });
    });

    it("returns restart_info=null when inspect throws", async () => {
      mockInspect.mockRejectedValueOnce(new Error("fail"));
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeRestartInfo: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].restart_info).toBeNull();
    });
  });

  describe("includeComposeMetadata=true", () => {
    it("includes compose project and service", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeComposeMetadata: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].compose_metadata).toMatchObject({
        project: "myproject",
        service: "web",
        container_number: "1",
      });
    });

    it("returns compose_metadata=null for non-compose containers", async () => {
      mockListContainers.mockResolvedValue([{ ...fakeContainerRaw, Labels: {} }]);
      const result = (await capturedCallback({ all: false, includeComposeMetadata: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].compose_metadata).toBeNull();
    });
  });

  describe("includeDependencyInfo=true", () => {
    it("includes parsed dependency list", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeDependencyInfo: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].dependency_info).toEqual(["db", "redis"]);
    });

    it("returns empty array when no depends_on label", async () => {
      mockListContainers.mockResolvedValue([{ ...fakeContainerRaw, Labels: {} }]);
      const result = (await capturedCallback({ all: false, includeDependencyInfo: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].dependency_info).toEqual([]);
    });
  });

  describe("includeResourceLimits=true", () => {
    it("includes memory and cpu limits", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeResourceLimits: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].resource_limits).toMatchObject({
        memory_mb: 512,
        memory_reservation_mb: 256,
        nano_cpus: 500000000,
        cpu_shares: 1024,
        pids_limit: 100,
      });
    });

    it("returns resource_limits=null when inspect throws", async () => {
      mockInspect.mockRejectedValueOnce(new Error("fail"));
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeResourceLimits: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].resource_limits).toBeNull();
    });
  });

  describe("includeStateDetails=true", () => {
    it("includes pid, exit_code, started_at and boolean flags", async () => {
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeStateDetails: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].state_details).toMatchObject({
        pid: 1234,
        exit_code: 0,
        error: null,
        started_at: "2024-01-01T00:00:00Z",
        oom_killed: false,
        paused: false,
        restarting: false,
        dead: false,
      });
    });

    it("returns state_details=null when inspect throws", async () => {
      mockInspect.mockRejectedValueOnce(new Error("fail"));
      mockListContainers.mockResolvedValue([fakeContainerRaw]);
      const result = (await capturedCallback({ all: false, includeStateDetails: true })) as {
        content: { text: string }[];
      };
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].state_details).toBeNull();
    });
  });

  describe("errors", () => {
    it("returns isError when listContainers throws", async () => {
      mockListContainers.mockRejectedValue(new Error("socket hang up"));

      const result = (await capturedCallback({ all: false })) as { content: { text: string }[]; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("socket hang up");
    });

    it("returns isError when Docker is not running", async () => {
      mockCheckConnection.mockRejectedValueOnce(new Error("Docker is not running"));

      const result = (await capturedCallback({ all: false })) as { content: { text: string }[]; isError: boolean };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Docker is not running");
    });
  });
});
