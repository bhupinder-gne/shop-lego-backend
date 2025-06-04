import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { v4 as uuidv4 } from "uuid";
import { SNS } from 'aws-sdk';

const client = new DynamoDBClient({});
const sns = new SNS();
const CREATE_PRODUCT_TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN!;

export const handler: SQSHandler = async (event: SQSEvent) => {
  const createdProducts = [];

  for (const record of event.Records) {
    try {
      const product = JSON.parse(record.body);
      const newProduct = {
        ...product,
        id: uuidv4()
      };

      await client.send(
        new PutItemCommand({
          TableName: "Products",
          Item: marshall(newProduct),
        })
      );
      createdProducts.push(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  }

  // Publish to SNS after all products are created
  if (createdProducts.length > 0) {
    await sns.publish({
      TopicArn: CREATE_PRODUCT_TOPIC_ARN,
      Subject: 'Products Created',
      Message: JSON.stringify({
        message: `${createdProducts.length} products created`,
        products: createdProducts,
      }),
    }).promise();
  }
};