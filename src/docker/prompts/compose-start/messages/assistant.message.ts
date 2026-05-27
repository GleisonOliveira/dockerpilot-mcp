export function buildAssistantMessage(projectDir: string): string {
  const cdCmd = projectDir ? `cd ${projectDir} && ` : "";
  return `# Docker Compose — Start All Services

I'll bring up the entire project in detached mode using the Bash tool directly.

---

## 1. Start all services

Run the following command via Bash:

\`\`\`bash
${cdCmd}docker compose up -d
\`\`\`

This starts all services defined in \`docker-compose.yml\` (or \`compose.yaml\`) in the background.

---

## 2. Verify services are running

After the command completes, confirm all containers are up:

\`\`\`
tool: list_containers
args: { all: true }
\`\`\`

Look for **State: running** on all services. Any service in \`exited\` or \`restarting\` state needs investigation.

---

## 3. If a service fails to start

- Check logs with the \`container_logs\` tool — get the container ID from \`list_containers\` first:

\`\`\`
tool: container_logs
args: { id: "<container-id>", tail: 50 }
\`\`\`

- Common causes: port conflict, missing environment variable, dependency not ready
- If it's a dependency ordering issue, \`docker compose up -d\` will retry — wait a moment and re-check with \`list_containers\`

---

## Next step

Execute \`docker compose up -d\`${projectDir ? ` inside \`${projectDir}\`` : ""} now.`;
}
