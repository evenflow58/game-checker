export const handler = async (event: any) => {
  console.log("Health check invoked");
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      message: "pong",
      timestamp: new Date().toISOString(),
    }),
  };
};
