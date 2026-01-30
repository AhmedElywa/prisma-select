import { PrismaClient } from '@prisma/client';
import { createYoga } from 'graphql-yoga';
import { schema } from './schema.js';

const prisma = new PrismaClient({ log: ['query'] });

const yoga = createYoga({
  schema,
  context: () => ({ prisma }),
});

const server = Bun.serve({
  fetch: yoga,
  port: 4000,
});

console.log(`GraphQL server running at http://localhost:${server.port}/graphql`);
