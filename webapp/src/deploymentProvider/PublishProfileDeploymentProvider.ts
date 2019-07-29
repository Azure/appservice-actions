import Q = require('q');
import fs = require('fs');
import { TaskParameters } from '../taskparameters';
import { PackageType } from "../common/Utilities/packageUtility";
import { KuduServiceUtility } from '../common/RestUtilities/KuduServiceUtility';
import { Kudu } from '../common/KuduRest/azure-app-kudu-service';
import * as core from '@actions/core';
import { IWebAppDeploymentProvider } from './IWebAppDeploymentProvider';
import * as utility from '../common/Utilities/utility.js';
import * as zipUtility from '../common/Utilities/ziputility.js';

var parseString = require('xml2js').parseString;

interface scmCredentials {
    uri: string;
    username: string;
    password: string;
}

export class PublishProfileDeploymentProvider implements IWebAppDeploymentProvider {
    private kuduService: Kudu;
    private kuduServiceUtility: KuduServiceUtility;
    private activeDeploymentID;
    private applicationURL: string;
    private zipDeploymentID: string;

    public async PreDeploymentStep() {
        let scmCreds: scmCredentials = await this.getCredsFromXml(TaskParameters.getTaskParams().publishProfileContent);
        this.kuduService = new Kudu(scmCreds.uri, scmCreds.username, scmCreds.password);
        this.kuduServiceUtility = new KuduServiceUtility(this.kuduService);
    }

    public async DeployWebAppStep() {
        let packageType = TaskParameters.getTaskParams().package.getPackageType();
        
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
                this.zipDeploymentID = await this.kuduServiceUtility.deployUsingWarDeploy(packagePath, { }, warName);
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
            if(!!updateStatus && updateStatus == true) {
                this.activeDeploymentID = await this.kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, {'type': 'Deployment'});
                core.debug('Active DeploymentId :'+ this.activeDeploymentID);
            }
        }
        
        console.log('App Service Application URL: ' + this.applicationURL);
        core.setOutput('webapp-url', this.applicationURL);
    }

    private async getCredsFromXml(pubxmlFile: string): Promise<scmCredentials> {
        let res;
        await parseString(pubxmlFile, (error, result) => {
            if(!!error) {
                throw new Error("Failed XML parsing " + error);
            }
            res = result.publishData.publishProfile[0].$;
        });
        let creds: scmCredentials = {
            uri: res.publishUrl.split(":")[0],
            username: res.userName,
            password: res.userPWD
        };
        if(creds.uri.indexOf("scm") < 0) {
            throw new Error("Publish profile does not contain kudu URL");
        }
        creds.uri = `https://${creds.username}:${creds.password}@${creds.uri}`;
        this.applicationURL = res.destinationAppUrl;
        return creds;
    }
}