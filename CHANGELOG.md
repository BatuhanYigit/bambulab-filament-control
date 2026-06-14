# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.2] - 2026-06-14

### Added
- **Bambu Cloud connection mode** — connect through Bambu's cloud MQTT broker using your
  account, so the app works from any network without forcing the printer into LAN-only mode
  (no more losing phone/cloud control). Pick the printer from your bound devices; LAN mode
  is still available. Settings → Connection mode.

## [1.0.1] - 2026-06-14

### Fixed
- "Object has been destroyed" crash when closing the app (AMS state was sent to a
  destroyed window during shutdown).

### Changed
- Generalized wording: supports Bambu Lab printers with AMS, not just the X1 Carbon.

### Added
- `ROADMAP.md` with planned features (incl. LAN-only vs phone control, MakerWorld
  project finder by owned filament colors).

## [1.0.0] - 2026-06-14

### Added
- Filament inventory with remaining grams + percentage bars.
- Live AMS status over LAN/MQTT, with RFID remaining-amount sync.
- Network printer discovery (SSDP + port scan) to auto-detect the printer IP.
- Built-in filament catalog (Bambu Lab, eSun, Polymaker, SUNLU, Porima) with real
  color hex codes and recommended temperatures.
- Bambu Studio profile reader for temperature data.
- Bambu Cloud integration: import past prints (grams, filament, cover image) with a
  review step, multi-color per-filament deduction, and editable records.
- Sealed (vacuum-bag) vs opened spool visuals, click-to-open with confirmation and re-seal.
- Live print status on the dashboard (state, progress, layer, temperatures, active filament).
- AMS slot percentages synced to your inventory when RFID isn't reporting (RGB color/type matching).
- RFID on/off toggle for users without RFID-tagged spools.
- Inventory sorting (remaining low→high default, high→low, name, recently updated).
- First-launch onboarding tour with progress, Next/Back and Skip (replayable from Settings).
- Bilingual UI (Turkish / English).
- Windows installer + portable build via electron-builder and GitHub Actions.
