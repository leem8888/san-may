# Visual polish audit (C0)

- Baseline commit: `acf75c4dabc5551e57b90cfa81c10a6be62f5fad` (`main` at start).
- Working branch: `feature/visual-polish-3`.
- Stack: Canvas 2D renderer; ES modules in `public/js`; JSON maps; Express, Socket.IO and SQLite server. No protocol or persistence changes are in this checkpoint.
- Source inventory: 9 maps (`bambooForest`, `bellTower`, `courtyard`, `garden`, `gate`, `library`, `lotusLake`, `mainHall`, `zenGarden`); 21 panel sections and 3 native dialogs in `public/index.html`.
- Existing render/UI modules include `SpriteRenderer`, `ParticleSystem`, `LightingSystem`, `CharacterArt`, `InteractionSystem`, `Panels`; weather/day-night/audio systems already exist.
- Existing gameplay is preserved. The audit includes fish release, shaved NPC, shoe rack, courtyard sweeping, and love fortune features already present in baseline.

## Scope / risks

C0 records the real baseline. C1 introduces shared CSS variables and documents art direction; it does not touch gameplay, maps, network events, or database. Browser visuals, mobile overflow and frame time remain unmeasured because browser automation could not be initialized in this environment. See `BASELINE.md` and `QA_REPORT.md`.
