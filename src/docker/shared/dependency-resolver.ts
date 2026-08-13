import Dockerode from "dockerode";

export type ComposeRelation = "dependents" | "dependencies";

export function isExcluded(excluded: Set<string>, id: string, names: string[]): boolean {
  const shortId = id.slice(0, 12).toLowerCase();
  if (excluded.has(shortId) || excluded.has(id.toLowerCase())) return true;
  return names.some((n) => {
    const clean = n.replace(/^\//, "").toLowerCase();
    return excluded.has(clean) || excluded.has(n.toLowerCase());
  });
}

export function getComposeService(c: Dockerode.ContainerInfo): string {
  return (c.Labels?.["com.docker.compose.service"] ?? "").toLowerCase();
}

export function getComposeProject(c: Dockerode.ContainerInfo): string {
  return (c.Labels?.["com.docker.compose.project"] ?? "").toLowerCase();
}

function dependsOnServices(c: Dockerode.ContainerInfo): string[] {
  const raw = c.Labels?.["com.docker.compose.depends_on"] ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().split(":")[0].toLowerCase())
    .filter(Boolean);
}

function resolveTransitive(
  all: Dockerode.ContainerInfo[],
  primaryTargets: Dockerode.ContainerInfo[],
  targetIds: Set<string>,
  excluded: Set<string>,
  relation: ComposeRelation,
): Dockerode.ContainerInfo[] {
  const result: Dockerode.ContainerInfo[] = [];
  const resolvedIds = new Set(targetIds);

  let frontier = primaryTargets;

  while (frontier.length > 0) {
    const next = all.filter((c) => {
      if (resolvedIds.has(c.Id)) return false;
      if (isExcluded(excluded, c.Id, c.Names)) return false;

      if (relation === "dependencies") {
        const cService = getComposeService(c);
        const cProject = getComposeProject(c);
        if (!cService || !cProject) return false;
      }

      return frontier.some((t) => {
        if (getComposeProject(t) !== getComposeProject(c)) return false;

        if (relation === "dependents") {
          return dependsOnServices(c).includes(getComposeService(t));
        }

        const tDeps = dependsOnServices(t);
        return tDeps.length > 0 && tDeps.includes(getComposeService(c));
      });
    });

    for (const d of next) resolvedIds.add(d.Id);
    result.push(...next);
    frontier = next;
  }

  // deepest dependents/dependencies first (leaves before roots); primaries start/stop last
  return result.reverse();
}

export function resolveDependents(
  all: Dockerode.ContainerInfo[],
  primaryTargets: Dockerode.ContainerInfo[],
  targetIds: Set<string>,
  excluded: Set<string>,
): Dockerode.ContainerInfo[] {
  return resolveTransitive(all, primaryTargets, targetIds, excluded, "dependents");
}

export function resolveDependencies(
  all: Dockerode.ContainerInfo[],
  primaryTargets: Dockerode.ContainerInfo[],
  targetIds: Set<string>,
  excluded: Set<string>,
): Dockerode.ContainerInfo[] {
  return resolveTransitive(all, primaryTargets, targetIds, excluded, "dependencies");
}
