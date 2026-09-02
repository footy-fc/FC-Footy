# Rivals implementation design QA

## Evidence

- Source visual truth: `/var/folders/_d/84sz505n0hj8cr84vn96pppc0000gn/T/codex-clipboard-aa14a7f6-7733-4068-9d19-da9f64384a8b.png`
- Browser-rendered implementation: `/private/tmp/rivals-implementation-mobile-final.png`
- Full-view comparison: `/private/tmp/rivals-design-comparison-final.png`
- Focused header and first-impact comparison: `/private/tmp/rivals-design-comparison-focus-final.png`
- Source pixels: 393 × 852.
- Implementation pixels: 393 × 852 at a 393 × 852 CSS viewport.
- Density normalization: none required; both artifacts were compared at identical pixel dimensions.
- State: Rivals selected, demo data representing an active Gameweek 4, contest not yet joined, sheets closed, scroll position 0.
- Intentional product constraint: Footy’s existing identity bar remains above the Rivals screen. The reference begins at the live summary because it was built in a standalone mobile runtime; preserving Footy’s app shell was a requirement of this port.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: Footy’s existing Manrope and Space Grotesk tokens replace the prototype’s standalone Roboto setup. The reference hierarchy remains intact across the live summary, Rivals title, event headlines, secondary labels, point effects, and actions. The captain marker is separately accented in pink.
- Spacing and layout rhythm: the live summary, title block, three-event timeline, contest invitation, and persistent Footy navigation all fit in the 393 × 852 viewport. The final compact pass removed the initial bottom-navigation overlap without reducing legibility or touch-target clarity.
- Colors and visual tokens: the implementation uses Footy’s dark-purple, purple-panel, coral, pink, and light-purple tokens while preserving the reference’s positive/negative contrast and card hierarchy.
- Image and icon fidelity: the screen has no photographic or illustrative assets. Existing Lucide icons are used for UI affordances. The final pass replaced the initial crown/goal markers with the circular captain C and differential star shown in the source; the clean-sheet-loss marker uses a crossed shield.
- Copy and content: Rivals, the live gameweek summary, compact nearest-rival delta, fantasy-impact events, contextual actions, and contest invitation all match the source product job. Live production values remain API-driven, so player names, minutes, points, rival names, and rank will vary from the reference fixture.
- Accessibility and affordance: the current tab, live summary, feed, dialogs, suggested replies, loading and empty states, and contest success state have semantic labels. The Banter suggestions expose radio state, the sheets expose modal semantics, and the contest success is announced.

## Primary interactions tested

- Explain opens the deterministic +12 point-swing breakdown and closes successfully.
- Banter opens a contextual composer, exposes three suggested replies, and updates the selected reply state.
- The production Farcaster posting path is wired through Footy’s existing signer and cast submission flow. A live cast was not posted during QA.
- Join contest changes to a disabled green `Joined` state; the contest title opens the existing Fantasy route.
- Browser console errors checked: none. The standalone preview emitted only the expected Pingem warning that Mini App host context is absent.

## Comparison history

### Pass 1 — blocked

- P2: the contest invitation was partially covered by Footy’s persistent bottom navigation at the mobile viewport.
- P2: captain and differential event markers used the wrong icon shapes.
- P2: the captain suffix did not receive the reference’s pink emphasis.
- Fixes: tightened vertical rhythm across the header, cards, actions, and event gaps; switched to the circular captain C and star markers; separated and accented `(C)` in the event headline.

### Final pass — passed

- Full-view evidence confirms that every primary section is visible without overlap at 393 × 852.
- Focused evidence confirms the reference hierarchy, timeline alignment, captain marker, captain accent, positive/negative rows, and two contextual actions.
- Footy’s identity bar and existing navigation styling are retained intentionally, as required for an app-specific port rather than a separate prototype runtime.

## Follow-up polish

- P3: production match minutes reflect the current fixture clock because the public FPL live endpoint does not expose the original timestamp of each scoring event. This is deterministic and honest, but a later existing match-event integration could make historical minute labels exact.

final result: passed
