import { beforeAll, describe, expect, it } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const e2eDir = resolve(import.meta.dir);
const generatedDir = resolve(e2eDir, 'generated');
const projectRoot = resolve(e2eDir, '../..');

describe('E2E: prisma generate', () => {
  beforeAll(() => {
    rmSync(generatedDir, { recursive: true, force: true });
    // Build the generator first
    execSync('bun run build', { cwd: projectRoot, stdio: 'pipe' });
    // Run prisma generate (longer timeout for CI where prisma may need downloading)
    execSync('bunx prisma generate', { cwd: e2eDir, stdio: 'pipe', timeout: 60_000 });
  }, 120_000);

  it('creates schema.ts', () => {
    expect(existsSync(resolve(generatedDir, 'schema.ts'))).toBe(true);
  });

  it('creates index.ts', () => {
    expect(existsSync(resolve(generatedDir, 'index.ts'))).toBe(true);
  });

  it('schema.ts contains all models', () => {
    const content = readFileSync(resolve(generatedDir, 'schema.ts'), 'utf-8');
    expect(content).toContain('Post: {');
    expect(content).toContain('User: {');
    expect(content).toContain('Comment: {');
  });

  it('schema.ts has correct field kinds', () => {
    const content = readFileSync(resolve(generatedDir, 'schema.ts'), 'utf-8');
    expect(content).toContain("title: { kind: 'scalar', type: 'String' }");
    expect(content).toContain("author: { kind: 'object', type: 'User' }");
    expect(content).toContain("posts: { kind: 'object', type: 'Post' }");
  });

  it('schema.ts has ModelName type', () => {
    const content = readFileSync(resolve(generatedDir, 'schema.ts'), 'utf-8');
    expect(content).toContain("'Post'");
    expect(content).toContain("'User'");
    expect(content).toContain("'Comment'");
  });

  it('schema.ts has ModelsObject with _count', () => {
    const content = readFileSync(resolve(generatedDir, 'schema.ts'), 'utf-8');
    expect(content).toContain('_count: true');
  });

  it('schema.ts includes documentation for @PrismaSelect.map', () => {
    const content = readFileSync(resolve(generatedDir, 'schema.ts'), 'utf-8');
    expect(content).toContain('@PrismaSelect.map([BlogPost])');
  });

  it('index.ts re-exports schema', () => {
    const content = readFileSync(resolve(generatedDir, 'index.ts'), 'utf-8');
    expect(content).toContain("export { schema } from './schema.js'");
    expect(content).toContain("export type { ModelName, ModelsObject } from './schema.js'");
  });
});
