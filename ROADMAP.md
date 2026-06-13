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

## 💡 Ideas / maybe

- [ ] "To print" queue (a real per-project to-do list inside the app)
- [ ] macOS / Linux builds
- [ ] More brands in the catalog (community contributions)
- [ ] Light theme option
- [ ] Statistics (consumption over time, most-used colors)

## Contributing

Found a bug or want a feature? Please open an
[issue](https://github.com/BatuhanYigit/bambulab-filament-control/issues).
