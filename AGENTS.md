# Agent Notes

## Project Shape

This is a macOS-only CLI for capturing app behavior into a single run directory.

- `src/types.ts` contains shared TypeScript types.
- `src/constants.ts` contains defaults, filenames, and other shared constants.
- `src/utils.ts` contains small shared helpers only when a helper is used by more than one module.
- `src/core/` contains the capture implementation.
- Core implementation files should focus on one concrete area, such as proxy management, mitmproxy capture, process handling, path creation, or capture orchestration.
- Keep README changes until the feature is complete and verified.

## Code Style

- Prefer small plain functions over classes or framework-like abstractions.
- Avoid premature abstraction. Do not add plugin systems, registries, lifecycle frameworks, or generic runners unless the current code clearly needs them.
- Avoid defensive programming that makes the main path hard to read. Validate real external boundaries, then keep internal code direct.
- Keep implementation readable before it is clever.
- Keep comments sparse. Use comments for non-obvious behavior, not to restate the code.
- Put public/shared types in `src/types.ts`; keep local-only types next to the implementation when they do not need to be exported.
- Put public/shared constants in `src/constants.ts`; keep local-only constants next to the implementation when they are only used once.
- Do not add body redaction or body marker policies. Captured HTTP and WebSocket bodies should be preserved as fully as practical.

## Verification

- Before handing work back, make sure these commands pass:
  - `pnpm lint --fix`
  - `pnpm typecheck`
  - `pnpm test`
- Do not claim a change is complete while any required check is still failing.
- Unit tests must not use Node's `node:os.tmpdir()` API, including `os.tmpdir()` or `tmpdir()` imports, for temporary directories.

## Capture Design

- Use `tinyexec` for external commands such as `networksetup`, `mitmdump`, `tcpdump`, `log stream`, and `screencapture`.
- Preserve and restore macOS HTTP, HTTPS, and SOCKS proxy settings.
- The proxy should only route HTTP and HTTPS through mitmproxy; SOCKS should be restored, not repointed.
- Keep capture outputs explicit and easy to inspect:
  - `manifest.json` for run metadata.
  - `capture.log` for CLI and child process events.
  - `http.jsonl` and `websocket.jsonl` for semantic traffic records.
  - `bodies/` for raw request, response, and WebSocket payload bytes.
  - `network.pcap` for packet-level capture.
  - `app.log` for macOS unified logs.
  - `screenshots/` for optional screenshots.
