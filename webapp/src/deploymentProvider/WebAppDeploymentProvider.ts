import { TaskParameters } from '../taskparameters';
import { KuduServiceUtility } from '../common/RestUtilities/KuduServiceUtility';
import { AzureAppService } from '../common/ArmRest/azure-app-service';
import { Kudu } from '../common/KuduRest/azure-app-kudu-service';
import { AzureAppServiceUtility } from '../common/RestUtilities/AzureAppServiceUtility';
import { addAnnotation } from '../common/RestUtilities/AnnotationUtility';
import * as core from '@actions/core';
import { IWebAppDeploymentProvider } from './IWebAppDeploymentProvider';

export class WebAppDeploymentProvider implements IWebAppDeploymentProvider {
    protected taskParams:TaskParameters;
    protected appService: AzureAppService;
    protected kuduService: Kudu;
    protected appServiceUtility: AzureAppServiceUtility;
    protected kuduServiceUtility: KuduServiceUtility;
    protected activeDeploymentID;

    constructor() {
        this.taskParams = TaskParameters.getTaskParams();
    }

    public async PreDeploymentStep() {
        this.appService = new AzureAppService(this.taskParams.endpoint, this.taskParams.resourceGroupName, this.taskParams.appName);
        this.appServiceUtility = new AzureAppServiceUtility(this.appService);
        
        this.kuduService = await this.appServiceUtility.getKuduService();
        this.kuduServiceUtility = new KuduServiceUtility(this.kuduService);
    }

    public async DeployWebAppStep() {}

    public async UpdateDeploymentStatus(isDeploymentSuccess: boolean, updateStatus: boolean) {
        if(this.kuduServiceUtility) {
            await addAnnotation(this.taskParams.endpoint, this.appService, isDeploymentSuccess);
            if(!!updateStatus && updateStatus == true) {
                this.activeDeploymentID = await this.kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, {'type': 'Deployment', slotName: this.appService.getSlot()});
                core.debug('Active DeploymentId :'+ this.activeDeploymentID);
            }
        }
        
        let appServiceApplicationUrl: string = await this.appServiceUtility.getApplicationURL();
        console.log('App Service Application URL: ' + appServiceApplicationUrl);
        core.setOutput('webapp-url', appServiceApplicationUrl);
    }
}