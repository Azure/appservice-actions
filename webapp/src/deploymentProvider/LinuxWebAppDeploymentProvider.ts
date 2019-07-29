import { WebAppDeploymentProvider } from './WebAppDeploymentProvider';
import { PackageType } from '../common/Utilities/packageUtility';
import * as utility from '../common/Utilities/utility.js';
import * as zipUtility from '../common/Utilities/ziputility.js';
import * as core from '@actions/core';
import { TaskParameters } from '../taskparameters';

export class LinuxWebAppDeploymentProvider extends WebAppDeploymentProvider {
    private zipDeploymentID: string;

    public async DeployWebAppStep() {
        let packageType = TaskParameters.getTaskParams().package.getPackageType();
        
        core.debug('Performing Linux web app deployment');
        
        let packagePath = TaskParameters.getTaskParams().package.getPath();
        await this.kuduServiceUtility.warmpUp();
        
        switch(packageType){
            case PackageType.folder:
                let tempPackagePath = utility.generateTemporaryFolderOrZipPath(`${process.env.RUNNER_TEMPDIRECTORY}`, false);
                let archivedWebPackage = await zipUtility.archiveFolder(packagePath, "", tempPackagePath) as string;
                core.debug("Compressed folder into zip " +  archivedWebPackage);
                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingZipDeploy(archivedWebPackage);
            break;

            case PackageType.zip:
                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingZipDeploy(packagePath);
            break;

            case PackageType.jar:
                core.debug("Initiated deployment via kudu service for webapp jar package : "+ packagePath);
                let folderPath = await utility.generateTemporaryFolderForDeployment(false, packagePath, PackageType.jar);
                let output = await utility.archiveFolderForDeployment(false, folderPath);
                let webPackage = output.webDeployPkg;
                core.debug("Initiated deployment via kudu service for webapp jar package : "+ webPackage);
                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingZipDeploy(webPackage);
            break;

            case PackageType.war:
                core.debug("Initiated deployment via kudu service for webapp war package : "+ packagePath);
                let warName = utility.getFileNameFromPath(packagePath, ".war");
                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingWarDeploy(packagePath, { slotName: this.appService.getSlot() }, warName);
            break;

            default:
                throw new Error('Invalid App Service package or folder path provided: ' + packagePath);
        }
    }

    public async UpdateDeploymentStatus(isDeploymentSuccess: boolean, updateStatus: boolean) {
        if(this.kuduServiceUtility) {
            if(this.zipDeploymentID && this.activeDeploymentID && isDeploymentSuccess) {
                await this.kuduServiceUtility.postZipDeployOperation(this.zipDeploymentID, this.activeDeploymentID);
            }
            
            await super.UpdateDeploymentStatus(isDeploymentSuccess, true);
        }
    }
}