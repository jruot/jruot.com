+++
title = "Context Management in AI Development"
date = 2025-11-02T10:20:00-07:00
draft = false
description = "Strategies for managing LLM context during AI-assisted coding to keep changes focused, accurate, and maintainable."
+++

The most important aspect of AI-assisted coding is context management. Without a structured approach, LLMs can drift or overwrite logic. These are the strategies I have found most effective:

- Keep tasks small and scoped to a single goal.
- Maintain a clear to-do list for the agent, rather than using single, long prompts.
- Split large files and components to give each a focused purpose.
- Use tools that support separated contexts for different tasks.
- Guide the AI by pointing it to relevant files and folders.
- Use Model Context Protocols (MCPs) like Context7 to automatically fetch up-to-date documentation.
- Summarize and compact the current context frequently to keep the AI focused.
- Pull in only what is needed. Do not load the whole repo or documentation.
- Know the context window size of the model. For example, GLM 4.6 has 200k tokens context size.
