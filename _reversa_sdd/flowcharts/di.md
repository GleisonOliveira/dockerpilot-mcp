# Flowchart — di

```mermaid
flowchart LR
    A[ToolConstructor[]] --> B[ToolContainer]
    B --> C["map(ctor => new ctor(client))"]
    C --> D[BaseTool[]]
    E[PromptConstructor[]] --> F[PromptContainer]
    F --> G["map(ctor => new ctor())"]
    G --> H[BasePrompt[]]
```
