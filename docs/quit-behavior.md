# App Quit Behavior

## Context

Shep can launch local commands, terminals, and assistant sessions inside app-managed PTYs.

Today, quitting the app does not have an explicit global shutdown path for all running PTYs. Individual sessions are stopped when the user closes a tab or explicitly stops a command, but app quit behavior is not yet formalized.

## Expected User Behavior

The likely user expectation is:

- Closing Shep stops the activities Shep started.
- Reopening Shep does not automatically restore prior running sessions.
- Therefore, quitting the app should not silently leave app-managed processes behind.

This expectation is especially strong because the UI presents these activities as app-controlled local sessions, not as detached background services.

## Proposed Product Direction

Default behavior on app quit:

- Kill all tracked PTYs started by Shep.

Prompt behavior:

- If no commands/sessions are running, quit immediately with no warning.
- If one or more commands/sessions are running, show a confirmation prompt before quitting.

Suggested confirmation copy:

`Quit Shep and stop 4 running commands/sessions?`

## Notes

- Detached commands such as `docker compose up -d` are less of a concern, because the PTY session itself exits and the underlying service intentionally continues.
- The warning should be simple and local-only. This is not a destructive remote action; it is mostly a clarity/expectation issue.
- A future `Don't ask again` option could be added if the prompt becomes noisy for users who prefer immediate shutdown.

## Not Doing Yet

- No implementation yet.
- No shutdown hook yet.
- No restore-on-relaunch behavior yet.
