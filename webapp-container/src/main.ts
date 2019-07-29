import * as core from '@actions/core';
import * as crypto from "crypto";
import { KuduServiceUtility } from './common/RestUtilities/KuduServiceUtility';
import { AzureAppService } from './common/ArmRest/azure-app-service';
import { AzureAppServiceUtility } from './common/RestUtilities/AzureAppServiceUtility';
import { ContainerDeploymentUtility } from './common/RestUtilities/ContainerDeploymentUtility';
import { addAnnotation } from './common/RestUtilities/AnnotationUtility';
import { TaskParameters } from './taskparameters';

async function main() {
    let isDeploymentSuccess: boolean = true;

    try {
        // Set user agent varable
        let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
        let prefix = "";
        if(!!process.env.AZURE_HTTP_USER_AGENT) {
        prefix = `${process.env.AZURE_HTTP_USER_AGENT}`
        }
        let actionName = 'Deploy Web Apps to Azure';
        core.exportVariable('AZURE_HTTP_USER_AGENT', `${prefix} GITHUBACTIONS_${actionName}_${usrAgentRepo}`);

        var taskParams = TaskParameters.getTaskParams();
        await taskParams.getResourceDetails();

        core.debug("Predeployment Step Started");
        var appService = new AzureAppService(taskParams.endpoint, taskParams.resourceGroupName, taskParams.appName);
        var appServiceUtility = new AzureAppServiceUtility(appService);
        
        var kuduService = await appServiceUtility.getKuduService();
        var kuduServiceUtility = new KuduServiceUtility(kuduService);

        core.debug("Deployment Step Started");
        core.debug("Performing container based deployment.");

        let containerDeploymentUtility: ContainerDeploymentUtility = new ContainerDeploymentUtility(appService);
        await containerDeploymentUtility.deployWebAppImage(taskParams.images, taskParams.multiContainerConfigFile, taskParams.isLinux, taskParams.isMultiContainer, taskParams.containerCommand);
    }
    catch (error) {
        core.debug("Deployment Failed with Error: " + error);
        isDeploymentSuccess = false;
        core.setFailed(error);
    }
    finally {
        if(!!kuduServiceUtility) {
            await addAnnotation(taskParams.endpoint, appService, isDeploymentSuccess);
            let activeDeploymentID = await kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, {'type': 'Deployment', slotName: appService.getSlot()});
            core.debug('Active DeploymentId :'+ activeDeploymentID);
        }
        
        let appServiceApplicationUrl: string = await appServiceUtility.getApplicationURL();
        console.log('App Service Application URL: ' + appServiceApplicationUrl);
        core.setOutput('webapp-url', appServiceApplicationUrl);
        
        core.debug(isDeploymentSuccess ? "Deployment Succeded" : "Deployment failed");
    }
}

main();