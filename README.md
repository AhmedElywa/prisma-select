# prisma-select

Convert GraphQL resolve info into Prisma `select` objects. Solves the N+1 query problem by fetching only the fields requested by the client.

Zero `@paljs/*` dependencies. Ships a lightweight Prisma generator for full type safety.

## Install

```sh
npm install prisma-select graphql
```

## Prisma Generator Setup

Add the generator to your `schema.prisma`:

```prisma
generator select {
  provider = "prisma-select"
  output   = "./generated/prisma-select"
}
```

Run `prisma generate`. This outputs a `schema.ts` with model/field mappings and TypeScript types.

## Usage

```ts
import { PrismaSelect } from 'prisma-select';
import { schema, type ModelName, type ModelsObject } from './generated/prisma-select';

// In your GraphQL resolver:
function resolve(root, args, ctx, info) {
  const select = new PrismaSelect<ModelName, ModelsObject>(info, { schema });
  return ctx.prisma.user.findMany({
    ...args,
    ...select.value,
  });
}
```

## API

### `new PrismaSelect(info, options?)`

Create an instance from `GraphQLResolveInfo`.

### `.value`

Returns `{ select: { ... } }` matching the GraphQL query fields.

### `.valueOf(field, filterBy?, mergeObject?)`

Extract the select for a nested field.

```ts
const postsSelect = select.valueOf('posts');
// { select: { title: true, body: true } }
```

### `.valueWithFilter(modelName)`

Filter the select object by a Prisma model name. Useful when your GraphQL type name differs from the Prisma model.

## Options

### `schema`

Pass the generated schema for field validation and relation filtering.

### `defaultFields`

Always include certain fields, even if the client didn't request them.

```ts
new PrismaSelect(info, {
  schema,
  defaultFields: {
    User: { id: true, email: true },
    Post: (select) => select.title ? { slug: true } : {},
  },
});
```

### `excludeFields`

Exclude fields from the select, even if the client requested them.

```ts
new PrismaSelect(info, {
  schema,
  excludeFields: {
    User: ['password', 'hash'],
    Post: (select) => select.isAdmin ? [] : ['internalNotes'],
  },
});
```

### `@PrismaSelect.map()`

Map a GraphQL type to a different Prisma model via schema documentation:

```prisma
/// @PrismaSelect.map([BlogPost])
model Post {
  id    Int    @id
  title String
}
```

Now `BlogPost` GraphQL queries use the `Post` model's field definitions.

## License

MIT
