import { TaskParameters } from "../taskparameters";
import { IWebAppDeploymentProvider } from "./IWebAppDeploymentProvider";
import { LinuxWebAppDeploymentProvider } from "./LinuxWebAppDeploymentProvider";
import { WindowsWebAppDeploymentProvider } from "./WindowsWebAppDeploymentProvider";
import { PublishProfileDeploymentProvider } from "./PublishProfileDeploymentProvider";

export class DeploymentFactory {

    public static GetDeploymentProvider(type: DEPLOYMENT_PROVIDER_TYPES): IWebAppDeploymentProvider {
        switch(type) {
            case DEPLOYMENT_PROVIDER_TYPES.PUBLISHPROFILE:
                console.log("Deployment started using publish profile crdentials");
                return new PublishProfileDeploymentProvider();

            case DEPLOYMENT_PROVIDER_TYPES.WINDOWS:
                console.log("Deployment started for windows app service");
                return new WindowsWebAppDeploymentProvider();

            case DEPLOYMENT_PROVIDER_TYPES.LINUX:
                console.log("Deployment started for linux app service");
                return new LinuxWebAppDeploymentProvider();
            
            default:
                throw new Error("Invalid deployment provider type");
        }
    }
}

export enum DEPLOYMENT_PROVIDER_TYPES {
    WINDOWS,
    LINUX,
    PUBLISHPROFILE
}