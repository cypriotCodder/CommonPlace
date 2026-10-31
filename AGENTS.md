# Agent instructions

- Follow the user's instructions and any more specific nested `AGENTS.md`. Read [DESIGN.md](DESIGN.md) before changing the UI.
- Inspect existing code and conventions first. Preserve unrelated work and existing behavior; keep changes focused and avoid speculative features or abstractions.
- Reuse existing components and utilities when appropriate. Keep code clear, cohesive, typed, and easy to change; derive state instead of duplicating it. Use stable IDs for persistent data.
- Validate input at boundaries, handle errors explicitly, protect secrets and user data, and enforce authorization on the server. Make persistence and migrations safe for existing notes and progress.
- Avoid unnecessary dependencies, repeated work, and unbounded operations. Optimize measured or evident bottlenecks without sacrificing clarity or accessibility.
- Use semantic, responsive, keyboard-accessible UI with visible focus and accurate feedback. Follow the design system and attribute learning sources.
- Add focused tests for meaningful behavior and regressions. Run relevant tests, checks, and builds; report anything not verified. Update documentation when behavior or workflows change.
