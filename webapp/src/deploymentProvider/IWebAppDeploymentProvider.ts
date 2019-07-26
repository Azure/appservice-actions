export interface IWebAppDeploymentProvider{
    PreDeploymentStep();
    DeployWebAppStep();
    UpdateDeploymentStatus(isDeploymentSuccess: boolean, updateStatus: boolean);
}