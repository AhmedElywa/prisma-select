import { describe, expect, it } from 'bun:test';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeSchema } from '../src/generator/writer';

const tmpDir = resolve(import.meta.dir, '../.test-output');

describe('writeSchema', () => {
  it('generates schema.ts and index.ts', () => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });

    const models = [
      {
        name: 'User',
        fields: [
          { name: 'id', kind: 'scalar', type: 'Int' },
          { name: 'email', kind: 'scalar', type: 'String' },
          { name: 'role', kind: 'enum', type: 'Role' },
          { name: 'posts', kind: 'object', type: 'Post' },
        ],
        documentation: undefined,
      },
      {
        name: 'Post',
        fields: [
          { name: 'id', kind: 'scalar', type: 'Int' },
          { name: 'title', kind: 'scalar', type: 'String' },
          { name: 'author', kind: 'object', type: 'User' },
        ],
        documentation: '/// @PrismaSelect.map([BlogPost])',
      },
    ];

    writeSchema(tmpDir, models);

    const schemaContent = readFileSync(resolve(tmpDir, 'schema.ts'), 'utf-8');
    expect(schemaContent).toContain("import type { Schema } from 'prisma-select'");
    expect(schemaContent).toContain('export const schema = {');
    expect(schemaContent).toContain("id: { kind: 'scalar', type: 'Int' }");
    expect(schemaContent).toContain("posts: { kind: 'object', type: 'Post' }");
    expect(schemaContent).toContain("role: { kind: 'enum', type: 'Role' }");
    expect(schemaContent).toContain("export type ModelName = 'User' | 'Post'");
    expect(schemaContent).toContain('export interface ModelsObject');
    expect(schemaContent).toContain('@PrismaSelect.map([BlogPost])');

    const indexContent = readFileSync(resolve(tmpDir, 'index.ts'), 'utf-8');
    expect(indexContent).toContain("export { schema } from './schema.js'");
    expect(indexContent).toContain("export type { ModelName, ModelsObject } from './schema.js'");

    rmSync(tmpDir, { recursive: true, force: true });
  });
});
