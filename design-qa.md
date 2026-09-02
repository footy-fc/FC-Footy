# Footy Following + Updates Design QA

## Evidence

- Source visual truth:
  - `/Users/kmm/.codex/generated_images/01a05f1e-afb3-7122-96db-b7e0969ce094/exec-7f687f01-55d4-4838-978b-b004a32817ff.png` (Scores-led Following, 853 × 1844 px)
  - `/Users/kmm/.codex/generated_images/01a05f1e-afb3-7122-96db-b7e0969ce094/exec-8105e98a-7a75-4954-9a33-40bc1bf337d9.png` (compact Updates sheet, 853 × 1844 px)
- Browser-rendered implementation:
  - `/private/tmp/footy-following-scores-qa.png` (618 × 685 px browser capture; app CSS width 400 px; DPR 1)
  - `/private/tmp/footy-updates-sheet-qa-final.png` (618 × 685 px browser capture; app CSS width 400 px; DPR 1)
- Combined comparison evidence:
  - `/private/tmp/footy-following-comparison.png`
  - `/private/tmp/footy-updates-comparison-final.png`
- Viewport: 618 × 685 browser viewport with Footy's fixed 400 px mobile app canvas centered.
- Density normalization: generated references were downsampled for visual comparison. The Updates sheet comparison used equal-width focused crops (618 px each). The Scores comparison aligned both full-height mobile compositions; surrounding browser canvas was removed from the implementation.
- States: Scores → Following empty state; notification bell → Updates overview; Match alerts progressive-detail view.

## Full-view comparison

The implementation preserves the selected concept's hierarchy: identity bar, Scores heading, two-state match toggle, followed-team summary, match content, contextual alert guidance, and persistent bottom navigation. The browser session had no signed-in team preferences, so the implementation correctly showed the designed empty state instead of the populated reference fixtures. This is an intentional data-state difference, not layout drift.

## Focused-region comparison

The Updates sheet was compared as an isolated equal-width region. It retains the reference grab handle, title/close row, two concise preference summaries, status labels, trailing chevrons, and notification-settings action. Team picker and newsletter form content remain hidden until a summary is selected.

## Required fidelity surfaces

- Fonts and typography: uses Footy's existing type stack, title weight, compact labels, and established uppercase eyebrow treatment. The hierarchy is equivalent to the selected references and wraps cleanly at 400 px.
- Spacing and layout rhythm: 20–30 px radii, compact 12–16 px gaps, card padding, overlay elevation, and bottom navigation match the existing app system. No horizontal overflow was observed.
- Colors and visual tokens: existing `darkPurple`, `purplePanel`, `deepPink`, `lightPurple`, `notWhite`, and `limeGreenOpacity` tokens are used throughout. The implementation intentionally retains Footy's coral heading color where the generated reference used white.
- Image quality and asset fidelity: followed-team crests come from Footy's existing team-logo source and use `next/image`; standard UI actions use the app's installed icon library. No placeholder illustration, handcrafted SVG, emoji, or CSS-drawn asset was introduced.
- Copy and content: “Following,” “Match alerts,” “Final Whistle,” “After every gameweek,” and “Open notification settings” match the selected concepts. Empty-state copy clearly explains the next action.

## Findings

- No actionable P0, P1, or P2 differences remain.
- [P3] The generated source shows populated team/newsletter data, while the unauthenticated QA session shows setup states. Recheck the same sheet with a production-like signed-in account after deployment staging is available.

## Comparison history

1. Initial Updates comparison found card borders visually stronger than the reference (P2). The summary-card borders were changed from `lightPurple` to the lower-contrast existing `limeGreenOpacity` token.
2. Post-fix evidence in `/private/tmp/footy-updates-comparison-final.png` confirms that the two primary cards now recede appropriately while preserving clear affordances.

## Primary interactions tested

- Opened Scores directly in Following mode.
- Switched/rendered the Following selected state.
- Opened Updates from the header bell.
- Opened Match alerts from the Updates summary.
- Returned to the summary and closed the sheet.
- Confirmed semantic button names, pressed state, dialog role, close control, and empty-state actions in the rendered DOM.

## Console and runtime

- No implementation-specific runtime error was observed after the dev server finished compiling.
- The project continues to emit its existing `viem/ox` critical-dependency development warnings.

## Implementation checklist

- [x] Profile limited to identity maintenance.
- [x] Header club affordance opens Scores → Following.
- [x] Header bell opens compact Updates sheet.
- [x] Team and newsletter controls use progressive disclosure.
- [x] Following empty state and contextual alert guidance included.
- [x] Selected mobile interactions visually verified.

## Scores Following + Fantasy standings follow-up

### Evidence

- User-supplied Scores reference: `/var/folders/_d/84sz505n0hj8cr84vn96pppc0000gn/T/codex-clipboard-817897a1-3f09-46bc-82eb-6c081f3c79bc.png`
- Fantasy before: `/private/tmp/footy-fantasy-table-before.png`
- Fantasy implementation: `/private/tmp/footy-fantasy-table-after.png`
- Before/after comparison: `/private/tmp/footy-fantasy-comparison.png`
- Cross-tab style comparison: `/private/tmp/footy-style-comparison.png`
- Viewport: 618 × 685 browser viewport with Footy's fixed 400 px mobile canvas centered.

### Findings and resolution

- [P1] Scores → Following incorrectly showed no matches even when followed EPL clubs had recent or upcoming fixtures. The saved IDs used lowercase abbreviations while ESPN supplied uppercase abbreviations. Team and league IDs are now normalized before deterministic comparison, with focused tests covering Liverpool, Aston Villa, competition isolation, and unrelated teams.
- [P2] Fantasy used a dense desktop table, an empty Profile column, high-contrast lime rules, and repeated controls that did not match the rounded hierarchy used by Scores and Rivals. It now uses the same typography, palette, radii, card density, icon system, and compact mobile hierarchy.
- [P2] The full league rendered every manager immediately and fetched favorite-team preferences that this screen did not display. The screen now fetches only the data it renders, shows the first 50 managers, and progressively reveals the next rank band. Other consumers retain favorite-team enrichment.
- [P2] Loading, error, and empty states were plain text. They now use contextual cards, skeletons, and a working retry action.

### Primary interactions tested

- Loaded all 189 live Fantasy managers and verified rank, manager, GW, total, and claim controls.
- Expanded managers 51–100 and confirmed exactly 100 standings rows plus the next 101–150 control.
- Reloaded the Fantasy tab and confirmed the optimized standings path completed in about four seconds in local QA.
- Compared the source Scores visual language and updated Fantasy screen in a single image.
- Verified the followed-match normalizer with four passing deterministic tests.

### Visual fidelity

- No horizontal overflow or broken mobile layout was observed.
- The persistent bottom navigation remains unchanged.
- Claim/release and Farcaster profile behavior remain intact.
- No placeholder imagery, handcrafted SVG, emoji, or new asset system was introduced; standard UI imagery uses existing profile data and Lucide icons.
- No actionable P0, P1, or P2 visual differences remain.

final result: passed
