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

final result: passed
