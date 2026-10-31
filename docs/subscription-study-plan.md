# Whole-book discovery through subscription chat

Planned 31 October 2026. Not implemented. This document extends [plan.md](../plan.md); it does not replace the existing n8n workflow or its verification record.

## Goal and defaults

The learner chooses a book, and AI discovers what is worth learning across its available extracted text. Commonplace prepares and tracks the work, verifies source passages, and turns reviewed results into saved passages, practice, and recall cards. The learner does not choose useful sections in advance.

Use the learner's existing Gemini or Claude chat for both AI stages. Transfers are manual: download a prepared text file, upload it in chat with a copied instruction, then import the returned JSON file or paste its contents. No subscription credentials, provider API, n8n connection, or browser automation is required in this mode. Provider usage allowances still apply; the app cannot observe chat execution or promise an unlimited workload.

Default to whole-book export. If context or response limits prevent a complete result, Commonplace prepares sequential packs and missing-result continuations automatically. This changes the number of transfers, not the scope of discovery. All extracted sections remain in the manifest, including sections that produce no useful ideas.

## Learner journey

1. In Books, choose a ready book and **Use my AI subscription**. Show the title, extracted-text size, available source locations, and a short explanation that the exported file contains book text for uploading to the chosen chat. Export itself is local; Commonplace does not send it to a provider.
2. Choose **Export whole book** and **Copy discovery prompt**. One UTF-8 text file contains instructions, a response-format example, a source manifest, and the complete extracted text with stable source markers. Use available PDF page or EPUB section labels; never invent chapter structure. No notes, progress, other books, original filesystem paths, or credentials are included.
3. Upload the file to chat and paste the prompt. Ask the model to consider every source group, identify educationally useful candidates, and explain their value. It must distinguish reported coverage from unprocessed groups and return exact supporting quotations. Request a downloadable JSON response; copying a complete JSON response is an equally supported fallback.
4. Choose **Import discoveries** and drop a JSON file or paste its contents. Commonplace previews valid candidates, duplicates, invalid items, and missing source groups. The learner confirms importing the valid items; malformed or rejected items receive actionable errors and a prepared correction prompt.
5. When discovery reports cover the book, present the AI's book-wide priorities and reasons. The AI supplies the initial selection; the learner can include or exclude ideas without manually locating passages. Preserve unselected candidates. If discovery arrived in batches, prepare a synthesis pack automatically before claiming a whole-book ranking.
6. Choose **Prepare study material**. Export the selected ideas, verified quotations, necessary surrounding source text, and generation instructions. Upload this file to chat and import its response. The normal case is a second chat round trip; larger selections are automatically divided into numbered packs.
7. Review generated drafts in the existing editor and accept or discard them. Acceptance creates the attributed passage and learning material using the existing Practice and Review behavior. Discovery import alone must not populate the review queue or count as learning progress.

The primary next action follows persisted results: import discoveries, finish missing groups, synthesize discoveries, prepare study material, import material, or review drafts. A downloaded file is never shown as a running AI job. An incomplete analysis may produce provisional study material only through an explicit **Use discoveries so far** action; it remains visibly incomplete.

## Discovery and synthesis

### What the AI should look for

Prioritize explanatory concepts, practical reasoning, mechanisms, tradeoffs, prerequisites, useful worked examples, and misconceptions. Skip trivia and front matter when they add no learning value. Do not force a fixed number of discoveries per chapter. Each idea needs a concise explanation of why it matters and an exact source quotation; generated interpretation is separate from quoted text.

Discovery must precede detailed question generation, so output space is spent on coverage and useful ideas rather than producing cards for the first few pages. Keep freshness research disabled and make no claim that the book reflects current practice.

### Whole-book pass and fallback

- Build an immutable manifest from every nonempty extracted text unit in reading order. Reuse `bookChunks` and its source offsets where suitable. Group chunks for coverage reporting without excluding any content. These are technical groups, not inferred chapters.
- Freeze the source manifest, grouping algorithm version, text digest, and request instructions for an analysis. Re-exporting a pack must preserve its identity. New chunking rules or changed source text require a new analysis, not reinterpretation of old responses.
- The full export includes all manifest chunks. Show actual file size and character count, rather than claiming compatibility with a particular provider's context window.
- A response reports each source group's outcome: `ideas_found`, `no_useful_ideas`, or `not_processed`. A no-idea report needs a short explanation. Missing groups remain unreported; a response-level `complete` flag is never sufficient.
- If the full upload is refused, **Prepare smaller packs** divides the manifest in reading order. If a response is incomplete, **Prepare remaining text** includes only unresolved groups plus limited boundary context. Preserve original source IDs and retain earlier discoveries. No learner-selected page ranges are required.
- Truncated or invalid JSON cannot be safely imported. Keep the submitted text available for correction and prepare smaller response requests. Valid envelopes may contain independently rejected candidates; groups associated with rejected evidence remain unresolved until corrected or explicitly reclassified.
- Once all groups have a resolved report, whole-book synthesis merges equivalent candidates, distinguishes related ideas, and assigns `essential`, `useful`, or `optional` priorities with reasons. A complete single-pass response may contain this synthesis; batched results need a separate synthesis response over all retained candidates.
- Synthesis references existing candidate IDs. Every merged idea retains links to its contributing candidates and source evidence. Rejected or unknown references block that synthesis item. Do not let the model create new unsupported quotations during synthesis.
- If candidate summaries are too large for one synthesis pack, automatically divide them, then prepare a final pass over the intermediate groups. Keep provenance for every original candidate, including those deprioritized. Do not silently summarize only the beginning or truncate the candidate set.

Coverage labels must say what is known: **Export prepared**, **AI reported on 18 of 24 source groups**, **32 source-verified discoveries**, and **8 materials accepted**. These count workflow events and source checks, not proven comprehension or exhaustive discovery. Text-only extraction can omit visual information; “whole book” means all available extracted text, not verified interpretation of every figure or equation.

## Material generation

The generation pack includes synthesis decisions, stable idea IDs, one primary verified passage per idea, and surrounding source context. Supporting references from other chapters can accompany it. Choose the primary passage from validated candidate evidence; the model must not rewrite it. For the first version, each selected idea produces one recall question/answer and one applied multiple-choice question/explanation, matching the existing `materialSchema`.

Import resolves the idea ID back to the server's stored passage rather than accepting new book IDs, offsets, or attribution from the response. Context expansions have explicit bounds and retain source markers. If necessary evidence does not fit, split the work or report the limitation instead of silently dropping it. Generation instructions allow the model to mark an idea as unsupported with a reason instead of inventing an answer.

Missing or invalid materials remain pending and can be re-exported separately. Valid materials enter the existing editable draft flow. Re-importing must not overwrite edited or accepted material, reset review dates, or create duplicate practice entries. Regeneration is explicit and creates a new draft revision; accepted material and its progress are preserved.

## Data and contracts

### Reuse and additions

Reuse `lib/ai/sources.ts`, `materialSchema`, the local request/origin guards, exact-quotation validation, and the current transactional acceptance flow. Extract shared validation/persistence helpers from `lib/ai/jobs.ts` and the approval route only where needed by both workflows. The n8n endpoint and its response contract remain compatible.

The current `AiSuggestion` requires finished questions and answers, so it is not an appropriate storage model for early discoveries. Add a small set of dedicated records:

| Record | Responsibility |
| --- | --- |
| Book analysis | Book relation, frozen source digest/manifest, contract version, creation time, and optional user-entered provider label |
| Exchange pack | Analysis, purpose (`discovery`, `synthesis`, `material`), immutable request IDs/manifest subset, revision, and persisted import receipts |
| Coverage report | One outcome per source group with response provenance; counters derive from these records |
| Discovery | Stable ID, title, educational rationale, verified source ranges, and synthesis/selection relationships |

Store validated response data and receipt hashes; do not retain raw pasted responses by default. Store manifest references and source digests rather than duplicating the entire book in every pack. Preserve enough request metadata to reproduce each export deterministically while the source exists.

Completed material imports can use `AiSuggestion` through an associated `AiRun` explicitly marked as manual/subscription mode, linked to the analysis. Add a mode field with `n8n` as the default for existing runs; scope execution/recovery APIs to n8n runs so a manual import cannot trigger a webhook. Manual status must never be interpreted as an active background job. Keep discovery progress separate from existing n8n chunk counters.

Link each generated draft to its analysis idea and generation revision. Respect the existing unique passage constraint on `AiSuggestion`: merge identical primary passages before generation, and explain that the first release supports one material pair per primary passage per run. Preserve additional idea links rather than silently discarding collisions. Extract the existing draft editor for reuse instead of building a second acceptance implementation.

### Exchange format

All responses have a strict, versioned envelope: `version`, `analysisId`, `packId`, `sourceDigest`, `kind`, and the stage payload. Include an example and explicit JSON escaping instructions in every pack. Server-issued IDs are copied verbatim; candidate-local IDs from the model are mapped to stable app IDs during import. Never trust model-supplied locations or a matching digest alone: resolve and verify the referenced sources against SQLite.

Discovery payloads contain coverage outcomes and candidates (local ID, title, rationale, source chunk ID, exact quote). Synthesis payloads group candidate IDs, assign priorities and reasons, and explicitly account for excluded candidates. Material payloads contain the exported idea ID and the existing material fields, or a declared inability to generate supported material.

Accept a JSON file or one complete JSON object, optionally enclosed in a single Markdown code fence. Do not extract arbitrary fragments, execute generated code, or silently rewrite quotations to make validation pass. Reject wrong-book, wrong-pack, wrong-stage, stale-source, unknown-ID, and unsupported-version responses before saving anything. Candidate-level schema/source errors may be previewed alongside valid candidates.

### Persistence and limits

- Validate on the server with bounded Zod schemas and streaming byte limits. Start with 2 MiB per response, at most 200 candidates/material items per response, 1,000 retained discovery candidates per analysis, and 100 analyses per book. These are application safety limits, not advertised provider allowances; calibrate pack sizes in the real-book checkpoint.
- Existing extraction limits remain authoritative (including 8 million extracted characters). Stream the full export or otherwise bound memory; do not perform a model call during export.
- Preserve the existing 200 accepted-material library limit and make remaining capacity visible before generation/acceptance. Reaching any candidate, draft, or library cap must produce an explicit capacity state; never silently skip content and declare analysis complete. Raising those limits is separate measured work.
- Preview import without mutations, then revalidate against current source and analysis state when committing. Commit retained items, coverage changes, and the receipt in one transaction. Use database uniqueness and revision checks to protect simultaneous imports.
- Receipt hashes plus stable stage/item identities make exact and reordered duplicate imports idempotent. Conflicting corrections require an explicit revision action; they never replace accepted content. Changed discoveries invalidate dependent synthesis/generation requests while preserving accepted study material.
- Resume from persisted receipts and unresolved IDs after restart. A new upload is not required just because the app restarted. Cancelling/discarding an analysis does not delete existing accepted learning material.
- Additive migrations preserve all current notes, progress, sources, and n8n history. Book deletion cascades through analysis packs/discoveries; accepted material follows the existing keep/remove passage policy. A response for a deleted source is rejected. Normal stopped-app backups include the new records; downloaded files outside the data directory are managed by the learner.

## Interface and scope

Follow [DESIGN.md](../DESIGN.md). Add the subscription workflow within the selected book using the current typography, flat surfaces, buttons, and source inspection. Keep the optional n8n controls distinct. Subscription export/import must work when `/api/ai/config` reports no configured provider.

Use a short step list and one main next action. Show discoveries as readable rows with educational rationale, priority, attribution, and an inspect-source action. Hide schema/ID details under error details; normal use must not require JSON editing. File upload and paste are both labeled, keyboard accessible alternatives. Preserve pasted input after errors, announce import summaries, and move focus predictably after successful actions. Show empty results and missing coverage separately.

First release supports existing text-based PDF/EPUB imports, including article-length files. Defer URL fetching, pasted article ingestion, OCR, diagram analysis, automatic provider login/chat control, local models, embeddings, new scheduling rules, and freshness research. Do not introduce a new dependency or external service merely for export/import.

## Delivery checkpoints

1. **Manifest and whole-book export.** Add contracts, additive storage, immutable source manifests, deterministic text export, and the subscription entry point. Validate that every nonempty extracted unit is represented and private app data is excluded. Checkpoint: an authored multi-section book exports with complete source markers and usable instructions.
2. **Discovery import and recovery.** Add file/paste preview and confirmation, exact-source checks, persisted coverage, duplicate/conflict handling, correction prompts, and automatically prepared remaining/smaller packs. Checkpoint: partial results survive restart and finishing later sections updates coverage without duplicating earlier discoveries.
3. **Whole-book synthesis.** Import direct full-book ranking or prepare synthesis packs for batched results; persist priorities, merged provenance, and the default AI selection. Handle large candidate sets with bounded intermediate passes. Checkpoint: related ideas from early and late sections are compared without losing their references, and missing groups remain visible.
4. **Material export/import and acceptance.** Prepare generation packs, import into the shared draft editor, and reuse acceptance/Practice/Review. Include missing-material continuation and revision handling. Checkpoint: two chat round trips work for a small book, from export to attributed practice and cards, without n8n settings.
5. **Verification and usage documentation.** Run focused API/migration/browser regressions and `npm run check`; document the workflow, external file handling, limits, and honest coverage labels. Try one representative real book through the learner's chosen subscription chat with explicit upload by the learner; record actual prompt/format/quality issues. Do not treat fixture tests as evidence of live provider quality.

## Acceptance criteria and focused tests

- The learner selects only a book; all available extracted text is exported or accounted for in automatic fallback packs. Test early/middle/late content, overlapping chunks, empty units, Unicode, and large EPUB sections. No silent truncation or fabricated chapter/page labels.
- Discovery and generation both operate with n8n/provider settings absent. No app-initiated external requests occur in subscription mode. Generated study material still requires source review and explicit acceptance.
- A partial response leaves missing source groups visible and generates the correct continuation. Explicit no-idea reports are distinct from missing data. Model claims of completion cannot bypass unresolved groups, rejected evidence, or capacity errors.
- Unknown/stale IDs, altered or ambiguous quotations, cross-book references, malformed/truncated/oversized JSON, embedded source instructions, and invalid choices cannot persist invalid learning material. Show item-specific errors without logging book text or secrets.
- Synthesis retains every candidate's provenance or explicit exclusion and never creates unsupported source evidence. Generation uses the original text, not only AI summaries. Test same-passage collisions and missing/invalid material responses.
- Repeated/reordered/concurrent imports and repeated acceptance are idempotent. Corrections cannot overwrite accepted content or progress. Test restart, migration from existing data, full-directory backup/restore, cancellation, and both book-deletion policies.
- Browser checks cover export/download, upload and paste, preview/confirm, failure correction, missing-result continuation, draft review, Practice/Review entry, keyboard focus, narrow layout, and accessibility. Existing n8n and study tests still pass.
- The real-book checkpoint records useful ideas from throughout the text, quotation accuracy, practice-answer support, duplicates, transfer count, and user effort. Do not declare exhaustive discovery or universal provider compatibility from one successful book.
