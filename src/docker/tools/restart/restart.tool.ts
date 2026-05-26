import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  id: z.string().describe("Container name or ID (partial ID prefix match accepted)."),
});

type Input = z.infer<typeof schema>;

export class RestartContainerTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #handle(input: Input) {
    if (!input.id?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error restarting container: id is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const all = await docker.listContainers({ all: true });
      const ref = input.id.trim().toLowerCase();

      const match = all.find(
        (c) => c.Id.toLowerCase().startsWith(ref) || c.Names.some((n) => n.replace(/^\//, "").toLowerCase() === ref),
      );

      if (!match) throw new Error(`Container not found: ${input.id.trim()}`);

      await docker.getContainer(match.Id).restart();

      const info = await docker.getContainer(match.Id).inspect();

      return {
        restarted: true,
        container: {
          id: match.Id.slice(0, 12),
          name: match.Names[0]?.replace(/^\//, "") ?? match.Id.slice(0, 12),
          status: info.State.Status,
        },
      };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error restarting container: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "restart_container",
      {
        description:
          "Restart a Docker container by name or ID. " +
          "Accepts full container name (exact match) or ID prefix. " +
          "Returns the container id, name, and status after restart.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
