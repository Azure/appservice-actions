import { AzureEndpoint } from "./ArmRest/AzureEndpoint";
import { IAuthorizationHandler } from "./ArmRest/IAuthorizationHandler";
import { AzCliAuthHandler } from "./ArmRest/AzCliAuthHandler";
import { execSync, IExecSyncResult, IExecSyncOptions } from "./Utilities/utilityHelperFunctions";
import { exist } from "./Utilities/packageUtility";
import * as Constants from './constants';

export const authFilePath: string = "/home/auth.json"

export function getHandler(): IAuthorizationHandler {
    let resultOfExec: IExecSyncResult = execSync("az", "account show --query \"id\"", { silent: true } as IExecSyncOptions);
    if(resultOfExec.code == Constants.TOOL_EXEC_CODE.SUCCESS) {
        let subscriptionId = resultOfExec.stdout.trim();
        return AzCliAuthHandler.getEndpoint(subscriptionId.substring(1, subscriptionId.length - 1));
    }
    else if(exist(authFilePath)) {
        return AzureEndpoint.getEndpoint(authFilePath);
    }
    else {
        throw new Error("No crdentails found. Please provide Publish Profile path or add a azure login script before this action or put credentiasl file in /home/auth.json.");
    }
}