import Dockerode from "dockerode";

export class ContainerFieldResolvers {
  static ports(c: Dockerode.ContainerInfo) {
    return { ports: c.Ports };
  }

  static mounts(c: Dockerode.ContainerInfo) {
    return { mounts: c.Mounts };
  }

  static networks(c: Dockerode.ContainerInfo) {
    return {
      networks: Object.entries(c.NetworkSettings.Networks).map(([name, net]) => ({
        name,
        ip: net.IPAddress,
        gateway: net.Gateway,
        mac: net.MacAddress,
        network_id: net.NetworkID.slice(0, 12),
      })),
    };
  }

  static labels(c: Dockerode.ContainerInfo) {
    return { labels: c.Labels ?? {} };
  }

  static async usage(c: Dockerode.ContainerInfo, docker: Dockerode) {
    if (c.State !== "running") return { usage: null };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: any = await docker.getContainer(c.Id).stats({ stream: false });
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const numCpus = stats.cpu_stats.online_cpus ?? stats.cpu_stats.cpu_usage.percpu_usage?.length ?? 1;
      const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;
      const memUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache ?? 0);
      const memLimit = stats.memory_stats.limit;

      return {
        usage: {
          cpu_percent: Math.round(cpuPercent * 100) / 100,
          mem_usage_mb: Math.round((memUsage / 1024 / 1024) * 100) / 100,
          mem_limit_mb: Math.round((memLimit / 1024 / 1024) * 100) / 100,
          mem_percent: Math.round((memUsage / memLimit) * 10000) / 100,
        },
      };
    } catch {
      return { usage: null };
    }
  }

  static healthcheck(info: Dockerode.ContainerInspectInfo) {
    const health = info.State.Health;
    return {
      healthcheck: health
        ? {
            status: health.Status,
            failing_streak: health.FailingStreak,
            last_log: health.Log?.at(-1) ?? null,
          }
        : null,
    };
  }

  static restartInfo(info: Dockerode.ContainerInspectInfo) {
    const policy = info.HostConfig.RestartPolicy;
    return {
      restart_info: {
        policy: policy?.Name ?? "no",
        max_retry_count: policy?.MaximumRetryCount ?? 0,
        restart_count: info.RestartCount,
      },
    };
  }

  static composeMetadata(c: Dockerode.ContainerInfo) {
    const labels = c.Labels ?? {};
    const project = labels["com.docker.compose.project"];
    if (!project) return { compose_metadata: null };

    return {
      compose_metadata: {
        project,
        service: labels["com.docker.compose.service"] ?? null,
        config_files: labels["com.docker.compose.project.config_files"] ?? null,
        working_dir: labels["com.docker.compose.project.working_dir"] ?? null,
        container_number: labels["com.docker.compose.container-number"] ?? null,
      },
    };
  }

  static dependencyInfo(c: Dockerode.ContainerInfo) {
    const labels = c.Labels ?? {};
    const raw = labels["com.docker.compose.depends_on"];
    return {
      dependency_info: raw
        ? raw
            .split(",")
            .map((s) => s.trim().split(":")[0])
            .filter(Boolean)
        : [],
    };
  }

  static resourceLimits(info: Dockerode.ContainerInspectInfo) {
    const hc = info.HostConfig;
    return {
      resource_limits: {
        memory_mb: hc.Memory ? Math.round(hc.Memory / 1024 / 1024) : null,
        memory_reservation_mb: hc.MemoryReservation ? Math.round(hc.MemoryReservation / 1024 / 1024) : null,
        memory_swap_mb: hc.MemorySwap ? Math.round(hc.MemorySwap / 1024 / 1024) : null,
        nano_cpus: hc.NanoCpus ?? null,
        cpu_shares: hc.CpuShares ?? null,
        cpu_quota: hc.CpuQuota ?? null,
        cpu_period: hc.CpuPeriod ?? null,
        pids_limit: hc.PidsLimit ?? null,
      },
    };
  }

  static stateDetails(info: Dockerode.ContainerInspectInfo) {
    const s = info.State;
    return {
      state_details: {
        pid: s.Pid,
        exit_code: s.ExitCode,
        error: s.Error || null,
        started_at: s.StartedAt,
        finished_at: s.FinishedAt,
        oom_killed: s.OOMKilled,
        paused: s.Paused,
        restarting: s.Restarting,
        dead: s.Dead,
      },
    };
  }
}
