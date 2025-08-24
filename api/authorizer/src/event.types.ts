import { APIGatewayProxyEventV2 } from "aws-lambda";
import { GoogleAuthorizerContext } from "./types";

export interface ApiEventWithAuth extends Omit<APIGatewayProxyEventV2, "requestContext"> {
    requestContext: APIGatewayProxyEventV2["requestContext"] & {
        authorizer: GoogleAuthorizerContext;
    };
}
