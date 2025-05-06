import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { mockProducts } from "./mock";

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event: any) => {
  for (const item of mockProducts) {
    const productCommand = new PutItemCommand({
      TableName: "products",
      Item: {
        id: { S: item.id },
        createdAt: { N: String(Date.now()) },
        title: { S: item.title },
        description: { S: item.description },
        price: { N: String(item.price) },
      },
    });

    try {
      await dynamoDB.send(productCommand);
      console.log("Product Item succeeded:", item.title);

      const stockCount = Math.floor(Math.random() * 100) + 1;
      const stockCommand = new PutItemCommand({
        TableName: "stock",
        Item: {
          product_id: { S: item.id },
          count: { N: String(stockCount) },
        },
      });

      await dynamoDB.send(stockCommand);
      console.log(
        "Stock Item succeeded for product:",
        item.title,
        "with count:",
        stockCount
      );
    } catch (error) {
      console.error("An error occurred:", error);
      throw new Error(`Error handling item ${item.title}: ${error}`);
    }
  }
};
