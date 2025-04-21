import { APIGatewayProxyHandler } from "aws-lambda";
import { mockProducts } from "./mock";

export const handler: APIGatewayProxyHandler = async (event) => {
  const productId = event.pathParameters?.productId;
  const product = mockProducts.find((p) => p.id === productId);

  return {
    statusCode: product ? 200 : 404,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(product || { error: "Product not found" }),
  };
};
