+++
title = "Keeping AI-Generated Code Maintainable"
date = 2025-11-04T10:40:00-07:00
draft = false
description = "Practices I use to keep AI-generated code maintainable, including review discipline, testing, and context hygiene."
+++

While LLMs make writing code easier, I have found that keeping it maintainable requires a disciplined approach. Here are some of the practices I follow to keep my AI-generated codebases clean and easy to manage:

- **Versioned prompts:** Save useful feature prompts in files. Version them.
- **Automatic formatting:** Use automated formatting tools such as Prettier, ESLint, or clang so the model focuses on logic, not layout.
- **Linting and type checks:** Run static analysis after each AI change. Catch unused variables, missing types, and unsafe imports early.
- **Constant code review:** Treat every AI change like a pull request from a junior developer. Read diffs and ask the model to explain decisions before merging.
- **Git discipline:** Commit and branch often. Small, isolated commits make it easy to revert or compare outputs.
- **Unit tests:** Generate them after the code works and is verified. Use tests to lock in correct behavior and prevent regressions.
- **Context hygiene:** Do not use AI for linting or formatting. Compact context often. Keep the context focused on reasoning and refactoring.
- **Do not be afraid to throw away AI code:** If it feels wrong, start over. Frequent commits make it safe to revert. Regenerating code costs seconds. Maintaining it costs hours.
