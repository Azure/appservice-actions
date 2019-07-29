import { WebAppDeploymentProvider } from "./WebAppDeploymentProvider";
import { PackageType } from "../common/Utilities/packageUtility";
import { parse } from "../common/Utilities/parameterParserUtility";
import { FileTransformUtility} from "../common/Utilities/fileTransformationUtility";
import * as utility from '../common/Utilities/utility.js';
import * as zipUtility from '../common/Utilities/ziputility.js';
import * as core from '@actions/core';
import { TaskParameters } from "../taskparameters";

const removeRunFromZipAppSetting: string = '-WEBSITE_RUN_FROM_PACKAGE 0';
const runFromZipAppSetting: string = '-WEBSITE_RUN_FROM_PACKAGE 1';
const appType: string = "-appType java_springboot";
const jarPath: string = " -JAR_PATH ";

export class WindowsWebAppDeploymentProvider extends WebAppDeploymentProvider {
    private zipDeploymentID: string;
    private updateStatus: boolean;

    public async DeployWebAppStep() {
        let webPackage = TaskParameters.getTaskParams().package.getPath();
        var _isMSBuildPackage = await TaskParameters.getTaskParams().package.isMSBuildPackage();           
        if(_isMSBuildPackage) {
            throw new Error('MsBuildPackageNotSupported' + webPackage);
        } 
        let packageType = TaskParameters.getTaskParams().package.getPackageType();
        let deploymentMethodtelemetry: string;

        switch(packageType){
            case PackageType.war:
                core.debug("Initiated deployment via kudu service for webapp war package : "+ webPackage);        
                await this.kuduServiceUtility.warmpUp();
                var warName = utility.getFileNameFromPath(webPackage, ".war");
                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingWarDeploy(webPackage, 
                    { slotName: this.appService.getSlot() }, warName);
                this.updateStatus = true;
                break;

            case PackageType.jar:
                core.debug("Initiated deployment via kudu service for webapp jar package : "+ webPackage);    
                var updateApplicationSetting = parse(removeRunFromZipAppSetting)
                var isNewValueUpdated: boolean = await this.appServiceUtility.updateAndMonitorAppSettings(updateApplicationSetting);
                if(!isNewValueUpdated) {
                    await this.kuduServiceUtility.warmpUp();
                }

                var jarFile = utility.getFileNameFromPath(webPackage);
                webPackage = await FileTransformUtility.applyTransformations(webPackage, appType + jarPath + jarFile, TaskParameters.getTaskParams().package.getPackageType());

                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingZipDeploy(webPackage);
                this.updateStatus = true;
                break;

            case PackageType.folder:
                let tempPackagePath = utility.generateTemporaryFolderOrZipPath(`${process.env.RUNNER_TEMPDIRECTORY}`, false);
                webPackage = await zipUtility.archiveFolder(webPackage, "", tempPackagePath) as string;
                core.debug("Compressed folder into zip " +  webPackage);
                
            case PackageType.zip:
                core.debug("Initiated deployment via kudu service for webapp package : "+ webPackage);    
                var addCustomApplicationSetting = parse(runFromZipAppSetting);
                var isNewValueUpdated: boolean = await this.appServiceUtility.updateAndMonitorAppSettings(addCustomApplicationSetting);
                if(!isNewValueUpdated) {
                    await this.kuduServiceUtility.warmpUp();
                }
                await this.kuduServiceUtility.deployUsingRunFromZip(webPackage, { slotName: this.appService.getSlot() });
                this.updateStatus = false;
                break;

            default:
                throw new Error('Invalid App Service package or folder path provided: ' + webPackage);
        }
    }

    public async UpdateDeploymentStatus(isDeploymentSuccess: boolean, updateStatus: boolean) {
        if(this.kuduServiceUtility && this.zipDeploymentID && this.activeDeploymentID && isDeploymentSuccess) {
            await this.kuduServiceUtility.postZipDeployOperation(this.zipDeploymentID, this.activeDeploymentID);
        }
        await super.UpdateDeploymentStatus(isDeploymentSuccess, this.updateStatus);
    }
}