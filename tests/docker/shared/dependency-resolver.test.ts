import { describe, it, expect } from "vitest";
import { isExcluded, resolveDependents, resolveDependencies } from "../../../src/docker/shared/dependency-resolver.js";

type Labels = Record<string, string>;

const makeContainer = (id: string, name: string, labels: Labels = {}) => ({
  Id: id,
  Names: [`/${name}`],
  Labels: labels,
});

const makeComposeContainer = (id: string, service: string, project: string, dependsOn: string[] = []) =>
  makeContainer(id, service, {
    "com.docker.compose.project": project,
    "com.docker.compose.service": service,
    ...(dependsOn.length ? { "com.docker.compose.depends_on": dependsOn.join(",") } : {}),
  });

describe("isExcluded", () => {
  const excluded = new Set(["db", "aaa111bbb222"]);

  it("matches by full id", () => {
    expect(isExcluded(excluded, "aaa111bbb222ccc333", ["/web"])).toBe(true);
  });

  it("matches by short id (12 chars)", () => {
    expect(isExcluded(excluded, "aaa111bbb222", ["/web"])).toBe(true);
  });

  it("matches by container name with leading slash", () => {
    expect(isExcluded(excluded, "ddd444eee555", ["/db"])).toBe(true);
  });

  it("matches by raw name", () => {
    expect(isExcluded(excluded, "ddd444eee555", ["db"])).toBe(true);
  });

  it("is case-insensitive (excluded set is lowercased by caller)", () => {
    expect(isExcluded(new Set(["db"]), "ddd444eee555", ["DB"])).toBe(true);
  });

  it("returns false when not excluded", () => {
    expect(isExcluded(excluded, "ggg777hhh888", ["/cache"])).toBe(false);
  });

  it("returns false for empty excluded set", () => {
    expect(isExcluded(new Set(), "ggg777hhh888", ["/cache"])).toBe(false);
  });
});

describe("resolveDependents", () => {
  it("returns [] when there are no dependents", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const targets = [db];
    expect(resolveDependents([db], targets, new Set(targets.map((c) => c.Id)), new Set())).toEqual([]);
  });

  it("finds direct dependents via depends_on", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((c) => c.Id)), new Set());
    expect(result.map((c) => c.Names[0])).toEqual(["/web"]);
  });

  it("resolves transitive dependents (a <- b <- c)", () => {
    const a = makeComposeContainer("aaa000000000000000", "a", "myapp");
    const b = makeComposeContainer("bbb000000000000000", "b", "myapp", ["a"]);
    const c = makeComposeContainer("ccc000000000000000", "c", "myapp", ["b"]);
    const targets = [a];
    const result = resolveDependents([a, b, c], targets, new Set(targets.map((x) => x.Id)), new Set());
    const names = result.map((x) => x.Names[0]);
    expect(names).toContain("/b");
    expect(names).toContain("/c");
  });

  it("orders leaves before roots (c before b, target not included)", () => {
    const a = makeComposeContainer("aaa000000000000000", "a", "myapp");
    const b = makeComposeContainer("bbb000000000000000", "b", "myapp", ["a"]);
    const c = makeComposeContainer("ccc000000000000000", "c", "myapp", ["b"]);
    const targets = [a];
    const result = resolveDependents([a, b, c], targets, new Set(targets.map((x) => x.Id)), new Set());
    const names = result.map((x) => x.Names[0]);
    expect(names.indexOf("/c")).toBeLessThan(names.indexOf("/b"));
    expect(names).not.toContain("/a");
  });

  it("does not include the targets themselves again", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result.map((x) => x.Id)).not.toContain(db.Id);
  });

  it("isolates by Compose project", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "project-a");
    const web = makeComposeContainer("web000000000000000", "web", "project-b", ["db"]);
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("respects exclude", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((x) => x.Id)), new Set(["web"]));
    expect(result).toEqual([]);
  });

  it("skips containers without Labels", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeContainer("web000000000000000", "web");
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("skips candidates with an empty depends_on label", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeContainer("web000000000000000", "web", {
      "com.docker.compose.project": "myapp",
      "com.docker.compose.service": "web",
      "com.docker.compose.depends_on": "",
    });
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("parses long form depends_on entries (service:condition)", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeContainer("web000000000000000", "web", {
      "com.docker.compose.project": "myapp",
      "com.docker.compose.service": "web",
      "com.docker.compose.depends_on": "db:service_started,cache:service_started",
    });
    const targets = [db];
    const result = resolveDependents([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result.map((x) => x.Names[0])).toEqual(["/web"]);
  });
});

describe("resolveDependencies", () => {
  it("returns [] when there are no dependencies", () => {
    const web = makeComposeContainer("web000000000000000", "web", "myapp");
    const targets = [web];
    expect(resolveDependencies([web], targets, new Set(targets.map((c) => c.Id)), new Set())).toEqual([]);
  });

  it("finds direct dependencies", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [web];
    const result = resolveDependencies([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result.map((c) => c.Names[0])).toEqual(["/db"]);
  });

  it("resolves transitive dependencies (web -> api -> db)", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const api = makeComposeContainer("api0000000000000000", "api", "myapp", ["db"]);
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["api"]);
    const targets = [web];
    const result = resolveDependencies([db, api, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    const names = result.map((x) => x.Names[0]);
    expect(names).toContain("/db");
    expect(names).toContain("/api");
  });

  it("orders deepest dependency first (db before api)", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const api = makeComposeContainer("api0000000000000000", "api", "myapp", ["db"]);
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["api"]);
    const targets = [web];
    const result = resolveDependencies([db, api, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    const names = result.map((x) => x.Names[0]);
    expect(names.indexOf("/db")).toBeLessThan(names.indexOf("/api"));
    expect(names).not.toContain("/web");
  });

  it("does not include the targets themselves", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [web];
    const result = resolveDependencies([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result.map((x) => x.Id)).not.toContain(web.Id);
  });

  it("isolates by Compose project", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "project-a");
    const web = makeComposeContainer("web000000000000000", "web", "project-b", ["db"]);
    const targets = [web];
    const result = resolveDependencies([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("respects exclude", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [web];
    const result = resolveDependencies([db, web], targets, new Set(targets.map((x) => x.Id)), new Set(["db"]));
    expect(result).toEqual([]);
  });

  it("skips candidates without project label", () => {
    const noProject = makeContainer("dep111111111111111", "db", { "com.docker.compose.service": "db" });
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [web];
    const result = resolveDependencies([noProject, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("skips candidates without service label", () => {
    const noService = makeContainer("dep222222222222222", "db", { "com.docker.compose.project": "myapp" });
    const web = makeComposeContainer("web000000000000000", "web", "myapp", ["db"]);
    const targets = [web];
    const result = resolveDependencies([noService, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("skips when frontier target has no Labels", () => {
    const noLabels = makeContainer("web000000000000000", "web");
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const targets = [noLabels];
    const result = resolveDependencies([noLabels, db], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });

  it("skips when frontier depends_on label is empty", () => {
    const db = makeComposeContainer("db0000000000000000", "db", "myapp");
    const web = makeContainer("web000000000000000", "web", {
      "com.docker.compose.project": "myapp",
      "com.docker.compose.service": "web",
      "com.docker.compose.depends_on": "",
    });
    const targets = [web];
    const result = resolveDependencies([db, web], targets, new Set(targets.map((x) => x.Id)), new Set());
    expect(result).toEqual([]);
  });
});
