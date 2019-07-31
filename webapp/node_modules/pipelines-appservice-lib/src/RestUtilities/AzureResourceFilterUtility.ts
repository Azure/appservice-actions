import { IAuthorizationHandler } from '../ArmRest/IAuthorizationHandler';
import { Resources } from '../ArmRest/azure-arm-resource';

export class AzureResourceFilterUtility {
    public static async getAppDetails(endpoint: IAuthorizationHandler, resourceName: string): Promise<any> {
        var azureResources: Resources = new Resources(endpoint);
        var filteredResources: Array<any> = await azureResources.getResources('Microsoft.Web/Sites', resourceName);
        let resourceGroupName: string;
        let kind: string;
        if(!filteredResources || filteredResources.length == 0) {
            throw new Error('ResourceDoesntExist');
        }
        else if(filteredResources.length == 1) {
            resourceGroupName = filteredResources[0].id.split("/")[4];
            kind = filteredResources[0].kind;
        }
        else {
            throw new Error('MultipleResourceGroupFoundForAppService');
        }

        return {
            resourceGroupName: resourceGroupName,
            kind: kind
        };
    }
}