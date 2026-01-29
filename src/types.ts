export interface FieldDef {
  kind: 'scalar' | 'enum' | 'object';
  type: string;
}

export interface ModelDef {
  fields: Record<string, FieldDef>;
  documentation?: string;
}

export type Schema = Record<string, ModelDef>;
