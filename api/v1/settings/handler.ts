export const handler = async (event: any) => {
  console.log("Settings GET invoked");
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // Handle OPTIONS preflight request
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "300",
      },
      body: "",
    };
  }
  
  // Extract user information from JWT claims (when authenticated via Google OAuth)
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const authenticatedUserId = claims?.sub; // Google user ID from JWT
  const userEmail = claims?.email;
  const userName = claims?.name;
  
  // Fall back to query parameters for testing or when not authenticated
  const userId = authenticatedUserId || 
                 event.pathParameters?.userId || 
                 event.queryStringParameters?.userId || 
                 "default";
  
  console.log("User ID:", userId);
  console.log("Email:", userEmail);
  console.log("Name:", userName);
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify({
      userId: userId,
      email: userEmail || "not-authenticated",
      name: userName || "Guest",
      settings: {
        notifications: true,
        theme: "dark",
        language: "en",
      },
      authenticated: !!authenticatedUserId,
      timestamp: new Date().toISOString(),
    }),
  };
};
