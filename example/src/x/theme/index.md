---
title: theme() helper demo
theme: violet-rose-dusk
---

# `theme()` helper demo

This page loads a bundled [`@marianmeres/design-tokens`](https://jsr.io/@marianmeres/design-tokens)
theme by name — `<%= page.meta.theme %>` — straight from `_helpers.theme(...)`,
with the Bootstrap Reboot bridge baked in. No `helpers.js` wiring required.

Toggle the `.dark` class on `<html>` (the theme ships light **and** dark blocks):
