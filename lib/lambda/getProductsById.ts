import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
export const handler: APIGatewayProxyHandler = async (event) => {
  const productId = event.pathParameters?.productId;
  const productRes = await client.send(
    new GetItemCommand({
      TableName: "products",
      Key: marshall({ id: productId }),
    })
  );

  const stockRes = await client.send(
    new GetItemCommand({
      TableName: "stock",
      Key: marshall({ id: productId }),
    })
  );

  if (!productRes.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Product not found" }),
    };
  }

  const product = unmarshall(productRes.Item);
  const stock = stockRes.Item ? unmarshall(stockRes.Item) : { count: 0 };

  return {
    statusCode: product ? 200 : 404,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify({ ...product, count: stock.count }),
  };
};
