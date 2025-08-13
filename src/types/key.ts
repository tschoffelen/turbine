// A key can be a primitive or a function of the entity's data shape
export type KeyDefinitionPrimitive = string | number;
export type KeyDefinitionFunction<T> = (entity: T) => KeyDefinitionPrimitive;
export type KeyDefinition<T> =
  | KeyDefinitionPrimitive
  | KeyDefinitionFunction<T>;
