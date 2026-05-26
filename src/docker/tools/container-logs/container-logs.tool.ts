import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  id: z.string().describe("Container ID (full or prefix). Name not accepted."),
  tail: z
    .number()
    .int()
    .positive()
    .optional()
    .default(5)
    .describe("Number of log lines to return from the end. Defaults to 5."),
});

type Input = z.infer<typeof schema>;

export class ContainerLogsTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #handle(input: Input) {
    if (!input.id?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error fetching logs: id is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const all = await docker.listContainers({ all: true });
      const ref = input.id.trim().toLowerCase();

      const match = all.find((c) => c.Id.toLowerCase().startsWith(ref));

      if (!match) throw new Error(`Container not found: ${input.id.trim()}`);

      const container = docker.getContainer(match.Id);

      const stream = await container.logs({
        stdout: true,
        stderr: true,
        tail: input.tail,
      });

      const raw = Buffer.isBuffer(stream) ? stream : Buffer.from(stream as string, "binary");

      // Strip dockerode multiplexed stream headers (8-byte prefix per frame)
      const lines: string[] = [];
      let offset = 0;
      while (offset + 8 <= raw.length) {
        const size = raw.readUInt32BE(offset + 4);
        if (offset + 8 + size > raw.length) break;
        lines.push(raw.subarray(offset + 8, offset + 8 + size).toString("utf8"));
        offset += 8 + size;
      }
      const logs = lines.length > 0 ? lines.join("") : raw.toString("utf8");

      return {
        containerId: match.Id.slice(0, 12),
        tail: input.tail,
        logs: logs
          .trimEnd()
          .split("\n")
          .filter((l) => l.length > 0),
      };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error fetching logs: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "container_logs",
      {
        description:
          "Fetch the last N log lines from a Docker container. " +
          "Accepts container ID (full or prefix) — names are NOT accepted. " +
          "Returns stdout and stderr combined. Defaults to last 5 lines.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
