import { APIGatewayAuthorizerResult, Context, Callback, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

export const handler = async (
    event: APIGatewayTokenAuthorizerEvent,
    context: Context,
    callback: Callback<APIGatewayAuthorizerResult>
): Promise<APIGatewayAuthorizerResult> => {
    // Log the authorization token
    console.log('Authorization token:', event.authorizationToken);

    // Example: Always allow
    const policy: APIGatewayAuthorizerResult = {
        principalId: 'user',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: event.methodArn,
                },
            ],
        },
        context: {
            // Optional: custom context
        },
    };

    return policy;
};