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

  const filterExpressions = filters.map((filter) => {
    const { attr, op } = filter;
    const attributeName = `#filter_${attr.toString()}`;
    const attributeValue = `:filter_${attr.toString()}`;

    ExpressionAttributeNames[attributeName] = attr.toString();
    if (op !== Operator.Exists && op !== Operator.NotExists) {
      const value = (filter as any).value;
      ExpressionAttributeValues[attributeValue] = value;
    }

    switch (op) {
      case Operator.Equals:
        return `${attributeName} = ${attributeValue}`;
      case Operator.NotEquals:
        return `${attributeName} <> ${attributeValue}`;
      case Operator.GreaterThan:
        return `${attributeName} > ${attributeValue}`;
      case Operator.LessThan:
        return `${attributeName} < ${attributeValue}`;
      case Operator.GreaterThanOrEquals:
        return `${attributeName} >= ${attributeValue}`;
      case Operator.LessThanOrEquals:
        return `${attributeName} <= ${attributeValue}`;
      case Operator.Contains:
        return `contains(${attributeName}, ${attributeValue})`;
      case Operator.NotContains:
        return `not contains(${attributeName}, ${attributeValue})`;
      case Operator.BeginsWith:
        return `begins_with(${attributeName}, ${attributeValue})`;
      case Operator.Exists:
        return `attribute_exists(${attributeName})`;
      case Operator.NotExists:
        return `attribute_not_exists(${attributeName})`;
      default:
        throw new Error(`Unsupported operator: ${op}`);
    }
  });

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
