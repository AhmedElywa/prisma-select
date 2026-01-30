import SchemaBuilder from '@pothos/core';
import type { PrismaClient } from '@prisma/client';
import type { GraphQLResolveInfo } from 'graphql';
import { PrismaSelect } from 'prisma-select';
import { schema as prismaSelectSchema } from '../prisma/generated/prisma-select/index.js';

interface Context {
  prisma: PrismaClient;
}

const builder = new SchemaBuilder<{ Context: Context }>({});

// --- Object types ---

const UserRef = builder.objectRef<any>('User');
const PostRef = builder.objectRef<any>('Post');
const CommentRef = builder.objectRef<any>('Comment');

builder.objectType(UserRef, {
  fields: (t) => ({
    id: t.exposeInt('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name', { nullable: true }),
    posts: t.field({
      type: [PostRef],
      resolve: (user) => user.posts,
    }),
  }),
});

builder.objectType(PostRef, {
  fields: (t) => ({
    id: t.exposeInt('id'),
    title: t.exposeString('title'),
    body: t.exposeString('body', { nullable: true }),
    published: t.exposeBoolean('published'),
    author: t.field({
      type: UserRef,
      resolve: (post) => post.author,
    }),
    comments: t.field({
      type: [CommentRef],
      resolve: (post) => post.comments,
    }),
  }),
});

builder.objectType(CommentRef, {
  fields: (t) => ({
    id: t.exposeInt('id'),
    text: t.exposeString('text'),
    post: t.field({
      type: PostRef,
      resolve: (comment) => comment.post,
    }),
  }),
});

// --- Query type ---

builder.queryType({
  fields: (t) => ({
    users: t.field({
      type: [UserRef],
      resolve: async (_root, _args, ctx, info) => {
        const select = new PrismaSelect(info, { schema: prismaSelectSchema });
        return ctx.prisma.user.findMany({ ...select.value });
      },
    }),
    user: t.field({
      type: UserRef,
      nullable: true,
      args: { id: t.arg.int({ required: true }) },
      resolve: async (_root, args, ctx, info) => {
        const select = new PrismaSelect(info, { schema: prismaSelectSchema });
        return ctx.prisma.user.findUnique({ where: { id: args.id }, ...select.value }) as any;
      },
    }),
    posts: t.field({
      type: [PostRef],
      resolve: async (_root, _args, ctx, info) => {
        const select = new PrismaSelect(info, { schema: prismaSelectSchema });
        return ctx.prisma.post.findMany({ ...select.value });
      },
    }),
  }),
});

export const schema = builder.toSchema();
