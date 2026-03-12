# Sidebar Project Structure

## Problem

The current project tree mixes several different interaction models:

- immediate creation actions like `+ New AI Assistant` and `+ New Terminal`
- navigational/tool entries like `Commands`, `Git`, and `Open in IDE`
- expandable content sections like `AI Assistants` and `Terminals`

This makes the project area harder to scan because rows at the same visual level do different kinds of things.

## Current Intuition

The cleaner direction is probably to remove the top `+ New ...` rows and make the main project-level rows more consistent:

- `AI Assistants`
- `Terminals`
- `Commands`

Clicking those rows should take the user to the appropriate place or action.

Possible follow-up patterns:

- the row opens/focuses the relevant panel or activity
- the row has a trailing `+` affordance for creation
- or creation is separated more explicitly from active items

## Core Design Tension

Right now the sidebar is trying to do two jobs at once:

- be a navigator for project tools
- be a shortcut bar for creating new things

Those are both valid, but mixing them at the same indentation level makes the tree feel less intentional. A user has to remember which rows:

- create immediately
- open a panel
- expand inline
- or represent currently running/active items

The stronger the product gets, the more this inconsistency will show.

## Likely Better Model

There are two coherent models:

### Option A: Navigation-first

Each top-level row is a section or destination:

- `AI Assistants`
- `Terminals`
- `Commands`
- `Git`
- `Open in IDE`

In this model:

- clicking the row opens or focuses the destination
- creation happens through a trailing `+` button or within that destination
- active items are shown inside the destination, not mixed into the same row set as creation actions

This feels simpler and more scalable.

### Option B: Explicit separation between actions and active items

Top area:

- `+ New AI Assistant`
- `+ New Terminal`
- `+ New Command`

Lower area:

- active assistants
- active terminals
- `Commands`
- `Git`
- `Open in IDE`

This can also work, but only if the visual distinction between "create something" and "go somewhere" is very obvious.

## Recommendation

Current preference is to lean toward `Navigation-first`.

- remove the top `+ New ...` rows
- let `AI Assistants`, `Terminals`, and `Commands` be the primary project-level entries
- let clicking those rows take the user to the relevant activity
- add creation as a secondary affordance only where it is needed

Reason:

- fewer concepts at the same indentation level
- less visual repetition
- better long-term scaling as more project tools are added
- easier to explain to a first-time user: "these are the project tools"

## Proposed Interaction Shape

If we follow the navigation-first approach, a likely structure is:

- `AI Assistants`
- `Terminals`
- `Commands`
- `Git`
- `Open in IDE`

Suggested behavior:

- clicking `AI Assistants` focuses the assistants activity
- clicking `Terminals` focuses the terminals activity
- clicking `Commands` opens the Commands panel
- clicking `Git` opens the Git panel
- clicking `Open in IDE` performs the immediate launch action

Creation options:

- a trailing `+` on rows that support creation
- creation inside the destination itself
- or a hover-only `+` if the default UI should stay very quiet

The important part is not the exact `+` treatment. The important part is that the row itself has one primary meaning.

## Alternative If We Keep Creation In Sidebar

If the product needs direct creation from the project tree, then it should be made more explicit rather than mixed into the main row set.

A clearer version would be:

Action area:

- `New AI Assistant`
- `New Terminal`
- `New Command`

Tool area:

- `AI Assistants`
- `Terminals`
- `Commands`
- `Git`
- `Open in IDE`

This is still workable, but only if the two groups are visually separated enough that users immediately understand:

- top group = create something
- bottom group = go somewhere / inspect something

## Open Questions

- Should `AI Assistants` and `Terminals` still expand inline, or should they behave more like `Commands` and `Git`?
- If a row supports creation, is a trailing `+` enough, or should creation live inside the destination only?
- Should right-side badges be used consistently for all tool rows?
- Does `Open in IDE` belong in the same group, or should it be visually separated as a utility action?

## Open-Source Product Patterns To Study

These are not meant to be copied directly. They are useful references for how other products separate navigation, creation, and active content.

### VS Code

Pattern:

- primary left rail is navigation-first
- views inside the sidebar have their own local actions
- creation usually happens inside the relevant view header or context menu, not as mixed peer rows

Why it is useful here:

- it keeps the main navigation understandable
- it supports growth without making the first level noisy

### Eclipse Theia

Pattern:

- similar to VS Code's distinction between top-level destinations and view-level actions
- actions tend to live with the destination they affect

Why it is useful here:

- good example of keeping tool destinations stable while allowing many local actions

### Beekeeper Studio

Pattern:

- navigation stays relatively focused
- detail-heavy workflows move into the main pane or a dedicated side panel

Why it is useful here:

- reinforces the idea that `Commands` was better as a panel than as an inline sidebar editor

### Open-Source IDE / Devtool Lesson

Shared pattern across strong tools:

- first level tells you where to go
- secondary controls tell you what you can do there
- active items are either nested intentionally or shown in the destination, not mixed casually with creation rows

That general pattern is probably the safest direction for Shep too.

## Not Doing Yet

- No implementation yet.
- No final decision on whether `AI Assistants` and `Terminals` stay expandable or become navigational rows.
- No decision yet on whether creation should be a trailing `+`, hover affordance, or separate action area.
- No decision yet on whether the app should standardize around "click row to focus/open" for all project tools.
