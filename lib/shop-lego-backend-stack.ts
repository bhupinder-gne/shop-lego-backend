import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import path = require("path");
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as customResources from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class ShopLegoBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, "GetProductsList", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/getProductsList.ts"),
    });

    const getProductsById = new NodejsFunction(this, "GetProductsById", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/getProductsById.ts"),
    });

    const createProduct = new NodejsFunction(this, "CreateProduct", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/createProduct.ts"),
    });

    const api = new apigateway.RestApi(this, "ProductsAPI", {
      restApiName: "Product Service API",
    });

    const products = api.root.addResource("products");
    const productById = products.addResource("{productId}");

    const product = dynamodb.Table.fromTableName(this, "products", "products");
    const stock = dynamodb.Table.fromTableName(this, "stock", "stock");

    product.grantReadData(getProductsList);
    stock.grantReadData(getProductsList);
    product.grantReadData(getProductsById);
    stock.grantReadData(getProductsById);
    product.grantReadWriteData(createProduct);

    products.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProduct, {
        integrationResponses: [
          {
            statusCode: "201",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Headers": "'*'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      }),
      {
        methodResponses: [
          {
            statusCode: "201",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
          {
            statusCode: "400",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
          {
            statusCode: "500",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    products.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": "'*'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'GET,OPTIONS'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
            },
          },
        ],
      }
    );

    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList, {
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Headers": "'*'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    productById.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": "'*'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'GET,OPTIONS'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
            },
          },
        ],
      }
    );

    productById.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsById, {
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Headers": "'*'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      }),
      {
        requestParameters: {
          "method.request.path.id": true,
        },
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
          {
            statusCode: "404",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    //populate dynamo db tables

    const populateLambda = new NodejsFunction(this, "PopulateDynamoDBLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/populateDynamoDB.ts"),
    });

    product.grantReadWriteData(populateLambda);
    stock.grantReadWriteData(populateLambda);

    const provider = new customResources.Provider(this, "Provider", {
      onEventHandler: populateLambda,
    });

    new cdk.CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });

    new cdk.CfnOutput(this, "GetProductsListARN", {
      value: getProductsList.functionArn,
      description: "The ARN of the Products Lambda function",
      exportName: "ProductsListARN",
    });

    new cdk.CfnOutput(this, "GetProductsByIdARN", {
      value: getProductsById.functionArn,
      description: "The ARN of the Products by id Lambda function",
      exportName: "ProductsByIdARN",
    });
  }
}
