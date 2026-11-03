# Performance baseline / C1–C6

No browser performance measurement was available. FPS and frame-time p50/p95 are **NOT RUN**; no FPS/frame-time improvement is claimed. C6 added only a guard against resetting the canvas backing store when its physical dimensions have not changed.

When measuring, use the same machine, browser, map, camera, quality setting and player count. Warm up, collect at least 30 seconds, report FPS and frame-time p50/p95, and note resolution and browser version. Repeat after each rendering-heavy checkpoint. The current branch has no measured before/after values; C2 rendering changes and C5 reduced-motion rendering need measurement when browser access is available.
