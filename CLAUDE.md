# CLAUDE.md

## Project Purpose

`prisma-select` is a standalone, zero-dependency (no `@paljs/*`) package that solves the N+1 query problem for GraphQL + Prisma apps. It converts GraphQL `info` (resolve info) into Prisma `select` objects, so only the fields requested by the client are fetched from the database.

**Why standalone?** The original implementation lives in `@paljs/plugins` inside the `prisma-tools` monorepo. That package pulls in `@paljs/types` and depends on Prisma's full DMMF format. This project replaces all of that with a single lightweight package:
- Uses a minimal `Schema` type instead of Prisma's DMMF
- Ships its own Prisma generator that outputs only model/field/relation mappings
- Zero `@paljs/*` dependencies — just `graphql-parse-resolve-info` and `@prisma/generator-helper`

**Origin:** Ported from `/home/dev/projects/prisma-tools/packages/plugins/src/select.ts`.

## Commands

```bash
bun install          # Install dependencies
bun run build        # Build runtime + generator + declarations
bun test             # Run tests
bun run check        # Lint/format check (biome)
bun run check:fix    # Auto-fix lint/format
```

## Project Structure

```
src/
├── index.ts              # Public exports (PrismaSelect, types)
├── select.ts             # PrismaSelect class — the core runtime
├── types.ts              # Schema, FieldDef, ModelDef types
└── generator/
    ├── index.ts           # Prisma generatorHandler entry point
    └── writer.ts          # Writes schema.ts + index.ts to output dir
bin/
└── cli.js                # Generator binary (prisma calls this)
tests/
├── select.test.ts        # PrismaSelect utility tests
└── generator.test.ts     # Generator output tests
```

## Build

Build produces two bundles via `bun build` + declaration files via `tsc`:
- `dist/index.js` — runtime (PrismaSelect class + types)
- `dist/generator/index.js` — Prisma generator
- `dist/*.d.ts` — TypeScript declarations

## Code Style

- Biome for lint + format (same config as prisma-tools)
- Lefthook pre-commit hook runs biome on staged files
- Single quotes, trailing commas, 120 char line width

## User API

```prisma
generator select {
  provider = "prisma-select"
  output   = "./generated/prisma-select"
}
```

```ts
import { PrismaSelect } from 'prisma-select';
import { schema } from './generated/prisma-select';

const select = new PrismaSelect(info, { schema });
return prisma.user.findMany({ ...args, ...select.value });
```

## Status

Beta (`1.0.0-beta.1`). See `PLAN.md` for what's done and what's left.
