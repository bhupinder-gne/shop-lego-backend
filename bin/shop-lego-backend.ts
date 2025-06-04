#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ShopLegoBackendStack } from '../lib/shop-lego-backend-stack';
import { ImportServiceStack } from '../lib/import-service-stack';
import { AuthorizationServiceStack } from '../lib/authorization-service-stack';

const app = new cdk.App();

const auth = new AuthorizationServiceStack(
  app,
  "AuthorizationServiceStack",
  {},
);

new ShopLegoBackendStack(app,'ShopLegoBackendStack', {});

new ImportServiceStack(app,"ImportServiceStack", {
  basicAuthorizer: auth.basicAuthorizer,
});