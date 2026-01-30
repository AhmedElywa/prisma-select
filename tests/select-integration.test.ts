import { describe, expect, it } from 'bun:test';
import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from 'graphql';
import { PrismaSelect } from '../src/select';
import type { Schema } from '../src/types';

const schema: Schema = {
  User: {
    fields: {
      id: { kind: 'scalar', type: 'Int' },
      name: { kind: 'scalar', type: 'String' },
      email: { kind: 'scalar', type: 'String' },
      password: { kind: 'scalar', type: 'String' },
      posts: { kind: 'object', type: 'Post' },
      profile: { kind: 'object', type: 'Profile' },
    },
  },
  Post: {
    fields: {
      id: { kind: 'scalar', type: 'Int' },
      title: { kind: 'scalar', type: 'String' },
      body: { kind: 'scalar', type: 'String' },
      author: { kind: 'object', type: 'User' },
      comments: { kind: 'object', type: 'Comment' },
    },
    documentation: '/// @PrismaSelect.map([BlogPost])',
  },
  Comment: {
    fields: {
      id: { kind: 'scalar', type: 'Int' },
      text: { kind: 'scalar', type: 'String' },
      post: { kind: 'object', type: 'Post' },
    },
  },
  Profile: {
    fields: {
      id: { kind: 'scalar', type: 'Int' },
      bio: { kind: 'scalar', type: 'String' },
      user: { kind: 'object', type: 'User' },
    },
  },
};

// Build a real GraphQL schema to capture real GraphQLResolveInfo
const CommentType = new GraphQLObjectType({
  name: 'Comment',
  fields: () => ({
    id: { type: GraphQLInt },
    text: { type: GraphQLString },
  }),
});

const ProfileType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: GraphQLInt },
    bio: { type: GraphQLString },
  }),
});

const PostType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: GraphQLInt },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    author: { type: UserType },
    comments: { type: new GraphQLList(CommentType) },
  }),
});

const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    email: { type: GraphQLString },
    password: { type: GraphQLString },
    posts: { type: new GraphQLList(PostType) },
    profile: { type: ProfileType },
    _count: {
      type: new GraphQLObjectType({
        name: 'UserCount',
        fields: { posts: { type: GraphQLInt } },
      }),
    },
  }),
});

// BlogPost maps to Post via @PrismaSelect.map()
const BlogPostType = new GraphQLObjectType({
  name: 'BlogPost',
  fields: () => ({
    id: { type: GraphQLInt },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    author: { type: UserType },
  }),
});

/**
 * Execute a query against a test schema, capturing the GraphQLResolveInfo from the resolver.
 */
function captureInfo(
  query: string,
  rootTypeName: string,
  returnType: GraphQLObjectType,
  isList = false,
): Promise<GraphQLResolveInfo> {
  return new Promise((resolve, reject) => {
    const queryType = new GraphQLObjectType({
      name: 'Query',
      fields: {
        [rootTypeName]: {
          type: isList ? new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(returnType))) : returnType,
          args: {
            where: { type: GraphQLString },
          },
          resolve: (_root, _args, _ctx, info) => {
            resolve(info);
            return null;
          },
        },
      },
    });
    const gqlSchema = new GraphQLSchema({ query: queryType });
    graphql({ schema: gqlSchema, source: query }).then((result) => {
      if (result.errors && !result.data) {
        reject(result.errors[0]);
      }
    });
  });
}

describe('PrismaSelect integration', () => {
  describe('value — basic scalar fields', () => {
    it('selects only requested scalar fields', async () => {
      const info = await captureInfo('{ users { id name } }', 'users', UserType, true);
      const ps = new PrismaSelect(info, { schema });
      expect(ps.value).toEqual({
        select: { id: true, name: true },
      });
    });
  });

  describe('value — nested relations', () => {
    it('selects nested User → posts → comments', async () => {
      const info = await captureInfo('{ user { id posts { title comments { text } } } }', 'user', UserType);
      const ps = new PrismaSelect(info, { schema });
      expect(ps.value).toEqual({
        select: {
          id: true,
          posts: {
            select: {
              title: true,
              comments: {
                select: { text: true },
              },
            },
          },
        },
      });
    });
  });

  describe('valueOf', () => {
    it('extracts a nested field select', async () => {
      const info = await captureInfo('{ user { id posts { title body } } }', 'user', UserType);
      const ps = new PrismaSelect(info, { schema });
      const postsValue = ps.valueOf('posts');
      expect(postsValue).toEqual({
        select: { title: true, body: true },
      });
    });

    it('returns {} for non-existent field', async () => {
      const info = await captureInfo('{ user { id } }', 'user', UserType);
      const ps = new PrismaSelect(info, { schema });
      expect(ps.valueOf('nonexistent')).toEqual({});
    });
  });

  describe('valueWithFilter', () => {
    it('filters select by model name', async () => {
      const info = await captureInfo('{ user { id name email password } }', 'user', UserType);
      const ps = new PrismaSelect(info, { schema });
      const result = ps.valueWithFilter('User');
      expect(result).toEqual({
        select: { id: true, name: true, email: true, password: true },
      });
    });
  });

  describe('@PrismaSelect.map()', () => {
    it('maps BlogPost GraphQL type to Post model via documentation', async () => {
      const info = await captureInfo('{ blogPost { id title body } }', 'blogPost', BlogPostType);
      const ps = new PrismaSelect(info, { schema });
      // BlogPost isn't in schema directly, but Post has @PrismaSelect.map([BlogPost])
      const result = ps.valueWithFilter('BlogPost');
      expect(result).toEqual({
        select: { id: true, title: true, body: true },
      });
    });
  });

  describe('defaultFields option', () => {
    it('includes static default fields', async () => {
      const info = await captureInfo('{ user { name } }', 'user', UserType);
      const ps = new PrismaSelect(info, {
        schema,
        defaultFields: { User: { id: true, email: true } } as any,
      });
      const result = ps.valueWithFilter('User');
      expect(result).toEqual({
        select: { id: true, email: true, name: true },
      });
    });

    it('supports function default fields', async () => {
      const info = await captureInfo('{ user { name } }', 'user', UserType);
      const ps = new PrismaSelect(info, {
        schema,
        defaultFields: {
          User: (select: any) => (select.name ? { id: true } : {}),
        } as any,
      });
      const result = ps.valueWithFilter('User');
      expect(result).toEqual({
        select: { id: true, name: true },
      });
    });
  });

  describe('excludeFields option', () => {
    it('excludes static fields', async () => {
      const info = await captureInfo('{ user { id name email password } }', 'user', UserType);
      const ps = new PrismaSelect(info, {
        schema,
        excludeFields: { User: ['password'] } as any,
      });
      const result = ps.valueWithFilter('User');
      expect(result).toEqual({
        select: { id: true, name: true, email: true },
      });
    });

    it('supports function exclude fields', async () => {
      const info = await captureInfo('{ user { id name password } }', 'user', UserType);
      const ps = new PrismaSelect(info, {
        schema,
        excludeFields: {
          User: (_select: any) => ['password'],
        } as any,
      });
      const result = ps.valueWithFilter('User');
      expect(result).toEqual({
        select: { id: true, name: true },
      });
    });
  });

  describe('_count in select', () => {
    it('passes _count through as allowed prop', async () => {
      const info = await captureInfo('{ user { id name _count { posts } } }', 'user', UserType);
      const ps = new PrismaSelect(info, { schema });
      const result = ps.value;
      expect(result.select._count).toEqual({
        select: { posts: true },
      });
      expect(result.select.id).toBe(true);
      expect(result.select.name).toBe(true);
    });
  });
});
