import { TaskParameters } from "./taskparameters";
import { DeploymentFactory, DEPLOYMENT_PROVIDER_TYPES } from "./deploymentProvider/DeploymentFactory";
import * as core from '@actions/core';
import * as crypto from "crypto";

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
    
    let taskParams: TaskParameters = TaskParameters.getTaskParams();
    let type = DEPLOYMENT_PROVIDER_TYPES.PUBLISHPROFILE;

    // get app kind
    if(!!taskParams.endpoint) {
      await taskParams.getResourceDetails();
      type = taskParams.kind.indexOf('linux') < 0 ? DEPLOYMENT_PROVIDER_TYPES.WINDOWS : DEPLOYMENT_PROVIDER_TYPES.LINUX;
    }
    var deploymentProvider = DeploymentFactory.GetDeploymentProvider(type);

    core.debug("Predeployment Step Started");
    await deploymentProvider.PreDeploymentStep();

    core.debug("Deployment Step Started");
    await deploymentProvider.DeployWebAppStep();
  }
  catch(error) {
    core.debug("Deployment Failed with Error: " + error);
    isDeploymentSuccess = false;
    core.setFailed(error);
  }
  finally {
      if(deploymentProvider != null) {
          await deploymentProvider.UpdateDeploymentStatus(isDeploymentSuccess, true);
      }
      
      core.debug(isDeploymentSuccess ? "Deployment Succeeded" : "Deployment failed");

  }
}

main();