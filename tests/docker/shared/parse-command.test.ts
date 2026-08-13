import { describe, it, expect } from "vitest";
import { parseCommand } from "../../../src/docker/shared/parse-command.js";

describe("parseCommand", () => {
  it("returns [] for empty string", () => {
    expect(parseCommand("")).toEqual([]);
  });

  it("returns [] for whitespace-only string", () => {
    expect(parseCommand("   ")).toEqual([]);
  });

  it("splits a simple command on spaces", () => {
    expect(parseCommand("ls -la /app")).toEqual(["ls", "-la", "/app"]);
  });

  it("splits on tabs as separators", () => {
    expect(parseCommand("echo\thello")).toEqual(["echo", "hello"]);
  });

  it("handles multiple consecutive whitespace", () => {
    expect(parseCommand("sh   -c   'echo ok'")).toEqual(["sh", "-c", "echo ok"]);
  });

  it("preserves a single-quoted argument as one token", () => {
    expect(parseCommand("sh -c 'echo \"a b\"'")).toEqual(["sh", "-c", 'echo "a b"']);
  });

  it("preserves a double-quoted argument as one token", () => {
    expect(parseCommand('printf "%s %s" "a b"')).toEqual(["printf", "%s %s", "a b"]);
  });

  it("keeps empty quoted argument as empty string token", () => {
    expect(parseCommand("echo ''")).toEqual(["echo", ""]);
  });

  it("does not expand escape inside single quotes", () => {
    expect(parseCommand("echo 'a\\nb'")).toEqual(["echo", "a\\nb"]);
  });

  it("honors backslash escapes outside quotes", () => {
    expect(parseCommand("echo a\\ b")).toEqual(["echo", "a b"]);
  });

  it("handles escaped quotes outside quotes", () => {
    expect(parseCommand('echo \\"quoted\\"')).toEqual(["echo", '"quoted"']);
  });

  it("allows escaped quote inside double quotes", () => {
    expect(parseCommand('echo "he said \\"hi\\""')).toEqual(["echo", 'he said "hi"']);
  });

  it("treats unclosed single quote as quoted until end", () => {
    expect(parseCommand("echo 'unterminated")).toEqual(["echo", "unterminated"]);
  });

  it("treats unclosed double quote as quoted until end", () => {
    expect(parseCommand('echo "unterminated')).toEqual(["echo", "unterminated"]);
  });

  it("trims leading whitespace", () => {
    expect(parseCommand("   echo hello")).toEqual(["echo", "hello"]);
  });

  it("does not produce a trailing empty token from trailing whitespace", () => {
    expect(parseCommand("echo hello   ")).toEqual(["echo", "hello"]);
  });

  it("supports mixed quoting in one command", () => {
    expect(parseCommand(`sh -c 'echo "a b"'`)).toEqual(["sh", "-c", 'echo "a b"']);
  });

  it("keeps the raw content of a double-quoted token (no word splitting)", () => {
    expect(parseCommand('echo "a  b"')).toEqual(["echo", "a  b"]);
  });

  it("backslash before backslash inside double quotes collapses to single backslash", () => {
    expect(parseCommand('echo "a\\\\b"')).toEqual(["echo", "a\\b"]);
  });
});
