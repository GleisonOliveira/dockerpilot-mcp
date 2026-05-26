import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const RESTART_POLICIES = ["no", "always", "on-failure", "unless-stopped"] as const;

const schema = z.object({
  image: z.string().describe("Docker image name and optional tag (e.g. nginx:latest, ubuntu:22.04). Required."),

  name: z.string().optional().describe("Container name. If omitted, Docker generates a random name."),

  command: z
    .array(z.string())
    .optional()
    .describe("Command to run inside the container (e.g. ['npm', 'start']). Overrides the image CMD."),

  env: z
    .record(z.string())
    .optional()
    .describe("Environment variables as key-value pairs (e.g. { NODE_ENV: 'production', PORT: '3000' })."),

  ports: z
    .array(
      z.object({
        host: z.string().describe("Host port or host:port (e.g. '8080' or '0.0.0.0:8080')."),
        container: z.string().describe("Container port with optional protocol (e.g. '80' or '80/tcp')."),
      }),
    )
    .optional()
    .describe("Port mappings from host to container."),

  volumes: z
    .array(z.string())
    .optional()
    .describe(
      "Volume bindings in Docker format: 'volume_name:/container/path', '/host/path:/container/path', " +
        "or '/host/path:/container/path:ro' for read-only.",
    ),

  networks: z
    .array(z.string())
    .optional()
    .describe("Names of Docker networks to connect the container to (e.g. ['my-network', 'bridge'])."),

  restart_policy: z
    .enum(RESTART_POLICIES)
    .optional()
    .describe(
      "Restart policy: no (default), always (always restart), on-failure (restart on non-zero exit), " +
        "unless-stopped (restart unless manually stopped).",
    ),

  healthcheck: z
    .object({
      test: z
        .array(z.string())
        .describe(
          "Health check command. Use ['NONE'] to disable, ['CMD', 'curl', '-f', 'http://localhost'] for shell exec, " +
            "or ['CMD-SHELL', 'curl -f http://localhost'] for shell string.",
        ),
      interval_seconds: z.number().optional().describe("Interval between health checks in seconds. Default: 30."),
      timeout_seconds: z.number().optional().describe("Timeout for each health check in seconds. Default: 30."),
      retries: z.number().optional().describe("Consecutive failures needed to mark unhealthy. Default: 3."),
      start_period_seconds: z
        .number()
        .optional()
        .describe("Grace period before health checks count against retries in seconds. Default: 0."),
    })
    .optional()
    .describe("Container health check configuration."),

  resources: z
    .object({
      memory_mb: z.number().optional().describe("Memory limit in megabytes (e.g. 512 for 512 MB)."),
      cpu_shares: z
        .number()
        .optional()
        .describe("CPU shares relative weight (default 1024). Lower values = less CPU priority."),
      cpu_quota: z
        .number()
        .min(1000)
        .optional()
        .describe(
          "CPU quota in microseconds per cpu_period. Minimum 1000 (1ms). E.g. 50000 = 50% of one CPU core (with default period of 100000).",
        ),
      cpu_period: z
        .number()
        .min(1000)
        .optional()
        .describe("CPU period in microseconds. Default: 100000 (100ms). Minimum 1000."),
    })
    .optional()
    .describe("Resource limits for the container."),

  labels: z
    .record(z.string())
    .optional()
    .describe("Key-value labels to attach to the container (e.g. { env: 'prod', app: 'web' })."),
});

type Input = z.infer<typeof schema>;

export class CreateContainerTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #buildEnv(env: Record<string, string>): string[] {
    return Object.entries(env).map(([k, v]) => `${k}=${v}`);
  }

  #buildExposedPorts(ports: NonNullable<Input["ports"]>): Record<string, object> {
    const exposed: Record<string, object> = {};
    for (const p of ports) {
      const containerPort = p.container.includes("/") ? p.container : `${p.container}/tcp`;
      exposed[containerPort] = {};
    }
    return exposed;
  }

  #buildPortBindings(ports: NonNullable<Input["ports"]>): Record<string, { HostPort: string }[]> {
    const bindings: Record<string, { HostPort: string }[]> = {};
    for (const p of ports) {
      const containerPort = p.container.includes("/") ? p.container : `${p.container}/tcp`;
      bindings[containerPort] = [{ HostPort: p.host }];
    }
    return bindings;
  }

  #buildHealthcheck(hc: NonNullable<Input["healthcheck"]>) {
    return {
      Test: hc.test,
      Interval: hc.interval_seconds !== undefined ? hc.interval_seconds * 1e9 : undefined,
      Timeout: hc.timeout_seconds !== undefined ? hc.timeout_seconds * 1e9 : undefined,
      Retries: hc.retries,
      StartPeriod: hc.start_period_seconds !== undefined ? hc.start_period_seconds * 1e9 : undefined,
    };
  }

  async #handle(input: Input) {
    if (!input.image?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error creating container: image is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const stream = await docker.pull(input.image.trim());
      await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(stream, (err: Error | null) => (err ? reject(err) : resolve()));
      });

      const exposedPorts = input.ports ? this.#buildExposedPorts(input.ports) : undefined;
      const portBindings = input.ports ? this.#buildPortBindings(input.ports) : undefined;

      const container = await docker.createContainer({
        Image: input.image.trim(),
        name: input.name,
        Cmd: input.command,
        Env: input.env ? this.#buildEnv(input.env) : undefined,
        ExposedPorts: exposedPorts,
        Healthcheck: input.healthcheck ? this.#buildHealthcheck(input.healthcheck) : undefined,
        Labels: input.labels,
        HostConfig: {
          Binds: input.volumes,
          PortBindings: portBindings,
          RestartPolicy: input.restart_policy ? { Name: input.restart_policy } : undefined,
          Memory: input.resources?.memory_mb !== undefined ? input.resources.memory_mb * 1024 * 1024 : undefined,
          CpuShares: input.resources?.cpu_shares,
          CpuQuota: input.resources?.cpu_quota,
          CpuPeriod:
            input.resources?.cpu_quota !== undefined
              ? (input.resources?.cpu_period ?? 100000)
              : input.resources?.cpu_period,
        },
        NetworkingConfig:
          input.networks && input.networks.length > 0
            ? {
                EndpointsConfig: Object.fromEntries(input.networks.map((n) => [n, {}])),
              }
            : undefined,
      });

      await container.start();
      const info = await container.inspect();
      const shortId = info.Id.slice(0, 12);

      return {
        created: true,
        started: true,
        container: {
          id: shortId,
          name: info.Name.replace(/^\//, ""),
          image: info.Config.Image,
          status: info.State.Status,
          ports: info.HostConfig.PortBindings ?? {},
          networks: Object.keys(info.NetworkSettings.Networks ?? {}),
          restartPolicy: info.HostConfig.RestartPolicy?.Name ?? "no",
        },
      };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error creating container: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "create_container",
      {
        description:
          "Create a Docker container without starting it. " +
          "image is required (e.g. nginx:latest). " +
          "name: optional container name. " +
          "command: overrides image CMD (array of strings). " +
          "env: environment variables as key-value pairs. " +
          "ports: array of { host, container } port mappings (e.g. host='8080', container='80'). " +
          "volumes: bind mounts or named volumes in Docker format (e.g. 'myvolume:/app/data', '/host/path:/container/path:ro'). " +
          "networks: list of Docker network names to connect. " +
          "restart_policy: no | always | on-failure | unless-stopped. " +
          "healthcheck: { test, interval_seconds, timeout_seconds, retries, start_period_seconds }. " +
          "resources: { memory_mb, cpu_shares, cpu_quota, cpu_period }. " +
          "labels: key-value metadata. " +
          "After creation, use start_containers to start the container.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
