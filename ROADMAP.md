# Roadmap

Planned work and ideas for **Bambu Filament Control**. Suggestions welcome — open an
issue or a discussion. Checked items are done.

> Türkçe: Yapılacaklar ve fikirler. Önerin varsa issue aç. İşaretliler tamamlandı.

## ✅ Done — v1.0.0

- [x] Filament inventory with remaining grams + percentage bars
- [x] Sealed (vacuum-bag) vs opened spool visuals, click-to-open & re-seal
- [x] Live AMS over LAN/MQTT (slot type, color, RFID remaining)
- [x] Live print status (state, progress, layer, temps, active filament)
- [x] Network printer discovery (SSDP + port scan)
- [x] AMS slot percentages synced to inventory; RFID on/off toggle
- [x] Built-in catalog (Bambu, eSun, Polymaker, SUNLU, Porima) with real hex codes
- [x] Bambu Studio profile reader (temperatures)
- [x] Bambu Cloud print-history import (review, multi-color deduction, editable)
- [x] Inventory sorting & first-launch onboarding tour
- [x] Turkish / English UI
- [x] Windows installer + portable build via GitHub Actions

## 🔜 Planned

- [ ] Auto-update in-app (electron-updater — `latest.yml` is already published)
- [ ] Filament cost tracking (price per spool → cost per print)
- [ ] Low-stock desktop/tray notifications
- [ ] Export / import inventory (CSV / JSON, backup & restore)
- [ ] Per-slot spool binding so AMS↔inventory matching is exact (no color guessing)
- [ ] Multi-AMS / AMS Lite: show more than one unit on the dashboard
- [ ] Spool weight via scale (tare = empty spool weight → grams from measured weight)
- [ ] Drying reminders / humidity tracking
- [x] **LAN-only vs phone control** — solved: added a **Bambu Cloud connection mode**.
      The app can now connect through Bambu's cloud MQTT broker using your account token,
      so it works from any network without forcing the printer into LAN-only mode (no more
      losing phone/cloud control). LAN mode is still available as an option.

## 🧩 Planned (large) — MakerWorld project finder

A big, comprehensive feature for a later phase (planning only for now).

**Goal:** discover MakerWorld models you can actually print with the filaments you
already own. Example: you have yellow, black, white and red → the app surfaces the
"Pikachu" model. Browse/search MakerWorld and filter results by your inventory colors.

- [x] Search MakerWorld by keyword and browse Trending; show results in-app (cover, title,
      designer, like/download counts)
- [x] **Match by owned colors** — each model's required colors (from its default profile)
      are matched against your inventory (close-color RGB matching)
- [x] Both multi-color and single-color models are matched
- [x] "What can I print right now?" filter — only models fully buildable with current stock
- [x] Open the model on MakerWorld
- [ ] Filter by material/type, plate count, difficulty, license
- [ ] Send selected model straight to the slicer
- [ ] Paginate / load more results

**Open questions / risks to investigate:**
- MakerWorld has no official public API — needs an unofficial endpoint or scraping;
  check Terms of Service, rate limits and stability before relying on it.
- Color metadata: how to reliably read a model's required colors / per-part palette.
- Matching heuristic: map model color slots → inventory colors (RGB distance, allow
  substitutions, handle "any color" parts).

## 💡 Ideas / maybe

- [ ] "To print" queue (a real per-project to-do list inside the app)
- [ ] macOS / Linux builds
- [ ] More brands in the catalog (community contributions)
- [ ] Light theme option
- [ ] Statistics (consumption over time, most-used colors)

## Contributing

Found a bug or want a feature? Please open an
[issue](https://github.com/BatuhanYigit/bambulab-filament-control/issues).
