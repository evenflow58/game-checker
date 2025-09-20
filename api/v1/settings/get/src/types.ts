import { APIGatewayProxyEventV2 } from "aws-lambda";

export interface GoogleAuthorizerContext {
    email: string;
    sub: string;
    name?: string;
    picture?: string;
}

interface JwtAuthorizerContext {
  jwt: {
    claims: {
      email: string;
      // add other claims you care about here
      [key: string]: any;
    };
  };
}

export interface APIGatewayProxyEventV2WithAuth
  extends Omit<APIGatewayProxyEventV2, "requestContext"> {
  requestContext: APIGatewayProxyEventV2["requestContext"] & {
    authorizer?: JwtAuthorizerContext;
  };
}
