import { z } from "zod";

import { EntityDefinition, Filter, Operator } from "./types/entity";

export const generateAttributeValues = (
  patch: Record<string, unknown>,
  prefix?: string,
) => {
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined && value !== null)
    .reduce(
      (patch, [key, value]) => ({
        ...patch,
        [`:${prefix || ""}${key}`]: value,
      }),
      {},
    );
};

export const generateAttributeNames = (
  patch: Record<string, unknown>,
  prefix?: string,
) => {
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .reduce(
      (patch, [key]) => ({ ...patch, [`#${prefix || ""}${key}`]: key }),
      {},
    );
};

export const generateQueryExpression = <
  D extends EntityDefinition<z.ZodObject>,
>(
  key: Record<string, unknown>,
  filters?: Filter<D>[],
) => {
  const keyCondition = Object.entries(key)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key]) => `#${key} = :${key}`)
    .join(" AND ");

  const filter = generateFilterExpression(filters);

  return {
    KeyConditionExpression: keyCondition,
    FilterExpression: filter.FilterExpression,
    ExpressionAttributeNames: {
      ...generateAttributeNames(key),
      ...filter.ExpressionAttributeNames,
    },
    ExpressionAttributeValues: {
      ...generateAttributeValues(key),
      ...filter.ExpressionAttributeValues,
    },
  };
};

export const generateFilterExpression = <
  D extends EntityDefinition<z.ZodObject>,
>(
  filters?: Filter<D>[],
) => {
  if (!filters || filters.length === 0) {
    return {};
  }

  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, unknown> = {};

  const filterExpressions = Object.entries(filters).map(
    ([attr, expression]) => {
      const attributeName = `#filter_${attr.toString()}`;
      const attributeValue = `:filter_${attr.toString()}`;

      ExpressionAttributeNames[attributeName] = attr.toString();

      if (expression.equals) {
        ExpressionAttributeValues[attributeValue] = expression.equals;
        return `${attributeName} = ${attributeValue}`;
      }
      if (expression.notEquals) {
        ExpressionAttributeValues[attributeValue] = expression.notEquals;
        return `${attributeName} <> ${attributeValue}`;
      }
      if (expression.greaterThan) {
        ExpressionAttributeValues[attributeValue] = expression.greaterThan;
        return `${attributeName} > ${attributeValue}`;
      }
      if (expression.lessThan) {
        ExpressionAttributeValues[attributeValue] = expression.lessThan;
        return `${attributeName} < ${attributeValue}`;
      }
      if (expression.greaterThanOrEquals) {
        ExpressionAttributeValues[attributeValue] =
          expression.greaterThanOrEquals;
        return `${attributeName} >= ${attributeValue}`;
      }
      if (expression.lessThanOrEquals) {
        ExpressionAttributeValues[attributeValue] = expression.lessThanOrEquals;
        return `${attributeName} <= ${attributeValue}`;
      }
      if (expression.between) {
        const [start, end] = expression.between;
        ExpressionAttributeValues[attributeValue + "1"] = start;
        ExpressionAttributeValues[attributeValue + "2"] = end;
        return `${attributeName} BETWEEN ${attributeValue + "1"} AND ${attributeValue + "2"}`;
      }
      if (expression.contains) {
        ExpressionAttributeValues[attributeValue] = expression.contains;
        return `contains(${attributeName}, ${attributeValue})`;
      }
      if (expression.notContains) {
        ExpressionAttributeValues[attributeValue] = expression.notContains;
        return `not contains(${attributeName}, ${attributeValue})`;
      }
      if (expression.beginsWith) {
        ExpressionAttributeValues[attributeValue] = expression.beginsWith;
        return `begins_with(${attributeName}, ${attributeValue})`;
      }
      if (expression.exists) {
        return `attribute_exists(${attributeName})`;
      }
      if (expression.notExists) {
        return `attribute_not_exists(${attributeName})`;
      }

      // Default: equals
      ExpressionAttributeValues[attributeValue] = expression.equals;
      return `${attributeName} = ${attributeValue}`;
    },
  );

  return {
    FilterExpression: filterExpressions.join(" AND "),
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
};

export const generateUpdateExpression = (
  patch: Record<string, unknown>,
  doNotOverwrite: string[] = [],
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
