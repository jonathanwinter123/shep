# Releasing Shep

This is the release process for publishing a new GitHub release with a downloadable macOS `.dmg`.

## Scope

This assumes:

- the release is built locally on macOS
- GitHub Releases is the distribution channel
- the primary artifact is the `.dmg`

## Version Files

Update the version in all three places before building a release:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Use the same version everywhere. Example: `0.2.0`

## Pre-Release Checklist

Before tagging a release:

1. Make sure the app version in Settings matches the intended release version.
2. Make sure `README.md` is current.
3. Make sure the screenshot placeholder is replaced if you want a polished release page.
4. Review any known issues you want to mention in the release notes.

## Build Validation

Run the validation steps from the repo root:

```bash
pnpm install
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

Expected release artifacts:

- `src-tauri/target/release/bundle/macos/shep.app`
- `src-tauri/target/release/bundle/dmg/`

If you want a debug-packaged app for local testing instead:

```bash
pnpm tauri build --debug
```

## Smoke Pass

Before publishing, test the packaged app, not just `pnpm tauri dev`.

Minimum smoke pass:

1. Open the built `.app` or install from the built `.dmg`
2. Add a repo
3. Launch an assistant session
4. Launch a plain terminal session
5. Open the Commands panel and run something simple
6. Open the Git panel
7. Open Settings and confirm the version is correct
8. Remove a repo
9. Confirm notifications behave as expected
10. Confirm opening the repo in the configured editor works

## Tagging the Release

Commit the release changes first, then tag the version.

Example:

```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml README.md docs/RELEASING.md
git commit -m "Release v0.2.0"
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

Adjust the branch name if your default branch is not `main`.

## GitHub Release

In GitHub:

1. Open the repository
2. Go to `Releases`
3. Click `Draft a new release`
4. Select tag `vX.Y.Z`
5. Set the release title to `Shep vX.Y.Z`
6. Upload the generated `.dmg`
7. Add release notes
8. Publish the release

## Release Notes Template

Use something short and product-focused:

```md
## Shep vX.Y.Z

Shep is a native macOS terminal workspace for managing project terminals, coding agents, and git-aware sessions in one place.

### Highlights

- Added:
- Improved:
- Fixed:

### Known Issues

- 

### Install

Download the attached `.dmg`, open it, and drag `Shep.app` into Applications.
```

## Artifact Naming

The DMG name typically includes the version and architecture. Example:

```text
src-tauri/target/release/bundle/dmg/shep_0.2.0_aarch64.dmg
```

If you build on a different architecture, the suffix may differ.

## macOS Signing and Notarization

For a small trusted tester group, an unsigned release may be acceptable.

For wider distribution, plan to add:

- Apple code signing
- notarization
- a cleaner first-launch experience without Gatekeeper workarounds

## Notes

- DMG creation depends on macOS disk image tooling. If packaging is run inside a restricted sandbox, DMG creation can fail even when the `.app` bundle builds correctly.
- If that happens, rerun the packaging step in a normal local macOS environment.
