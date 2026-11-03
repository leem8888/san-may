# Baseline evidence (C0)

Environment: Windows; Node `v24.15.0`; npm `11.12.1`. Baseline HEAD `acf75c4dabc5551e57b90cfa81c10a6be62f5fad`; branch `feature/visual-polish-3` created for this work.

| Check | Result |
|---|---|
| `npm.cmd run check` | PASS — Syntax and JSON OK: 161 JavaScript files |
| `npm.cmd test` | PASS — 96/96 tests |
| Browser screenshots / viewport matrix | NOT RUN — node_repl computer-use initialization failed (`failed to write kernel assets: The system cannot find the path specified`); Chrome/Edge/Playwright were not available in PATH/package resolution |
| FPS / frame-time p50/p95 | NOT RUN — requires a browser session and fixed scene |
| Browser console/network | NOT RUN — requires a browser session |

Source inventory: 9 JSON maps; 21 HTML panel sections; 3 native dialogs. Detailed list is in `AUDIT.md`.

Do not interpret NOT RUN as a pass. To establish visual baseline later, run the app and capture each key map at matching camera, time/weather, resolution and quality settings; include desktop 1440×900 and mobile 390×844. Record the screenshots and browser/version alongside the result.
