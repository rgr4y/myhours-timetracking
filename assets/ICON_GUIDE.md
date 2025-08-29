MyHours Icon Assets
===================

Files
- `assets/icon.svg`: Primary vector icon (1024×1024 viewBox). Includes time-tracking clock + invoice motif and subtle MH monogram.

Exporting PNG + macOS ICNS
- Recommended size: 1024×1024 PNG as the source for raster outputs.
- macOS only (no extra installs):
  1) Open `assets/icon.svg` in Preview and export a 1024×1024 PNG as `assets/icon-1024.png`.
  2) Run `scripts/generate-mac-icns.sh assets/icon-1024.png`.
  3) This creates `build/icon.icns` which electron-builder picks up automatically.

Using with electron-builder
- electron-builder uses `build/icon.icns` by default for macOS if present — no config changes needed.
- For Windows/Linux, you can add platform icons later (ICO/PNG). If you already have PNG sizes, electron-builder can generate targets from them; otherwise consider creating an `.ico` with an external tool.

Optional Windows/Linux
- Once you have a 1024 PNG, consider generating common PNG sizes: 256, 128, 64, 48, 32, 16. Place under `build/icons/` if you plan to reference them.

Notes
- The SVG is designed to render crisply at small sizes. Avoid adding thin details below 2px stroke when adjusting.
- Keep high contrast between motif and background to work in dark mode docks.

