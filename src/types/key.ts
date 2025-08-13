// A key can be a primitive or a function of the entity's data shape
export type KeyDefinitionPrimitive = string | number;
export type KeyDefinitionArray = KeyDefinitionPrimitive[];
export type KeyDefinitionFunction<T> = (
  entity: T,
) => KeyDefinitionPrimitive | KeyDefinitionArray;
export type KeyDefinition<T> =
  | KeyDefinitionPrimitive
  | KeyDefinitionArray
  | KeyDefinitionFunction<T>;
