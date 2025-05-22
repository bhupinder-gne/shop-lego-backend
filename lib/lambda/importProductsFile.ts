import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const S3 = new AWS.S3();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('Bucket name is not set in environment variables');
    }

    const fileName = event.queryStringParameters?.fileName;
    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing fileName query parameter' }),
      };
    }

    const objectKey = `uploaded/${fileName}`;

    const signedUrl = S3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: objectKey,
      Expires: 60,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ signedUrl }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};