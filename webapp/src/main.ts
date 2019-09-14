import * as core from '@actions/core';
import * as crypto from "crypto";

// Set user agent varable
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
let actionName = 'DeployWebAppToAzure';
let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS_${actionName}_${usrAgentRepo}`;
core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);

import { TaskParameters } from "./taskparameters";
import { DeploymentFactory, DEPLOYMENT_PROVIDER_TYPES } from "./deploymentProvider/DeploymentFactory";

async function main() {
  let isDeploymentSuccess: boolean = true;  

  try {    
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
      
      // Reset AZURE_HTTP_USER_AGENT
      core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
      core.debug(isDeploymentSuccess ? "Deployment Succeeded" : "Deployment failed");
      core.warning('This action is moved to azure/webapps-deploy repository, update your workflows to use those actions instead.');
  }
}

main();