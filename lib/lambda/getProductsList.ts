import { APIGatewayProxyHandler } from "aws-lambda";
import { mockProducts } from "./mock";

export const handler: APIGatewayProxyHandler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(mockProducts),
  };
};
