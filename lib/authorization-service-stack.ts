import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";

export class AuthorizationServiceStack extends cdk.Stack {
  basicAuthorizer: lambda.IFunction;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerLambda = new NodejsFunction(
      this,
      "basicAuthorizer",
    {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(__dirname, "lambda/basicAuthorizer.ts"),
        environment: {
          TEST_USERNAME: process.env.TEST_USERNAME as string,
        },
    }
    );

    basicAuthorizerLambda.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    this.basicAuthorizer = lambda.Function.fromFunctionArn(
      this,
      "BasicAuthorizerExport",
      basicAuthorizerLambda.functionArn,
    );

    new cdk.CfnOutput(this, "BasicAuthorizerArn", {
      value: basicAuthorizerLambda.functionArn,
      exportName: "BasicAuthorizerFnArn",
    });
  }
}