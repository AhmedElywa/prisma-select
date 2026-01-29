import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { generatorHandler } = require('@prisma/generator-helper');
import { mkdirSync } from 'node:fs';
import type { GeneratorManifest, GeneratorOptions } from '@prisma/generator-helper';
import { writeSchema } from './writer.js';

const GENERATOR_NAME = 'prisma-select';
const GENERATOR_VERSION = '1.0.0-beta.1';

function onManifest(): GeneratorManifest {
  return {
    defaultOutput: './generated/prisma-select',
    prettyName: 'Prisma Select',
    version: GENERATOR_VERSION,
  };
}

async function onGenerate(options: GeneratorOptions): Promise<void> {
  const { generator, dmmf } = options;

  const outputDir = generator.output?.value;
  if (!outputDir) {
    throw new Error(
      'Output directory is required. Add `output = "./generated/prisma-select"` to your generator block.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  console.log(`Prisma Select Generator v${GENERATOR_VERSION}`);
  console.log(`Output: ${outputDir}`);

  writeSchema(outputDir, dmmf.datamodel.models as any);

  console.log('Generation complete!');
}

generatorHandler({
  onManifest,
  onGenerate,
});
