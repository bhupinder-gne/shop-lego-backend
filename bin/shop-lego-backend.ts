#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ShopLegoBackendStack } from '../lib/shop-lego-backend-stack';
import { ImportServiceStack } from '../lib/import-service-stack';

const app = new cdk.App();
new ShopLegoBackendStack(app, 'ShopLegoBackendStack', {});
new ImportServiceStack(app, "ImportServiceStack", {});