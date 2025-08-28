"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jose_1 = require("jose");
const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? "";
const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    try {
        const token = (event.headers || {})['Auth'];
        if (!token)
            throw new Error("No token present");
        const { payload } = await verifyGoogleToken(token);
        // Use Google "sub" (unique user ID) as principalId
        const principalId = payload?.sub;
        if (!principalId)
            throw new Error("No google identity returned. Could not get anything from google.");
        return generateAllow(principalId, event.routeArn, {
            email: payload['email'] ?? "",
        });
    }
    catch (err) {
        console.error("❌ Google auth failed:", err);
        return generateDeny("unauthorized", event.routeArn);
    }
};
exports.handler = handler;
/**
 * Verify Google JWT using jose
 */
async function verifyGoogleToken(token) {
    const jwks = (0, jose_1.createRemoteJWKSet)(new URL(GOOGLE_JWKS_URI));
    return (0, jose_1.jwtVerify)(token, jwks, {
        issuer: GOOGLE_ISSUER,
        audience: CLIENT_ID,
    });
}
// Help function to generate an IAM policy
function generatePolicy(principalId, effect, resource, context = {}) {
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
var generateAllow = function (principalId, resource, context) {
    return generatePolicy(principalId, "Allow", resource, context);
};
var generateDeny = function (principalId, resource) {
    return generatePolicy(principalId, "Deny", resource);
};
//# sourceMappingURL=index.js.map