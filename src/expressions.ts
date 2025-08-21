import { z } from "zod";

import { EntityDefinition, Filter, Filters, Operator } from "./types/entity";

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

export const buildValue = (value: any) => {
  if (Array.isArray(value)) {
    value = value.join("#");
  }
  return value;
};

export const generateQueryExpression = <
  D extends EntityDefinition<z.ZodObject>,
>(
  key: Record<string, unknown>,
  filters?: Filters<D>,
) => {
  const keyCondition = generateFilterExpression(key as Filters<D>, "key");
  const filter = generateFilterExpression(filters);

  return {
    KeyConditionExpression: keyCondition.FilterExpression,
    FilterExpression: filter.FilterExpression,
    ExpressionAttributeNames: {
      ...keyCondition.ExpressionAttributeNames,
      ...filter.ExpressionAttributeNames,
    },
    ExpressionAttributeValues: {
      ...keyCondition.ExpressionAttributeValues,
      ...filter.ExpressionAttributeValues,
    },
  };
};

export const generateFilterExpression = <
  D extends EntityDefinition<z.ZodObject>,
>(
  filters?: Filters<D>,
  prefix = "filter",
) => {
  if (!filters || filters.length === 0) {
    return {};
  }

  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, unknown> = {};

  const filterExpressions = Object.entries(filters).map(
    ([attr, expression]) => {
      const attributeName = `#${prefix}_${attr.toString()}`;
      const attributeValue = `:${prefix}_${attr.toString()}`;

      ExpressionAttributeNames[attributeName] = attr.toString();

      if (expression?.equals) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.equals);
        return `${attributeName} = ${attributeValue}`;
      }
      if (expression?.notEquals) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.notEquals);
        return `${attributeName} <> ${attributeValue}`;
      }
      if (expression?.greaterThan) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.greaterThan);
        return `${attributeName} > ${attributeValue}`;
      }
      if (expression?.lessThan) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.lessThan);
        return `${attributeName} < ${attributeValue}`;
      }
      if (expression?.greaterThanOrEquals) {
        ExpressionAttributeValues[attributeValue] =
          buildValue(expression.greaterThanOrEquals);
        return `${attributeName} >= ${attributeValue}`;
      }
      if (expression?.lessThanOrEquals) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.lessThanOrEquals);
        return `${attributeName} <= ${attributeValue}`;
      }
      if (expression?.between) {
        const [start, end] = expression.between;
        ExpressionAttributeValues[attributeValue + "1"] = buildValue(start);
        ExpressionAttributeValues[attributeValue + "2"] = buildValue(end);
        return `${attributeName} BETWEEN ${attributeValue + "1"} AND ${attributeValue + "2"}`;
      }
      if (expression?.contains) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.contains);
        return `contains(${attributeName}, ${attributeValue})`;
      }
      if (expression?.notContains) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.notContains);
        return `not contains(${attributeName}, ${attributeValue})`;
      }
      if (expression?.beginsWith) {
        ExpressionAttributeValues[attributeValue] = buildValue(expression.beginsWith);
        return `begins_with(${attributeName}, ${attributeValue})`;
      }
      if (expression?.exists) {
        return `attribute_exists(${attributeName})`;
      }
      if (expression?.notExists) {
        return `attribute_not_exists(${attributeName})`;
      }

      // Default: equals
      ExpressionAttributeValues[attributeValue] = buildValue(expression);
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
