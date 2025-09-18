import {
    APIGatewayAuthorizerResult,
    APIGatewayRequestAuthorizerEventV2,
    StatementEffect
} from "aws-lambda";

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? "";

export const handler = async (
    event: APIGatewayRequestAuthorizerEventV2
): Promise<APIGatewayAuthorizerResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
        const authHeader = (event.headers || {})['authorization'];

        if (!authHeader) throw new Error("No Authorization header present");

        // Expect "Bearer <token>"
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            throw new Error("Authorization header is not in the expected 'Bearer <token>' format");
        }

        const token = parts[1];

        const { payload } = await verifyGoogleToken(token);

        const principalId = payload?.sub;
        if (!principalId) throw new Error("No Google identity returned");

        const allow = generateAllow(
            principalId,
            event.routeArn,
            { email: payload['email'] as string }
        );

        console.log("Returning allow", JSON.stringify(allow));

        return allow;

    } catch (err) {
        console.error("❌ Google auth failed:", err);
        return generateDeny("unauthorized", event.routeArn);
    }
};

/**
 * Verify Google JWT using jose (dynamic import for CommonJS)
 */
async function verifyGoogleToken(token: string): Promise<any> {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));
    return jwtVerify(token, jwks, {
        issuer: GOOGLE_ISSUER,
        audience: CLIENT_ID,
    });
}

/**
 * Generate IAM policy
 */
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

function generateAllow(
    principalId: string,
    resource: string,
    context: Record<string, string>
): APIGatewayAuthorizerResult {
    return generatePolicy(principalId, "Allow", resource, context);
}

function generateDeny(
    principalId: string,
    resource: string
): APIGatewayAuthorizerResult {
    return generatePolicy(principalId, "Deny", resource);
}
