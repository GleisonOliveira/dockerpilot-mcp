export function buildUserMessage(serviceName?: string, action?: string): string {
  const svcRef = serviceName ? `the \`${serviceName}\` service` : "a specific Docker Compose service";
  const actionRef = action ? ` — action requested: **${action}**` : "";
  return `I want to manage ${svcRef} individually${actionRef}. Please help me start, stop, or restart it.`;
}
