# Commonplace design system

This document is the design reference for Commonplace. Use it when creating or changing a page, component, or interaction. The existing `index.html` prototype is the visual baseline; its current source is outside this repository at `/Users/nedim/Documents/Codex/2026-10-27/files-pasted-by-the-user-design/outputs/commonplace/dist/index.html`. If an implementation detail and this document differ, check the prototype and update this reference deliberately when the design changes.

## Product character

Commonplace is a study space for new computer science graduates. It connects concepts across reading, practice, and review, and helps learners decide what to study next. It should feel like a well-designed technical book on a quiet, modern study desk: thoughtful, clear, encouraging, and comfortable for sustained use.

- Put the concept and the next useful action first. Let content breathe.
- Explain technical ideas plainly without talking down to the learner. Encourage reflection rather than competition.
- Use editorial typography, fine rules, restrained color, and flat surfaces to establish hierarchy. Avoid decorative complexity, glossy effects, oversized rounded cards, and dashboard clutter.
- Keep the three modes connected. A learner should always understand where they are and how to move between reading, practice, and review.
- Progress describes actions taken, not mastery. Never imply that a completed activity or a confident response proves understanding.

## Foundations

These values are taken from the prototype. Introduce named tokens in the application rather than copying literal values throughout components. Additional values below are existing supporting colors, not a requirement to use every shade.

### Color

| Token | Value | Primary use |
| --- | --- | --- |
| `ink` | `#24312b` | Primary text, strong rules |
| `muted` | `#59685e` | Supporting text (darkened during release contrast checks) |
| `paper` | `#f6f6f0` | Application background |
| `surface` | `#fffefa` | Reading, challenge, card and input surfaces |
| `green` | `#325c4b` | Primary actions and emphasis |
| `pale` | `#e8eee5` | Soft green surfaces |
| `line` | `#d9ded4` | Borders and separators |
| `gold` | `#a8773f` | Restrained warm accent |

Supporting colors in the demo include sidebar `#eef1e9`, active navigation `#dce7dc`, featured study surface `#e5ece2`, code surface `#eff3ed`, and review surface `#f1eee3`. Use green-tinted neutrals for the main interface; use warm tones sparingly for review and feedback. Maintain readable contrast for all text and interactive states: some muted prototype colors may need darkening in production. Do not rely on color alone to communicate a state.

### Typography

- **Display and editorial headings:** DM Serif Display, falling back to Georgia/serif; regular weight. Prototype sizes: page heading 46–49px on desktop, 38px on small screens; section headings about 24–28px. Use tight but comfortable line height and restrained negative letter spacing.
- **Interface text:** DM Sans, falling back to sans-serif; body baseline 15px. Use 16px for introductory copy, 13px for compact controls and secondary content, and 11–12px for metadata.
- **Reading body:** Georgia/serif at 17px with approximately 1.85 line height; 16px on small screens. Keep paragraphs comfortable to scan and avoid long measure.
- **Code and sequence numbers:** IBM Plex Mono, falling back to monospace. Code is slightly smaller than surrounding text and remains selectable and scrollable when needed.
- **Eyebrows and labels:** small, bold uppercase interface text with approximately `.12em` letter spacing. Use for orientation, not for lengthy copy.

Use semantic heading levels in document order; visual size does not determine HTML hierarchy. Preserve readable fallback fonts if web fonts fail.

### Spacing, shape, and surfaces

The prototype uses generous page padding, compact control padding, and clear vertical separation. Typical values are 8–12px within a control, 16–25px between related elements, and 30–52px between major groups. Desktop page content uses roughly 52px top padding and 5.2% horizontal padding; the mobile layout uses 32px top and 20px horizontal padding.

Surfaces are flat and mostly rectangular, with fine 1px borders and 2–4px corner radii on controls. Avoid shadows as a default. A tinted surface or horizontal rule should usually be enough to group content. Keep one clear focal area on each page rather than nesting boxes.

## Layout and navigation

- **Application shell:** a 225px sidebar on desktop with brand, primary navigation, and a small closing note. A restrained top bar contains the current location and learner context. The main content is centered with a maximum width of approximately 1230px.
- **Study desk:** use a wider main column and a narrower supporting column, approximately `1.75fr / minmax(260px, .82fr)`, separated by 30px. The featured next step leads; concept rows and progress follow.
- **Reading:** combine a bounded article column (up to 720px) with a 225px notes and contents aside, separated by generous space. The article is a white paper surface with substantial padding. Keep the aside sticky only where there is room.
- **Practice and review:** use a focused column up to 760px wide. Place the scenario or card on a single bordered paper surface, with supporting context above it.
- **Flow navigation:** show the relationship between study desk, reading, practice, and review. Indicate the current step in text as well as visually. Primary navigation indicates the active destination.

At widths of 900px and below, turn the sidebar into a top navigation, stack reading and aside, and remove sticky positioning. At 650px and below, stack the desk columns and reading-aside blocks, reduce page and surface padding, and use smaller display headings. These are reference breakpoints; verify the layout at intermediate widths and zoom levels rather than designing only for exact device sizes. Navigation must remain usable when it overflows horizontally.

## Components and states

### Buttons and links

Primary buttons use green fill, white bold 13px text, a 1px green border, a 3px radius, and approximately 11px × 17px padding. Secondary buttons use a transparent surface, green text, and a muted green border. Text actions use bold green text with no container. Use arrows only when they clarify movement or an external destination, and do not make the arrow the sole accessible name.

Provide distinct hover, keyboard focus, disabled, and loading states. The demo uses a small upward movement on primary-button hover and a 3px warm focus outline with 3px offset. Keep focus visible against every background. Disabled actions must look disabled and communicate why when that is not apparent. Respect reduced-motion preferences.

### Concept list and progress

Concepts appear as full-width rows separated by fine rules, with a small monospaced sequence number, title, short description, and optional category tag. Use a subtle tinted hover state. Make the whole row a single accessible navigation target. Progress uses a simple count, thin bar, and text labels; never communicate progress through the bar alone.

### Reading and notes

The article uses a serif title and prose, short metadata, meaningful section headings, code blocks, and quiet callouts divided by rules. Cite sources with descriptive links close to the learning content. The aside provides a table of contents and a labeled notes field. Show an honest save status: distinguish saving, saved, and failed states when persistence is asynchronous, and do not claim a save succeeded after an error.

### Practice

Present a concrete scenario, a clear question, and choices with enough space to read code. Selection must be visible and exposed to assistive technology. Use native radio inputs or implement the complete keyboard behavior of a radio group. Disable submission until an option is selected. Feedback should explain the reasoning and relevant tradeoffs, including for an incorrect answer; use text and visual treatment together. Allow a learner to retry and continue without shaming them.

### Review

Show one question at a time, then reveal its answer on request. After reveal, offer clearly named actions for reviewing again or expressing confidence. Display queue context and a useful empty state. Confidence is self-reported; avoid turning it into a claim of mastery. Keep focus predictable when the card or its controls change.

### Feedback and empty states

Use calm, specific language. A success state can use pale green; a correction can use a pale warm surface and a darker accent rule. Pair color with a heading and explanatory text. Empty states should explain what happened and offer a relevant next action. Announce meaningful asynchronous updates without repeatedly interrupting the learner.

## Accessibility and content standards

- Use semantic landmarks, headings, labels, buttons, links, and form controls. All functionality must work with keyboard and touch.
- Aim for WCAG 2.2 AA, including text and non-text contrast, visible focus, target size, reflow, and clear error handling. Validate actual foreground/background combinations rather than assuming the palette passes.
- Keep body text selectable and allow zoom and text resizing without clipping or loss of functionality. Do not use fixed heights that constrain content.
- Use descriptive labels and links; decorative icons should be hidden from assistive technology. Announce dynamic feedback through appropriate live regions and manage focus when context changes.
- Respect `prefers-reduced-motion`. Avoid motion that interrupts reading.
- Write in a calm, direct voice. Prefer precise explanations, practical examples, and short action labels. Attribute sources and distinguish original explanations from quoted material.

## Checklist for new work

1. Does the page make its purpose and next useful action clear, and connect naturally to the learning flow?
2. Does it reuse the established type roles, palette, spacing, rules, and flat surfaces?
3. Are default, hover, focus, disabled, selected, error, loading, and empty states considered where relevant?
4. Does it work at desktop, narrow widths, and increased zoom, with keyboard and assistive technology?
5. Are progress, feedback, notes, and source attribution accurate and honestly described?
6. Compare the result against the prototype and update this document when a design decision intentionally changes the system.

## Books and saved passages

Books is a fifth primary navigation destination. Reuse the existing flat surfaces, serif headings, green controls, and fine rules. Place an explicit import form above a two-column library and detail view; stack the columns below 650px. Show extraction state in both the library row and detail area. Group metadata correction and deliberate deletion under a labeled disclosure.

Search results show a location and plain-text preview. Open the complete extracted unit in a labeled, read-only, selectable text field so keyboard and touch users can select exact character ranges. Review the quotation and editable attribution before saving; never render imported HTML or silently alter a selected quotation. Saved passages sit in the reading article under “From your books,” with preserved line breaks and adjacent source details. Book deletion must offer an explicit choice about retaining those passages.


## Release accessibility refinements

Muted supporting text uses `#59685e`; former low-contrast metadata shades now use the shared muted token. Current navigation is exposed through `aria-current`, view changes focus the new heading, and a visible-on-focus skip link targets the main content. Practice uses a single radio-group Tab stop with arrow keys; selections are locked while submission saves. At narrow widths the shell uses a zero-minimum grid track so the navigation scrolls within its own row instead of widening the document. Browser checks cover all views down to 320 CSS pixels and the existing reduced-motion preference.


## AI book learning

Place the optional learning workflow within the selected book, after the manual search/selection tools. Keep the same flat surfaces and fine rules. Show connection state, named text recipients, estimated call count, and bounded progress before generation. Larger books pause at a clear checkpoint. Drafts show the exact quotation and attribution beside the educational rationale, with editable questions and answers under a disclosure. Accepting material is explicit; source-based generation does not imply current-source verification. Accepted book practice sits in the Practice view; attributed recall cards join the shared Review queue. The original indexing activity progress remains labeled as such.

## Three-destination layout preview

The `/design` route explores Library, AI Workspace, and Study within this existing visual identity: shared paper/ink/green tokens, DM Serif Display and DM Sans roles, fine rules, flat surfaces, and a 225px desktop navigation rail. It uses authored SVG icons and typographic sample book identifiers. This is a separate, temporary-data preview; the current app remains at `/`. Route-specific composition, interactions, and limits are documented in [the layout preview guide](docs/layout-preview.md), rather than replacing the system rules above.
