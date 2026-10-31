# Commonplace n8n workflow

Import `commonplace-book-study.json` into n8n. It is inactive and has no AI provider selected. Connect a Chat Model and the webhook Header Auth credential before activation. The app stays disabled until its provider setting is supplied.

Freshness checks are off. The workflow finds educational value in the source book and prepares review/practice drafts; it does not assert that the book is up to date.

See [the setup and data-flow guide](../../docs/n8n-ai.md). Run `npm run workflow:n8n` to rebuild this export after changing the builder or prompt/schema contract.
