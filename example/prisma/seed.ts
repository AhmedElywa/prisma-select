import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      posts: {
        create: [
          {
            title: 'Hello World',
            body: 'This is my first post',
            published: true,
            comments: {
              create: [{ text: 'Great post!' }, { text: 'Welcome to the blog!' }],
            },
          },
          {
            title: 'Draft Post',
            body: 'Work in progress',
            published: false,
          },
        ],
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob',
      posts: {
        create: {
          title: 'Prisma is awesome',
          body: 'Prisma makes database access easy',
          published: true,
          comments: {
            create: [{ text: 'Totally agree!' }, { text: 'Nice write-up' }],
          },
        },
      },
    },
  });

  console.log('Seeded:', { alice: alice.id, bob: bob.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
