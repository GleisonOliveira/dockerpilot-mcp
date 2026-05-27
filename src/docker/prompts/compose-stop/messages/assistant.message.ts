export function buildAssistantMessage(projectDir: string): string {
  const cdCmd = projectDir ? `cd ${projectDir} && ` : "";
  return `# Docker Compose — Stop All Services

I'll stop the entire project using the Bash tool directly.

---

## 1. Stop all services

Run the following command via Bash:

\`\`\`bash
${cdCmd}docker compose down
\`\`\`

This stops and removes all containers and networks created by Compose. Volumes and images are preserved.

---

## 2. Verify all containers stopped

\`\`\`
tool: list_containers
args: { all: true }
\`\`\`

All Compose containers should be gone or show \`exited\` state.

---

## 3. Remove unused images (if needed)

\`\`\`
tool: prune_images
args: {}
\`\`\`

This removes dangling images left over after stopping the project.

---

## Next step

Execute \`docker compose down\`${projectDir ? ` inside \`${projectDir}\`` : ""} now, then verify with \`list_containers\`.`;
}
