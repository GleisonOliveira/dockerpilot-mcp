import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  name: z.string().describe("Volume name to delete."),
  confirmed: z
    .boolean()
    .describe("User confirmation that the volume should be deleted. Must be explicitly set to true."),
});

type Input = z.infer<typeof schema>;

export class DeleteVolumeTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #getUsingContainers(docker: ReturnType<DockerClient["getDocker"]>, volumeName: string) {
    const containers = await docker
      .listContainers({ all: true, filters: JSON.stringify({ volume: [volumeName] }) })
      .catch(() => []);
    return containers.map((c) => ({
      id: c.Id.slice(0, 12),
      name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
      state: c.State,
    }));
  }

  async #handle(input: Input) {
    if (!input.name?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error deleting volume: name is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const usingContainers = await this.#getUsingContainers(docker, input.name);

      if (!input.confirmed) {
        const { Volumes } = await docker.listVolumes({
          filters: JSON.stringify({ name: [input.name] }),
        });
        const vol = Volumes.find((v) => v.Name === input.name);
        if (!vol) throw new Error(`No volume found with name: ${input.name}`);

        return {
          confirmed: false,
          message: "Deletion aborted: confirmed must be true to proceed. Ask the user to confirm before retrying.",
          preview: {
            name: vol.Name,
            driver: vol.Driver,
            mountpoint: vol.Mountpoint,
            usingContainers,
            warning:
              usingContainers.length > 0
                ? `Volume is in use by ${usingContainers.length} container(s). Docker does not support force-removing a volume in use. Stop and remove those containers first.`
                : null,
          },
        };
      }

      if (usingContainers.length > 0) {
        const names = usingContainers.map((c) => `${c.name} (${c.id}, ${c.state})`).join(", ");
        throw new Error(
          `Cannot delete volume "${input.name}": in use by container(s): ${names}. ` +
            "Docker does not support force-removing a volume in use. Stop and remove those containers first.",
        );
      }

      await docker.getVolume(input.name).remove();

      return { deleted: true, name: input.name };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error deleting volume: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "delete_volume",
      {
        description:
          "Delete a Docker volume by name. " +
          "Requires confirmed=true — always show the preview first and ask the user to confirm before calling with confirmed=true. " +
          "The preview includes which containers are using the volume. " +
          "Note: Docker does not support force-removing a volume in use. " +
          "If the volume is in use, stop and remove the containers first.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
