import { describe, it, expect, vi } from "vitest";
import Dockerode from "dockerode";
import { ContainerFieldResolvers } from "../../../src/docker/shared/list.resolvers.js";

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
      Log: [
        { Start: "2024-01-01T00:00:00Z", End: "2024-01-01T00:00:01Z", ExitCode: 0, Output: "OK" },
      ],
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
} as unknown as Dockerode.ContainerInspectInfo;

const baseContainer = {
  Id: "abc123def456789",
  Names: ["/my-app"],
  Image: "nginx:latest",
  Status: "Up 2 hours",
  State: "running",
  Ports: [{ IP: "0.0.0.0", PrivatePort: 80, PublicPort: 8080, Type: "tcp" }],
  Mounts: [{ Type: "bind", Source: "/host/data", Destination: "/data" }],
  NetworkSettings: {
    Networks: {
      bridge: {
        NetworkID: "net123abc456xyz",
        IPAddress: "172.17.0.2",
        Gateway: "172.17.0.1",
        MacAddress: "02:42:ac:11:00:02",
      },
      custom: {
        NetworkID: "cus456def789ghi",
        IPAddress: "10.0.0.5",
        Gateway: "10.0.0.1",
        MacAddress: "02:42:0a:00:00:05",
      },
    },
  },
} as unknown as Dockerode.ContainerInfo;

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

describe("ContainerFieldResolvers", () => {
  describe("ports", () => {
    it("returns ports from container", () => {
      const result = ContainerFieldResolvers.ports(baseContainer);
      expect(result).toEqual({
        ports: [{ IP: "0.0.0.0", PrivatePort: 80, PublicPort: 8080, Type: "tcp" }],
      });
    });

    it("returns empty ports array when container has no ports", () => {
      const c = { ...baseContainer, Ports: [] } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.ports(c)).toEqual({ ports: [] });
    });
  });

  describe("mounts", () => {
    it("returns mounts from container", () => {
      const result = ContainerFieldResolvers.mounts(baseContainer);
      expect(result).toEqual({
        mounts: [{ Type: "bind", Source: "/host/data", Destination: "/data" }],
      });
    });

    it("returns empty mounts array when container has no mounts", () => {
      const c = { ...baseContainer, Mounts: [] } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.mounts(c)).toEqual({ mounts: [] });
    });
  });

  describe("networks", () => {
    it("maps each network with name, ip, gateway, mac, network_id (12 chars)", () => {
      const result = ContainerFieldResolvers.networks(baseContainer);
      expect(result.networks).toEqual([
        {
          name: "bridge",
          ip: "172.17.0.2",
          gateway: "172.17.0.1",
          mac: "02:42:ac:11:00:02",
          network_id: "net123abc456",
        },
        {
          name: "custom",
          ip: "10.0.0.5",
          gateway: "10.0.0.1",
          mac: "02:42:0a:00:00:05",
          network_id: "cus456def789",
        },
      ]);
    });

    it("returns empty networks array when container has no networks", () => {
      const c = {
        ...baseContainer,
        NetworkSettings: { Networks: {} },
      } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.networks(c)).toEqual({ networks: [] });
    });

    it("truncates network_id to 12 chars", () => {
      const result = ContainerFieldResolvers.networks(baseContainer);
      result.networks.forEach((n) => expect(n.network_id).toHaveLength(12));
    });
  });

  describe("usage", () => {
    function makeMockDocker(statsImpl: () => Promise<unknown>) {
      return {
        getContainer: (_id: string) => ({ stats: statsImpl }),
      } as unknown as Dockerode;
    }

    it("calculates cpu_percent correctly", async () => {
      const docker = makeMockDocker(() => Promise.resolve(fakeStats));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      // cpuDelta=1e9, systemDelta=1e10, numCpus=2 → 20%
      expect(result.usage?.cpu_percent).toBe(20);
    });

    it("calculates mem_usage_mb discounting cache", async () => {
      const docker = makeMockDocker(() => Promise.resolve(fakeStats));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      // 200MB - 50MB cache = 150MB
      expect(result.usage?.mem_usage_mb).toBe(150);
    });

    it("calculates mem_limit_mb correctly", async () => {
      const docker = makeMockDocker(() => Promise.resolve(fakeStats));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      expect(result.usage?.mem_limit_mb).toBe(1024);
    });

    it("calculates mem_percent correctly", async () => {
      const docker = makeMockDocker(() => Promise.resolve(fakeStats));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      // 150MB / 1024MB = 14.65%
      expect(result.usage?.mem_percent).toBe(14.65);
    });

    it("returns cpu_percent=0 when systemDelta is 0", async () => {
      const zeroStats = {
        ...fakeStats,
        cpu_stats: { ...fakeStats.cpu_stats, system_cpu_usage: 10_000_000_000 },
        precpu_stats: { ...fakeStats.precpu_stats, system_cpu_usage: 10_000_000_000 },
      };
      const docker = makeMockDocker(() => Promise.resolve(zeroStats));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      expect(result.usage?.cpu_percent).toBe(0);
    });

    it("falls back to percpu_usage length when online_cpus absent", async () => {
      const statsNoCpuCount = {
        ...fakeStats,
        cpu_stats: {
          cpu_usage: { total_usage: 2_000_000_000, percpu_usage: [1, 1, 1, 1] },
          system_cpu_usage: 20_000_000_000,
        },
      };
      const docker = makeMockDocker(() => Promise.resolve(statsNoCpuCount));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      // cpuDelta=1e9, systemDelta=1e10, numCpus=4 → 40%
      expect(result.usage?.cpu_percent).toBe(40);
    });

    it("returns usage=null for stopped containers without calling docker", async () => {
      const statsSpy = vi.fn();
      const docker = makeMockDocker(statsSpy);
      const stopped = { ...baseContainer, State: "exited" } as unknown as Dockerode.ContainerInfo;

      const result = await ContainerFieldResolvers.usage(stopped, docker);

      expect(result).toEqual({ usage: null });
      expect(statsSpy).not.toHaveBeenCalled();
    });

    it("returns usage=null when stats throws", async () => {
      const docker = makeMockDocker(() => Promise.reject(new Error("permission denied")));
      const result = await ContainerFieldResolvers.usage(baseContainer, docker);
      expect(result).toEqual({ usage: null });
    });
  });

  describe("labels", () => {
    it("returns labels map", () => {
      const c = { ...baseContainer, Labels: { app: "nginx", env: "prod" } } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.labels(c)).toEqual({ labels: { app: "nginx", env: "prod" } });
    });

    it("returns empty object when labels absent", () => {
      const c = { ...baseContainer, Labels: undefined } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.labels(c)).toEqual({ labels: {} });
    });
  });

  describe("healthcheck", () => {
    it("returns status, failing_streak and last log", () => {
      const result = ContainerFieldResolvers.healthcheck(fakeInspect);
      expect(result).toEqual({
        healthcheck: {
          status: "healthy",
          failing_streak: 0,
          last_log: { Start: "2024-01-01T00:00:00Z", End: "2024-01-01T00:00:01Z", ExitCode: 0, Output: "OK" },
        },
      });
    });

    it("returns healthcheck=null when Health absent", () => {
      const noHealth = { ...fakeInspect, State: { ...fakeInspect.State, Health: undefined } } as unknown as Dockerode.ContainerInspectInfo;
      expect(ContainerFieldResolvers.healthcheck(noHealth)).toEqual({ healthcheck: null });
    });
  });

  describe("restartInfo", () => {
    it("returns policy, max_retry_count and restart_count", () => {
      expect(ContainerFieldResolvers.restartInfo(fakeInspect)).toEqual({
        restart_info: { policy: "always", max_retry_count: 0, restart_count: 3 },
      });
    });

    it("defaults policy to 'no' when RestartPolicy absent", () => {
      const noPolicy = { ...fakeInspect, HostConfig: { ...fakeInspect.HostConfig, RestartPolicy: undefined } } as unknown as Dockerode.ContainerInspectInfo;
      expect(ContainerFieldResolvers.restartInfo(noPolicy).restart_info.policy).toBe("no");
    });
  });

  describe("resourceLimits", () => {
    it("converts bytes to MB and returns all limit fields", () => {
      const result = ContainerFieldResolvers.resourceLimits(fakeInspect);
      expect(result).toEqual({
        resource_limits: {
          memory_mb: 512,
          memory_reservation_mb: 256,
          memory_swap_mb: 1024,
          nano_cpus: 500000000,
          cpu_shares: 1024,
          cpu_quota: 50000,
          cpu_period: 100000,
          pids_limit: 100,
        },
      });
    });

    it("returns null for unset memory fields", () => {
      const noMem = { ...fakeInspect, HostConfig: { ...fakeInspect.HostConfig, Memory: 0, MemoryReservation: 0, MemorySwap: 0 } } as unknown as Dockerode.ContainerInspectInfo;
      const result = ContainerFieldResolvers.resourceLimits(noMem);
      expect(result.resource_limits.memory_mb).toBeNull();
      expect(result.resource_limits.memory_reservation_mb).toBeNull();
      expect(result.resource_limits.memory_swap_mb).toBeNull();
    });
  });

  describe("stateDetails", () => {
    it("returns pid, exit_code, error, timestamps and boolean flags", () => {
      const result = ContainerFieldResolvers.stateDetails(fakeInspect);
      expect(result).toEqual({
        state_details: {
          pid: 1234,
          exit_code: 0,
          error: null,
          started_at: "2024-01-01T00:00:00Z",
          finished_at: "0001-01-01T00:00:00Z",
          oom_killed: false,
          paused: false,
          restarting: false,
          dead: false,
        },
      });
    });

    it("returns error string when State.Error is set", () => {
      const withError = { ...fakeInspect, State: { ...fakeInspect.State, Error: "OOM" } } as unknown as Dockerode.ContainerInspectInfo;
      expect(ContainerFieldResolvers.stateDetails(withError).state_details.error).toBe("OOM");
    });
  });

  describe("composeMetadata", () => {
    const composeContainer = {
      ...baseContainer,
      Labels: {
        "com.docker.compose.project": "myproject",
        "com.docker.compose.service": "web",
        "com.docker.compose.project.config_files": "docker-compose.yml",
        "com.docker.compose.project.working_dir": "/home/user/myproject",
        "com.docker.compose.container-number": "1",
      },
    } as unknown as Dockerode.ContainerInfo;

    it("returns compose fields when labels present", () => {
      expect(ContainerFieldResolvers.composeMetadata(composeContainer)).toEqual({
        compose_metadata: {
          project: "myproject",
          service: "web",
          config_files: "docker-compose.yml",
          working_dir: "/home/user/myproject",
          container_number: "1",
        },
      });
    });

    it("returns compose_metadata=null for non-compose containers", () => {
      const c = { ...baseContainer, Labels: {} } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.composeMetadata(c)).toEqual({ compose_metadata: null });
    });
  });

  describe("dependencyInfo", () => {
    it("parses comma-separated depends_on label", () => {
      const c = { ...baseContainer, Labels: { "com.docker.compose.depends_on": "db, redis" } } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.dependencyInfo(c)).toEqual({ dependency_info: ["db", "redis"] });
    });

    it("strips condition suffix (service:condition:bool format)", () => {
      const c = { ...baseContainer, Labels: { "com.docker.compose.depends_on": "api:service_started:false,db:service_healthy:true" } } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.dependencyInfo(c)).toEqual({ dependency_info: ["api", "db"] });
    });

    it("returns empty array when depends_on absent", () => {
      const c = { ...baseContainer, Labels: {} } as unknown as Dockerode.ContainerInfo;
      expect(ContainerFieldResolvers.dependencyInfo(c)).toEqual({ dependency_info: [] });
    });
  });
});
