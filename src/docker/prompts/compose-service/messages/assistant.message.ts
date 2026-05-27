export function buildAssistantMessage(serviceName: string, action: string): string {
  const nameArg = serviceName || "<service-name>";
  const actionNote = action ? `\n> Requested action: **${action}**\n` : "";

  return `# Docker Compose — Manage Individual Service
${actionNote}
I'll manage the \`${nameArg}\` service using the MCP tools available in this session.

---

## 0. Read the Compose file to identify services

Before anything else, read the \`docker-compose.yml\` (or \`compose.yaml\`) file in the project directory to discover all service names and their configurations:

\`\`\`
tool: exec_command
args: { command: "cat", args: ["docker-compose.yml"] }
\`\`\`

If not found, try \`compose.yaml\`, \`docker-compose.yaml\`, or \`compose.yml\`. Look for the \`services:\` key — each entry is a service name. Note any \`container_name:\` overrides, as those become the exact container name instead of the default \`<project>-<service>-1\` pattern.

---

## 1. Find the running container name

Compose services map to containers with names like \`<project>-<service>-1\`. List all containers to confirm the exact name:

\`\`\`
tool: list_containers
args: { all: true }
\`\`\`

Filter by name if needed — pass \`name: "${nameArg}"\` to narrow results.

---

## 2. Start the service

Always preview first with \`dryRun: true\`, then execute:

\`\`\`
tool: start_containers
args: { names: ["${nameArg}"], startDependencies: true, dryRun: true }
\`\`\`

\`\`\`
tool: start_containers
args: { names: ["${nameArg}"], startDependencies: true }
\`\`\`

> \`startDependencies: true\` ensures services this one depends on (e.g. database) start first.

---

## 3. Stop the service

Preview, then execute:

\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], stopDependents: true, dryRun: true }
\`\`\`

\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], stopDependents: true }
\`\`\`

> \`stopDependents: true\` also stops any services that depend on this one.

If the container is unresponsive, force-stop:

\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], force: true, stopDependents: true }
\`\`\`

---

## 4. Restart the service

\`\`\`
tool: restart_container
args: { name: "${nameArg}" }
\`\`\`

For a full cycle (stop → start with dependency handling):

\`\`\`
1. stop_containers  → names: ["${nameArg}"], stopDependents: true
2. start_containers → names: ["${nameArg}"], startDependencies: true
\`\`\`

---

## 5. Check logs after action

Get the container ID from \`list_containers\`, then:

\`\`\`
tool: container_logs
args: { id: "<container-id>", tail: 30 }
\`\`\`

---

## Next step

Read the Compose file first to identify the service, then run \`list_containers\` to get the exact container name for \`${nameArg}\`, then apply the requested action.`;
}
