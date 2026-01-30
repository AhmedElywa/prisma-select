# prisma-select example

Pothos + GraphQL Yoga + Bun + SQLite demo showing `prisma-select` in action.

## Setup

```bash
cd example
bun install
bunx prisma migrate dev --name init
bun run seed
```

## Run

```bash
bun run dev
```

Open http://localhost:4000/graphql and run:

```graphql
{
  users {
    name
    posts {
      title
      comments {
        text
      }
    }
  }
}
```

Watch the terminal — Prisma logs show only the requested fields are selected.
