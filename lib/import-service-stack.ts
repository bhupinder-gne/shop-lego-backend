import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import path = require("path");

const CORS_HEADERS = {
  "method.response.header.Access-Control-Allow-Origin": "'*'",
  "method.response.header.Content-Type": "'application/json'",
};

const METHOD_RESPONSE_PARAMETERS = {
  "method.response.header.Access-Control-Allow-Origin": true,
  "method.response.header.Content-Type": true,
};

const FILENAME_KEY = "name";
const ApiErrors = { BAD_REQUEST: "BadRequest" };

export class ImportServiceStack extends cdk.Stack {
  public s3Bucket: s3.Bucket;
  public api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importServiceBucket = new s3.Bucket(this, 'ImportServiceBucket', {
      bucketName: `import-service-bucket-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
    });
    this.s3Bucket = importServiceBucket;

    const importProductsFileLambda = new NodejsFunction(this, "importProductsFile", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/importProductsFile.ts"),
    });
    importServiceBucket.grantReadWrite(importProductsFileLambda);

    if (!this.api) {
      this.api = new apigateway.RestApi(this, 'ImportServiceApi', {
        restApiName: 'Import Service',
        deployOptions: { stageName: 'dev' },
      });
    }

    const importProductsFileLambdaIntegration = new apigateway.LambdaIntegration(importProductsFileLambda, {
      proxy: false,
      requestTemplates: {
        "application/json": `{
          "fileName": "$input.params('${FILENAME_KEY}')"
        }`,
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: { "application/json": "$input.json('$')" },
          responseParameters: CORS_HEADERS,
        },
        {
          statusCode: "400",
          selectionPattern: `${ApiErrors.BAD_REQUEST}*.`,
          responseTemplates: {
            "application/json": JSON.stringify({
              error: "Bad request: $input.path('$.errorMessage')",
            }),
          },
          responseParameters: CORS_HEADERS,
        },
      ],
    });

    const importResource = this.api.root.addResource("import");
    importResource.addMethod("GET", importProductsFileLambdaIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: METHOD_RESPONSE_PARAMETERS,
        },
        {
          statusCode: "400",
          responseParameters: METHOD_RESPONSE_PARAMETERS,
        },
      ],
    });

    const importFileParserLambda = new NodejsFunction(this, "importFileParser", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/importFileParser.ts"),
    });
    importServiceBucket.grantReadWrite(importFileParserLambda);

    importServiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded" },
    );

    new cdk.CfnOutput(this, 'ImportServiceBucketName', {
      value: importServiceBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: this.api.url,
      description: 'Base URL for Import Service API',
    });

    new cdk.CfnOutput(this, 'ImportEndpointUrl', {
      value: `${this.api.url}import`,
      description: 'GET /import endpoint URL',
    });
  }
}