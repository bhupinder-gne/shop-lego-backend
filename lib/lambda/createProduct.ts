import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    if (!body.title || !body.description || !body.price) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    const productId = uuidv4();

    const newProduct = {
      id: productId,
      title: body.title,
      description: body.description,
      price: body.price,
    };

    await client.send(
      new PutItemCommand({
        TableName: "Products",
        Item: marshall(newProduct),
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Product created", product: newProduct }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create product", error }),
    };
  }
};
