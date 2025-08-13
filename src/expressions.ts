export const generateAttributeValues = (patch: Record<string, unknown>) => {
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined && value !== null)
    .reduce((patch, [key, value]) => ({ ...patch, [`:${key}`]: value }), {});
};

export const generateAttributeNames = (patch: Record<string, unknown>) => {
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .reduce((patch, [key]) => ({ ...patch, [`#${key}`]: key }), {});
};

export const generateKeyConditionExpression = (
  key: Record<string, unknown>
) => {
  const keyCondition = Object.entries(key)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key]) => `#${key} = :${key}`)
    .join(" AND ");

  return {
    Expression: keyCondition,
    ExpressionAttributeNames: generateAttributeNames(key),
    ExpressionAttributeValues: generateAttributeValues(key),
  };
};

export const generateUpdateExpression = (
  patch: Record<string, unknown>,
  doNotOverwrite: string[] = []
) => {
  const setExpression = Object.entries(patch)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key]) => {
      let value = `:${key}`;
      if (doNotOverwrite.includes(key)) {
        value = `if_not_exists(#${key}, ${value})`;
      }
      return `#${key} = ${value}`;
    });

  const removeExpression = Object.entries(patch)
    .filter(([, value]) => value === null)
    .map(([key]) => `#${key}`);

  const expressionComponents = [
    setExpression.length && `SET ${setExpression.join(", ")}`,
    removeExpression.length && `REMOVE ${removeExpression.join(", ")}`,
  ];

  return {
    UpdateExpression: expressionComponents.filter(Boolean).join(" "),
    ExpressionAttributeNames: generateAttributeNames(patch),
    ExpressionAttributeValues: generateAttributeValues(patch),
  };
};
