import type { GraphQLResolveInfo } from 'graphql';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import type { ModelDef, Schema } from './types.js';

export interface PrismaSelectOptions<
  ModelName extends string,
  ModelsObject extends Record<ModelName, Record<string, any>>,
> {
  /**
   * Object with models and fields to always include, even if not requested in GraphQL query.
   * @example
   * const defaultFields = {
   *    User: { id: true, name: true },
   *    Post: { id: true, body: true },
   *    Account: (select) => select.name ? { firstname: true, lastname: true } : {}
   * }
   */
  defaultFields?: {
    [model in ModelName]?:
      | {
          [field in keyof ModelsObject[model]]?: boolean;
        }
      | ((select: any) => { [field in keyof ModelsObject[model]]?: boolean });
  };
  /**
   * Object with models and fields to exclude, even if requested in GraphQL query.
   * @example
   * const excludeFields = {
   *    User: ['password', 'hash'],
   *    Post: ['internalNotes'],
   *    Account: (select) => select.isAdmin ? [] : ['secretKey']
   * }
   */
  excludeFields?: {
    [model in ModelName]?:
      | (keyof ModelsObject[model] | string)[]
      | ((select: any) => (keyof ModelsObject[model] | string)[]);
  };
  /**
   * Schema object with model/field definitions for field validation and filtering.
   *
   * Use the schema from the prisma-select generator output:
   * @example
   * ```typescript
   * import { schema } from './generated/prisma-select';
   *
   * new PrismaSelect<'User', ModelsObject>(info, {
   *   schema,
   * });
   * ```
   *
   * Without schema, PrismaSelect still works but field validation is skipped.
   */
  schema?: Schema;
}

/**
 * Convert GraphQL `info` to a Prisma select object.
 *
 * @param info - GraphQLResolveInfo from resolver
 *
 * @example Basic usage
 * ```typescript
 * const select = new PrismaSelect(info);
 * const users = await prisma.user.findMany({
 *   ...args,
 *   ...select.value,
 * });
 * ```
 *
 * @example With schema from generator
 * ```typescript
 * import { schema, type ModelsObject, type ModelName } from './generated/prisma-select';
 *
 * const select = new PrismaSelect<ModelName, ModelsObject>(info, {
 *   schema,
 *   defaultFields: {
 *     User: { id: true, email: true },
 *   },
 * });
 * ```
 */
export class PrismaSelect<
  ModelName extends string = '',
  ModelsObject extends Record<ModelName, Record<string, any>> = Record<ModelName, Record<string, any>>,
> {
  private availableArgs = ['where', 'orderBy', 'skip', 'cursor', 'take', 'distinct'];
  private allowedProps = ['_count'];
  private isAggregate = false;

  constructor(
    private info: GraphQLResolveInfo,
    private options?: PrismaSelectOptions<ModelName, ModelsObject>,
  ) {}

  get value() {
    const returnType = this.info.returnType.toString().replace(/]/g, '').replace(/\[/g, '').replace(/!/g, '');
    this.isAggregate = returnType.includes('Aggregate');
    return this.valueWithFilter(returnType);
  }

  private get models(): Schema {
    return this.options?.schema ?? {};
  }

  get defaultFields() {
    return this.options?.defaultFields;
  }

  get excludeFields() {
    return this.options?.excludeFields;
  }

  private get fields() {
    return parseResolveInfo(this.info);
  }

  private static getModelMap(docs?: string, name?: string) {
    const value = docs?.match(/@PrismaSelect.map\(\[(.*?)]\)/);
    if (value && name) {
      const asArray = value[1]
        .replace(/ /g, '')
        .split(',')
        .filter((v) => v);
      return asArray.includes(name);
    }
    return false;
  }

  private model(name?: string): ModelDef | undefined {
    if (!name) return undefined;
    const schema = this.models;
    // Direct match
    if (schema[name]) return schema[name];
    // Check @PrismaSelect.map() in documentation
    for (const [, modelDef] of Object.entries(schema)) {
      if (PrismaSelect.getModelMap(modelDef.documentation, name)) {
        return modelDef;
      }
    }
    return undefined;
  }

  private field(name: string, model?: ModelDef) {
    return model?.fields[name];
  }

  static isObject(item: any) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  static mergeDeep(target: any, ...sources: any[]): any {
    if (!sources.length) return target;
    const source: any = sources.shift();

    if (PrismaSelect.isObject(target) && PrismaSelect.isObject(source)) {
      for (const key in source) {
        if (PrismaSelect.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          PrismaSelect.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return PrismaSelect.mergeDeep(target, ...sources);
  }

  /**
   * Get nested value from a select object.
   * @param field - name of field in a select object.
   * @param filterBy - Model name as you have in schema.prisma file.
   * @param mergeObject
   */
  valueOf(field: string, filterBy?: string, mergeObject: any = {}) {
    const splitItem = field.split('.');
    let newValue: Record<string, any> = this.getSelect(this.fields);
    for (const field of splitItem) {
      if (this.isAggregate && Object.prototype.hasOwnProperty.call(newValue, field)) {
        newValue = newValue[field];
      } else if (
        !this.isAggregate &&
        Object.prototype.hasOwnProperty.call(newValue, 'select') &&
        Object.prototype.hasOwnProperty.call(newValue.select, field)
      ) {
        newValue = newValue.select[field];
      } else {
        return {};
      }
    }
    return filterBy ? PrismaSelect.mergeDeep(this.filterBy(filterBy, newValue), mergeObject) : newValue;
  }

  /**
   * Work with this method if your GraphQL type name not like Schema model name.
   * @param modelName - Model name as you have in schema.prisma file.
   */
  valueWithFilter(modelName: string) {
    return this.filterBy(modelName, this.getSelect(this.fields));
  }

  private filterBy(modelName: string, selectObject: any) {
    const model = this.model(modelName);
    if (model && typeof selectObject === 'object') {
      let defaultFields = {};
      if (this.defaultFields && (this.defaultFields as any)[modelName]) {
        const modelFields = (this.defaultFields as any)[modelName];
        defaultFields = typeof modelFields === 'function' ? modelFields(selectObject.select) : modelFields;
      }
      const filteredObject = {
        ...selectObject,
        select: { ...defaultFields },
      };

      for (const key in selectObject.select) {
        if (this.excludeFields && (this.excludeFields as any)[modelName]) {
          const modelFields = (this.excludeFields as any)[modelName];
          const excludeFields = typeof modelFields === 'function' ? modelFields(selectObject.select) : modelFields;
          if (excludeFields.includes(key)) continue;
        }

        if (this.allowedProps.includes(key)) {
          filteredObject.select[key] = selectObject.select[key];
          continue;
        }

        const field = this.field(key, model);
        if (field) {
          if (field.kind !== 'object') {
            filteredObject.select[key] = true;
            continue;
          }

          const subModelFilter = this.filterBy(field.type, selectObject.select[key]);
          if (subModelFilter === true) {
            filteredObject.select[key] = true;
            continue;
          }

          if (Object.keys(subModelFilter.select).length > 0) {
            filteredObject.select[key] = subModelFilter;
          }
        }
      }
      return filteredObject;
    }
    return selectObject;
  }

  private getArgs(args?: Record<string, unknown>) {
    const filteredArgs: Record<string, any> = {};
    if (args) {
      for (const key of this.availableArgs) {
        if (args[key]) {
          filteredArgs[key] = args[key];
        }
      }
    }
    return filteredArgs;
  }

  private getSelect(fields: any, parent = true) {
    const selectObject: any = this.isAggregate ? {} : { select: {}, ...(parent ? {} : this.getArgs(fields?.args)) };
    if (fields) {
      for (const type of Object.keys(fields.fieldsByTypeName)) {
        const fieldsByTypeName = fields.fieldsByTypeName[type];
        for (const key of Object.keys(fieldsByTypeName)) {
          const fieldName = fieldsByTypeName[key].name;
          if (Object.keys(fieldsByTypeName[key].fieldsByTypeName).length === 0) {
            if (this.isAggregate) {
              selectObject[fieldName] = true;
            } else {
              selectObject.select[fieldName] = true;
            }
          } else {
            if (this.isAggregate) {
              selectObject[fieldName] = this.getSelect(fieldsByTypeName[key], false);
            } else {
              selectObject.select[fieldName] = this.getSelect(fieldsByTypeName[key], false);
            }
          }
        }
      }
    }
    return selectObject;
  }
}
