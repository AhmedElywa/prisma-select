# Plan: Standalone `prisma-select` Project

## Goal
Create a new standalone project at `/home/dev/projects/prisma-select/` with its own GitHub repo (`AhmedElywa/prisma-select`), containing:
1. PrismaSelect runtime (ported from `@paljs/plugins/src/select.ts`)
2. Lightweight Prisma generator that outputs model/field/relation mappings only

## What Was Done

### Step 1: Create project & GitHub repo — DONE
- Created `/home/dev/projects/prisma-select/`
- `git init`, `bun install`
- `gh repo create AhmedElywa/prisma-select --public`
- Copied biome.json and lefthook.yml from prisma-tools
- `.gitignore` for node_modules, dist, bun.lockb

### Step 2: Project structure — DONE
```
prisma-select/
├── package.json
├── tsconfig.json
├── biome.json
├── lefthook.yml
├── src/
│   ├── index.ts         # Public exports (PrismaSelect, types)
│   ├── select.ts        # PrismaSelect class (ported, uses Schema instead of DMMF)
│   ├── types.ts         # Schema, FieldDef, ModelDef types
│   └── generator/
│       ├── index.ts     # generatorHandler entry
│       └── writer.ts    # writes schema.ts + index.ts
├── bin/
│   └── cli.js           # #!/usr/bin/env node
└── tests/
    ├── select.test.ts   # Static utility tests (isObject, mergeDeep, Schema type)
    └── generator.test.ts # writeSchema snapshot test
```

### Step 3: package.json — DONE
- name: `prisma-select`, version: `1.0.0-beta.1`
- bin: `prisma-select` → `./bin/cli.js`
- exports: `.` (runtime) and `./generator`
- peerDep: `graphql >=15`
- deps: `graphql-parse-resolve-info`, `@prisma/generator-helper`
- build script: bun build for runtime + generator bundles, tsc for declarations

### Step 4: tsconfig.json — DONE
- target: ES2022, module: ESNext, moduleResolution: bundler
- strict: true, declaration: true, emitDeclarationOnly: true, outDir: dist

### Step 5: Schema types (`src/types.ts`) — DONE
```ts
export interface FieldDef {
  kind: 'scalar' | 'enum' | 'object';
  type: string;
}
export interface ModelDef {
  fields: Record<string, FieldDef>;
  documentation?: string;
}
export type Schema = Record<string, ModelDef>;
```

### Step 6: PrismaSelect (`src/select.ts`) — DONE
Ported from `/home/dev/projects/prisma-tools/packages/plugins/src/select.ts`:
- Replaced `dmmf?: Pick<DMMF.Document, 'datamodel'>[]` with `schema?: Schema`
- `dataModel` getter → `this.models` returns `this.options?.schema ?? {}`
- `model(name)` → direct `schema[name]` lookup + `@PrismaSelect.map()` check via documentation
- `field(name, model)` → `model?.fields[name]`
- Removed `import { DMMF } from '@paljs/types'` — zero paljs deps
- Used `for...of` instead of `forEach` (biome lint)
- Cast generic mapped types to `any` for TS index access in `filterBy`

### Step 7: Generator (`src/generator/`) — DONE
- `generatorHandler({ onManifest, onGenerate })` using `@prisma/generator-helper`
- `writer.ts` reads `dmmf.datamodel.models`, extracts name/kind/type per field
- Writes `schema.ts` with `export const schema = { ... } as const satisfies Schema`
- Writes `index.ts` re-exporting schema + types
- Includes `ModelName` union type and `ModelsObject` interface for full type safety

### Step 8: bin/cli.js — DONE
```js
#!/usr/bin/env node
import '../dist/generator/index.js';
```

### Step 9: Tests — DONE
- `select.test.ts`: isObject, mergeDeep, Schema type validation (8 tests pass)
- `generator.test.ts`: writeSchema generates correct schema.ts and index.ts

### Step 10: Git commit & push — DONE
- Initial commit pushed to `AhmedElywa/prisma-select` main branch

## What's Left To Do

### Testing improvements
- [ ] Add integration tests with a real GraphQL setup (mock `GraphQLResolveInfo`)
- [ ] Test `PrismaSelect.value`, `valueOf`, `valueWithFilter` with actual resolve info
- [ ] Test `@PrismaSelect.map()` documentation matching
- [ ] Test `defaultFields` and `excludeFields` options
- [ ] End-to-end test: create a Prisma schema, run `prisma generate`, verify output files

### Generator improvements
- [ ] Add `_count` to ModelsObject interface entries (for `_count` select support)
- [ ] Consider generating a runtime `.js` file instead of `.ts` (so consumers don't need to compile)
- [ ] Add enum type exports to generated output if needed

### Package publishing
- [ ] Set up npm publishing workflow
- [ ] Add README.md with usage examples
- [ ] Add LICENSE file
- [ ] Add GitHub Actions CI (test + build)

### Verification checklist
- [x] `bun run build` succeeds (runtime: 0.57 MB, generator: 2.69 KB)
- [x] `bun test` passes (8 tests)
- [ ] Create a test prisma schema, run `prisma generate`, verify lightweight output
- [ ] Compare PrismaSelect output with existing @paljs/plugins snapshots for identical behavior

## Key Source Files (for reference)
- `/home/dev/projects/prisma-tools/packages/plugins/src/select.ts` — original runtime
- `/home/dev/projects/prisma-tools/packages/generator/src/generator.ts` — generator pattern reference

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
