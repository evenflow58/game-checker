import {
  CloudFormationClient,
  CreateStackCommand,
  CreateStackCommandInput,
} from "@aws-sdk/client-cloudformation";

export const handler = async (event: {
  BranchName: string;
  TemplateUrl: string;
}): Promise<any> => {
  console.log("event", event);

  const branchName = event.BranchName;
  if (branchName === "master") {
    console.log("Not creating anything because this is the master branch.");
    return;
  }

  const client = new CloudFormationClient({ region: "us-east-1" });
  const prefix = `${branchName.split('-').map(word => word.charAt(0)).join('')}-`;
  const input: CreateStackCommandInput = {
    StackName: `${prefix}game-checker-pipeline`,
    TemplateURL: event.TemplateUrl,
    Parameters: [
      {
        ParameterKey: "GitHubBranch",
        ParameterValue: branchName,
      },
      {
        ParameterKey: "Prefix",
        ParameterValue: prefix,
      },
    ],
    OnFailure: "ROLLBACK",
    Capabilities: ["CAPABILITY_NAMED_IAM"],
  };
  const command = new CreateStackCommand(input);

  console.log(`Creating environment for ${branchName}`);

  const result = await client.send(command);

  console.log('Create environment result', result);
};