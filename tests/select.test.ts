import { describe, expect, it } from 'bun:test';
import { PrismaSelect } from '../src/select';
import type { Schema } from '../src/types';

// Test static utilities only (PrismaSelect requires GraphQLResolveInfo which needs a full GraphQL setup)

describe('PrismaSelect', () => {
  describe('isObject', () => {
    it('returns true for plain objects', () => {
      expect(PrismaSelect.isObject({})).toBe(true);
      expect(PrismaSelect.isObject({ a: 1 })).toBe(true);
    });

    it('returns false for non-objects', () => {
      expect(PrismaSelect.isObject(null)).toBeFalsy();
      expect(PrismaSelect.isObject(undefined)).toBeFalsy();
      expect(PrismaSelect.isObject(42)).toBeFalsy();
      expect(PrismaSelect.isObject('str')).toBeFalsy();
      expect(PrismaSelect.isObject([1, 2])).toBeFalsy();
    });
  });

  describe('mergeDeep', () => {
    it('merges flat objects', () => {
      expect(PrismaSelect.mergeDeep({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });

    it('merges nested objects', () => {
      const target = { a: { x: 1 } };
      const source = { a: { y: 2 }, b: 3 };
      expect(PrismaSelect.mergeDeep(target, source)).toEqual({ a: { x: 1, y: 2 }, b: 3 });
    });

    it('overwrites non-object values', () => {
      expect(PrismaSelect.mergeDeep({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });

    it('handles multiple sources', () => {
      expect(PrismaSelect.mergeDeep({}, { a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
    });
  });
});

describe('Schema type', () => {
  it('accepts valid schema objects', () => {
    const schema: Schema = {
      User: {
        fields: {
          id: { kind: 'scalar', type: 'Int' },
          email: { kind: 'scalar', type: 'String' },
          posts: { kind: 'object', type: 'Post' },
        },
      },
      Post: {
        fields: {
          id: { kind: 'scalar', type: 'Int' },
          title: { kind: 'scalar', type: 'String' },
          author: { kind: 'object', type: 'User' },
        },
      },
    };
    expect(Object.keys(schema)).toEqual(['User', 'Post']);
    expect(schema.User.fields.id.kind).toBe('scalar');
    expect(schema.User.fields.posts.kind).toBe('object');
  });
});
