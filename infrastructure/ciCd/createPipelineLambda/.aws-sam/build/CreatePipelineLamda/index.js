"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const handler = async (event) => {
    console.log("event", event);
    const branchName = event.BranchName;
    if (branchName === "master") {
        console.log("Not creating anything because this is the master branch.");
        return;
    }
    const client = new client_cloudformation_1.CloudFormationClient({ region: "us-east-1" });
    const prefix = `${branchName.split('-').map(word => word.charAt(0)).join('')}-`;
    const input = {
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
    const command = new client_cloudformation_1.CreateStackCommand(input);
    console.log(`Creating environment for ${branchName}`);
    const result = await client.send(command);
    console.log('Create environment result', result);
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMEVBSXdDO0FBRWpDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUc3QixFQUFnQixFQUFFO0lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTVCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7SUFDcEMsSUFBSSxVQUFVLEtBQUssUUFBUSxFQUFFO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsMERBQTBELENBQUMsQ0FBQztRQUN4RSxPQUFPO0tBQ1I7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLDRDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDakUsTUFBTSxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUNoRixNQUFNLEtBQUssR0FBNEI7UUFDckMsU0FBUyxFQUFFLEdBQUcsTUFBTSx1QkFBdUI7UUFDM0MsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1FBQzlCLFVBQVUsRUFBRTtZQUNWO2dCQUNFLFlBQVksRUFBRSxjQUFjO2dCQUM1QixjQUFjLEVBQUUsVUFBVTthQUMzQjtZQUNEO2dCQUNFLFlBQVksRUFBRSxRQUFRO2dCQUN0QixjQUFjLEVBQUUsTUFBTTthQUN2QjtTQUNGO1FBQ0QsU0FBUyxFQUFFLFVBQVU7UUFDckIsWUFBWSxFQUFFLENBQUMsc0JBQXNCLENBQUM7S0FDdkMsQ0FBQztJQUNGLE1BQU0sT0FBTyxHQUFHLElBQUksMENBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUV0RCxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUM7QUFyQ1csUUFBQSxPQUFPLFdBcUNsQiJ9