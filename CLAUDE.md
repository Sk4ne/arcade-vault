# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score (see `README.md`). The project follows a spec-driven workflow (`/spec` and `/spec-impl`, from the `Klerith/fernando-skills` skills). Early stage: `app/` is still the Create Next App scaffold (default metadata, boilerplate `page.tsx`).

There is no test runner configured.

## Next.js version warning

`AGENTS.md` states this Next.js (16.4.4, React 19.3) has breaking changes versus common training data. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`; start at `index.md`). Heed deprecation notices.

## Skills
Usa siempre /frontend-design para diseñar la interfaz de usaurio.

## Architecture / config notes

- App Router only (`app/`), TypeScript strict, path alias `@/*` → repo root.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`. `cacheComponents` changes caching and dynamic-rendering semantics, so check the docs before writing data fetching.
- Tailwind v4 is wired through Turbopack: a `*.css` rule using `@tailwindcss/turbopack` in `next.config.ts`. Theme tokens live in `app/globals.css` (`@theme inline`).
- `app/layout.tsx` uses the globally typed `LayoutProps<"/">` helper (no import needed) and loads Geist fonts via `next/font/google`.

## Design reference

`resources/templates/` holds a prototype UI (untracked) to be ported to Next.js: `Arcade Vault.html` plus plain JSX files (`auth`, `biblioteca` (library), `detalle` (game detail), `reproductor` (player), `salon` (leaderboard/hall), `nav`, `app`, `data`) and `styles.css`. Treat these as the design and data-shape source when implementing screens. The UI copy is in Spanish.
