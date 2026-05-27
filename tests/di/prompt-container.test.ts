import { describe, it, expect } from "vitest";
import { PromptContainer } from "../../src/di/prompt-container.js";
import { BasePrompt } from "../../src/docker/shared/base.prompt.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function makePromptClass(name: string): new () => BasePrompt {
  return class extends BasePrompt {
    public readonly name = name;
    register(_server: McpServer): void {}
  };
}

describe("PromptContainer", () => {
  it("instantiates one prompt per class", () => {
    const A = makePromptClass("A");
    const B = makePromptClass("B");
    const container = new PromptContainer({ promptClasses: [A, B] });
    expect(container.getPrompts()).toHaveLength(2);
    expect(container.getPrompts()[0]).toBeInstanceOf(A);
    expect(container.getPrompts()[1]).toBeInstanceOf(B);
  });

  it("returns empty list when no prompt classes configured", () => {
    const container = new PromptContainer({ promptClasses: [] });
    expect(container.getPrompts()).toEqual([]);
  });

  it("getPrompts returns same instance on multiple calls", () => {
    const A = makePromptClass("A");
    const container = new PromptContainer({ promptClasses: [A] });
    expect(container.getPrompts()).toBe(container.getPrompts());
  });
});
