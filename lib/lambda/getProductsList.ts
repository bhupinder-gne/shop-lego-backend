import { APIGatewayProxyHandler } from "aws-lambda";
import { mockProducts } from "./mock";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  const productsData = await client.send(
    new ScanCommand({ TableName: "products" })
  );
  const stocksData = await client.send(new ScanCommand({ TableName: "stock" }));

  const products = productsData.Items?.map((item) => unmarshall(item)) || [];
  const stocks = stocksData.Items?.map((item) => unmarshall(item)) || [];

  const merged = products.map((product) => {
    const stock = stocks.find((s) => s.product_id === product.id);
    return {
      ...product,
      count: stock?.count ?? 0,
    };
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(merged),
  };
};
