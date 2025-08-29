<div align="center">

# myHours ⏱️

Cross‑platform time tracking with invoices. Electron + React + Prisma (SQLite).

</div>

## Features

- Time tracking with rounding (5/10/15/30/60m) and manual edits
- Clients → Projects → Tasks hierarchy with per‑client/project rates
- Reports with exports (CSV/JSON)
- Professional PDF invoices (Puppeteer + Handlebars)
- Company profile, invoice terms (Net 7/14/15/30/45/60), and template styling
- Background animation for a little delight (can be tuned in code)

## Tech Stack

- UI: React 19, styled‑components, lucide‑react
- Shell: Electron 26
- Data: SQLite via Prisma Client
- PDF: Puppeteer Core + custom Handlebars template
- Packaging: electron‑builder

## Getting Started

Prereqs: Node.js ≥ 18, npm.

Install deps (root + renderer):

```bash
npm install
cd src/renderer && npm install && cd ../..
```

Run in development:

```bash
# 1) React vite/dev-server
cd src/renderer && npm start

# 2) Electron in another terminal
cd ../.. && npm run dev
```

## Build

Renderer:

```bash
npm run build-renderer
```

App packaging (uses `scripts/run-builder.js`):

```bash
npm run build
```

By default it builds only for your current OS. You can toggle targets via `.env`:

```ini
# macOS: enable Apple Silicon in addition to x64
BUILD_ARM64=1

# Cross‑builds (off by default). Set to 1/true to include these.
BUILD_MAC=0     # Build mac from non‑mac host
BUILD_WIN=0     # Include Windows x64
BUILD_LINUX=0   # Include Linux x64

# mac target (what artifacts to produce)
# dir = .app only (default), dmg = disk image, zip = ZIP of .app
MAC_TARGET=dir
```

Notes:
- On macOS, default is `--mac --x64`; add `BUILD_ARM64=1` for universal output.
- Windows/Linux builds require appropriate host tooling/CI; they’re disabled unless opted‑in.

## Database & Seeding

- Dev DB: `prisma/myhours.db` (SQLite). Prisma schema in `prisma/schema.prisma`.
- Packaged app DB: stored under Electron `userData` as `myhours.sqlite` and initialized from `prisma/template.db` prepared at build time.

Seeding options:
- CLI: `npm run prebuild` (runs migrations and prepares `template.db`).
- In‑app (dev only): Settings → Danger Zone → “Re‑run Seed (Dev)”.

## Invoices

- Template: `src/main/templates/invoice.hbs` (Handlebars + CSS). Modern layout with compact spacing.
- Company fields come from Settings (name/email/phone/website).
- Payment Terms configurable in Settings; due date computed from terms when not stored.

## Shortcuts

- Cmd/Ctrl + , → Settings
- Cmd/Ctrl + Enter → Stop active timer

## Troubleshooting

- Dev DB path: logged on startup as `[DATABASE] Using SQLite at ...`.
- If PDFs are blank, confirm `printBackground: true` is set (it is) and try re‑seeding.
- Icon transparency: place `assets/icon.png` (1024×1024, RGBA). Build prefers it over SVG rasterization.

## Contributing

PRs and suggestions welcome. This is an experimental project; issues/PRs that improve stability, DX, or polish are appreciated.

## License

MIT
