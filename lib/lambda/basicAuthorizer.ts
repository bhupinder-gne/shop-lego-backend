import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, Context, Callback } from 'aws-lambda';

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  if (!event.authorizationToken) {
    callback('Unauthorized', generatePolicy('user', 'Deny', event.methodArn, 401));
    return;
  }

  try {
    const tokenParts = event.authorizationToken.split(' ');
    const authType = tokenParts[0];
    const encodedCreds = tokenParts[1];

    if (authType !== 'Basic' || !encodedCreds) {
      callback('Unauthorized', generatePolicy('user', 'Deny', event.methodArn, 403));
      return;
    }

    const buffer = Buffer.from(encodedCreds, 'base64');
    const [username, password] = buffer.toString('utf-8').split(':');

    const expectedPassword = process.env[username];

    if (!expectedPassword || password !== expectedPassword) {
      callback('Unauthorized', generatePolicy(username, 'Deny', event.methodArn, 403));
      return;
    }

    callback(null, generatePolicy(username, 'Allow', event.methodArn));
  } catch (e) {
    callback('Unauthorized', generatePolicy('user', 'Deny', event.methodArn, 403));
  }
};

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  statusCode?: number
): APIGatewayAuthorizerResult {
  const policy: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {},
  };
  if (statusCode) {
    policy.context = { statusCode: statusCode.toString() };
  }
  return policy;
}