MyHours Icon Assets
===================

## App Icon Files
- `assets/icon.svg`: Primary vector icon (1024×1024 viewBox). Includes time-tracking clock + invoice motif and subtle MH monogram.

## Tray Icon Files
- `assets/tray-icon.svg`: Vector tray/menu bar icon optimized for small sizes (16×16, 32×32)
- `assets/tray-icon.png`: 16×16 PNG for standard resolution displays
- `assets/tray-icon@2x.png`: 32×32 PNG for high-DPI displays

## Exporting PNG + macOS ICNS
- Recommended size: 1024×1024 PNG as the source for raster outputs.
- macOS only (no extra installs):
  1) Open `assets/icon.svg` in Preview and export a 1024×1024 PNG as `assets/icon-1024.png`.
  2) Run `scripts/generate-mac-icns.sh assets/icon-1024.png`.
  3) This creates `build/icon.icns` which electron-builder picks up automatically.

## Generating Tray Icon PNGs
- Use `scripts/prepare-icon-pngs.sh` to generate tray icon PNGs from the SVG source:
  ```bash
  ./scripts/prepare-icon-pngs.sh
  ```
- This script requires ImageMagick (`brew install imagemagick`) and generates:
  - `assets/tray-icon.png` (16×16) - Standard resolution
  - `assets/tray-icon@2x.png` (32×32) - High-DPI/Retina displays

## Using with electron-builder
- electron-builder uses `build/icon.icns` by default for macOS if present — no config changes needed.
- Tray icons are included via the `assets/**/*` entry in package.json build files
- For Windows/Linux, you can add platform icons later (ICO/PNG). If you already have PNG sizes, electron-builder can generate targets from them; otherwise consider creating an `.ico` with an external tool.

## Tray Icon Requirements
- **macOS**: Uses template images that automatically adapt to light/dark themes
- **Size**: 16×16 for standard, 32×32 for Retina displays (@2x)
- **Format**: PNG with transparency
- **Design**: Simple, monochromatic design works best for menu bar integration

## Optional Windows/Linux
- Once you have a 1024 PNG, consider generating common PNG sizes: 256, 128, 64, 48, 32, 16. Place under `build/icons/` if you plan to reference them.

## Notes
- The SVG is designed to render crisply at small sizes. Avoid adding thin details below 2px stroke when adjusting.
- Keep high contrast between motif and background to work in dark mode docks.
- Tray icons should be simple and readable at 16×16 pixels

