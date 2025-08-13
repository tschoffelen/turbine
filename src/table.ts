import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  GetCommandInput,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";

import { TurbineError } from "./error";
import { Table, TableDefinition } from "./types/table";

export const defineTable = (definition: TableDefinition): Table => {
  let client: DynamoDBDocumentClient;
  if (definition.documentClient) {
    client = definition.documentClient;
  } else {
    client = DynamoDBDocumentClient.from(new DynamoDBClient(), {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
      },
    });
  }

  if (!definition.name) {
    throw new TurbineError("Table name is required");
  }

  if (!definition.indexes?.table) {
    throw new TurbineError("Specify at least one index called 'table'");
  }

  const put = (params: Omit<PutCommandInput, "TableName">) => {
    return client.send(
      new PutCommand({ ...params, TableName: definition.name }),
    );
  };

  const update = (params: Omit<UpdateCommandInput, "TableName">) => {
    return client.send(
      new UpdateCommand({ ...params, TableName: definition.name }),
    );
  };

  const get = (params: Omit<GetCommandInput, "TableName">) => {
    return client.send(
      new GetCommand({ ...params, TableName: definition.name }),
    );
  };

  const deleteItem = (params: Omit<DeleteCommandInput, "TableName">) => {
    return client.send(
      new DeleteCommand({ ...params, TableName: definition.name }),
    );
  };

  const query = (params: Omit<QueryCommandInput, "TableName">) => {
    return client.send(
      new QueryCommand({ ...params, TableName: definition.name }),
    );
  };

  return {
    client,
    definition,
    put,
    update,
    get,
    delete: deleteItem,
    query,
  };
};
