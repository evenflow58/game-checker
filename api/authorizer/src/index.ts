import { APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEventV2, StatementEffect } from "aws-lambda";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";

export const handler = async (
    event: APIGatewayRequestAuthorizerEventV2
): Promise<APIGatewayAuthorizerResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
        const token = event.headers?.Auth;

        if (!token) throw new Error("No token present");

        const { payload } = await verifyGoogleToken(token);

        // Use Google "sub" (unique user ID) as principalId
        const principalId = payload?.sub;

        if (!principalId) throw new Error("No google identity returned. Could not get anything from google.")

        return generateAllow(
            principalId,
            event.routeArn,
            {
                email: payload.email ?? "",
            });
    } catch (err) {
        console.error("❌ Google auth failed:", err);
        return generateDeny("unauthorized", event.routeArn);
    }
};

/**
 * Verify Google JWT using jose
 */
async function verifyGoogleToken(token: string): Promise<{ payload: JWTPayload }> {
    const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));
    return jwtVerify(token, jwks, {
        issuer: GOOGLE_ISSUER,
        audience: CLIENT_ID,
    });
}

// Help function to generate an IAM policy
function generatePolicy(
    principalId: string,
    effect: StatementEffect,
    resource: string,
    context: Record<string, string> = {}
): APIGatewayAuthorizerResult {
    return {
        principalId,
        policyDocument: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "execute-api:Invoke",
                    Effect: effect,
                    Resource: resource,
                }
            ]
        },
        context,
    };
}

var generateAllow = function (principalId: string, resource: string, context: Record<string, string>) {
    return generatePolicy(principalId, "Allow", resource, context);
}

var generateDeny = function (principalId: string, resource: string) {
    return generatePolicy(principalId, "Deny", resource);
}