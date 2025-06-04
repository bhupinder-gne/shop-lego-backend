import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
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
  public catalogItemsQueue: sqs.Queue;
  public createProductTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: cdk.StackProps & {
      basicAuthorizer: lambda.IFunction;
    }) {
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

    const lambdaAuthorizer = new apigateway.TokenAuthorizer(
      this,
      "LambdaAuthorizer",
      {
        handler: props.basicAuthorizer,
      },
    );

    const importResource = this.api.root.addResource("import");
    importResource.addMethod("GET", importProductsFileLambdaIntegration, {
      authorizer: lambdaAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
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


    // Create the SQS queue
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(30),
      receiveMessageWaitTime: cdk.Duration.seconds(0),
    });
    this.catalogItemsQueue = catalogItemsQueue;

    const importFileParserLambda = new NodejsFunction(this, "importFileParser", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/importFileParser.ts"),
      environment: {
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl
      }
    });
    importServiceBucket.grantReadWrite(importFileParserLambda);

    importServiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded" },
    );


    const catalogBatchProcessLambda = new NodejsFunction(this, "catalogBatchProcess", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/catalogBatchProcess.ts"),
    });

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcessLambda);
    catalogBatchProcessLambda.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    // Create SNS topic
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic',
      displayName: 'Product Creation Topic',
    });
    this.createProductTopic = createProductTopic;

    createProductTopic.addSubscription(
      new subs.EmailSubscription('bhupindersinghgne@gmail.com')
    );

    catalogBatchProcessLambda.addEnvironment(
      'CREATE_PRODUCT_TOPIC_ARN',
      createProductTopic.topicArn
    );

    createProductTopic.grantPublish(catalogBatchProcessLambda);

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

    new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
      value: catalogItemsQueue.queueUrl,
      description: 'URL of the catalogItemsQueue SQS queue',
    });

    new cdk.CfnOutput(this, 'CreateProductTopicArn', {
      value: createProductTopic.topicArn,
      description: 'ARN of the createProductTopic SNS topic',
    });

  }
}