# Exiled Exchange 2 - OpenCode Instructions

Compact guidance for agents working in this repository. Every line answers: "Would an agent likely miss this without help?"

## Project Layout

```
exiled-exchange-2/
├── main/          # Electron main process (TypeScript)
├── renderer/      # Vue.js frontend (TypeScript + Vite + Vue 3)
├── dataParser/    # Python data processing (pytest)
├── docs/          # VitePress documentation
├── .pre-commit-config.yaml
└── DEVELOPING.md  # Authoritative development guide
```

Each sub-project has its own `package.json`/`pyproject.toml`. Workflows are per-package.

## Development Workflow

**Two-shell setup** (from `DEVELOPING.md`):
1. Shell 1: `cd renderer && npm install && npm run make-index-files && npm run dev`
2. Shell 2: `cd main && npm install && npm run dev`

**CI order** (from `.github/workflows/main.yml`):
1. Renderer: `npm run lint` → `npm run build`
2. Main: `npm run build` → `npm run package`

**Pre-commit hooks** (from `.pre-commit-config.yaml`):
- Lint & format both main/renderer
- Type-check both packages
- Version consistency check (`versionCheck.py`)

**Critical prerequisite**: `npm run make-index-files` must run before `dev`/`build` in renderer.

## Key Commands

### Renderer (`/renderer`)
- `npm run make-index-files` – **Required before dev/build**
- `npm run dev` – Vite development server
- `npm run build` – vue-tsc + Vite production build
- `npm run lint` / `lint-fix` / `format` / `check-types` / `test`

### Main (`/main`)
- `npm run dev` – esbuild development script
- `npm run build` – tsc + esbuild production build
- `npm run package` – electron-builder (requires renderer/dist)
- `npm run lint` / `fix` / `format` / `check-types`

### Data Parser (`/dataParser`)
- `python ./src/main.py` – see `--help` for options
- `pytest` – run tests

### Root-level
- `sh testUpdate.sh` – Full clean rebuild (removes dists, installs, builds both)
- `pre-commit run --all-files` – Lint/format/type-check everything
- `python versionCheck.py` – Verify version consistency across files

## Testing & Verification

**Run all checks** (CI equivalent):
```bash
cd renderer && npm run lint && npm run check-types && npm run test
cd ../main && npm run lint && npm run check-types
pre-commit run --all-files
```

**ESLint note**: ESLint plugins are `optionalDependencies`. If lint fails, install them first:
```bash
cd renderer && npm install --include=optional
cd ../main && npm install --include=optional
```

## Build & Release

**Build order** (matches CI):
1. `cd renderer && npm run make-index-files && npm run build`
2. `cd ../main && npm run build && npm run package`

**Version consistency**: Update version in `main/package.json`, then:
- Run `npm i` in both renderer and main (updates lockfiles)
- Ensure `versionCheck.py` passes
- See `DEVELOPING.md` "How to release a build" for full process

## Gotchas

1. **Formatting**: Run from `/renderer` or `/main`, not root. Root `npm run format` doesn't exist.
2. **Development**: Requires two concurrent shells (renderer dev + main dev).
3. **Build dependency**: Main build requires `renderer/dist`. Renderer must be built first.
4. **Optional dependencies**: ESLint plugins are optional; install with `--include=optional` if needed.
5. **Pre-commit**: Hooks run per-file; use `--all-files` for full check.

## OpenSpec (spec-driven development)

The project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) (CLI required: `npm i -g @fission-ai/openspec`).

```
openspec/
├── config.yaml     # Project context + per-artifact rules (read before planning)
├── specs/          # Master specs: current capabilities, one dir per capability
└── changes/        # Change proposals (delta specs) → archived after apply
```

- **Master specs** describe the system as it exists today (`openspec/specs/<capability>/spec.md`, format: `## Purpose` + `## Requirements` with `### Requirement:` / `#### Scenario:` blocks). Keep them in sync when behavior changes.
- **Project context** lives in `openspec/config.yaml` (`context:` field) — fork constraints (gamepad feature, upstream mergeability) that agents must honor.
- **Workflow** (ZCode slash commands from `.zcode/commands/opsx/`, skills in `.zcode/skills/`):
  - `/opsx:propose <idea>` – plan a change (proposal, delta specs, design, tasks; planning only, no code edits)
  - `/opsx:apply <change>` – implement the planned change
  - `/opsx:sync` / `/opsx:archive <change>` – merge delta specs into master specs
  - `/opsx:explore`, `/opsx:update` – exploration and artifact refresh
- **Validation**: `openspec validate --specs --strict` (must pass before committing spec changes); `openspec list --specs` / `openspec view` to browse.

## References

- `DEVELOPING.md` – Complete development guide
- `.github/workflows/main.yml` – CI build pipeline
- `.pre-commit-config.yaml` – Pre-commit hook definitions
- `versionCheck.py` – Version consistency validator
- `openspec/config.yaml` – OpenSpec project context
