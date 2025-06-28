import path from "path";

export const handler = async (event: any): Promise<any> => {
  const request = event.Records[0].cf.request;

  // Add index.html if this is the base request.
  if (!path.extname(request.uri)) {
    console.log("changing path");
    request.uri = request.uri.replace(/\/?$/, "/index.html");
  }

  // Adding the branch name to the request to get the correct version.
  request.uri = `/${request.origin.s3.customHeaders["x-env-branch"][0].value}${request.uri}`;

  return request;
};