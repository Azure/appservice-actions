import { AzureAppService } from '../ArmRest/azure-app-service';
import webClient = require('../webClient');
var parseString = require('xml2js').parseString;
import Q = require('q');
import { Kudu } from '../KuduRest/azure-app-kudu-service';
import * as core from '@actions/core';

export class AzureAppServiceUtility {
    private _appService: AzureAppService;
    constructor(appService: AzureAppService) {
        this._appService = appService;
    }

    public async getWebDeployPublishingProfile(): Promise<any> {
        var publishingProfile = await this._appService.getPublishingProfileWithSecrets();
        var defer = Q.defer<any>();
        parseString(publishingProfile, (error, result) => {
            if(!!error) {
                defer.reject(error);
            }
            var publishProfile = result && result.publishData && result.publishData.publishProfile ? result.publishData.publishProfile : null;
            if(publishProfile) {
                for (var index in publishProfile) {
                    if (publishProfile[index].$ && publishProfile[index].$.publishMethod === "MSDeploy") {
                        defer.resolve(result.publishData.publishProfile[index].$);
                    }
                }
            }
            
            defer.reject('ErrorNoSuchDeployingMethodExists');
        });

        return defer.promise;
    }

    public async getApplicationURL(virtualApplication?: string): Promise<string> {
        let webDeployProfile: any =  await this.getWebDeployPublishingProfile();
        return await webDeployProfile.destinationAppUrl + ( virtualApplication ? "/" + virtualApplication : "" );
    }

    public async pingApplication(): Promise<void> {
        try {
            var applicationUrl: string = await this.getApplicationURL();

            if(!applicationUrl) {
                core.debug("Application Url not found.");
                return;
            }
            await AzureAppServiceUtility.pingApplication(applicationUrl);
        } catch(error) {
            core.debug("Unable to ping App Service. Error: ${error}");
        }
    }

    public static async pingApplication(applicationUrl: string) {
        if(!applicationUrl) {
            core.debug('Application Url empty.');
            return;
        }
        try {
            var webRequest: webClient.WebRequest = {
                method: 'GET',
                uri: applicationUrl
            };
            let webRequestOptions: webClient.WebRequestOptions = {retriableErrorCodes: [], retriableStatusCodes: [], retryCount: 1, retryIntervalInSeconds: 5, retryRequestTimedout: true};
            var response = await webClient.sendRequest(webRequest, webRequestOptions);
            core.debug(`App Service status Code: '${response.statusCode}'. Status Message: '${response.statusMessage}'`);
        }
        catch(error) {
            core.debug(`Unable to ping App Service. Error: ${error}`);
        }
    }

    public async getKuduService(): Promise<Kudu> {
        var publishingCredentials = await this._appService.getPublishingCredentials();
        if(publishingCredentials.properties["scmUri"]) {
            return new Kudu(publishingCredentials.properties["scmUri"], publishingCredentials.properties["publishingUserName"], publishingCredentials.properties["publishingPassword"]);
        }

        throw Error('KuduSCMDetailsAreEmpty');
    }

    public async updateConfigurationSettings(properties: any) : Promise<void> {
        for(var property in properties) {
            if(!!properties[property] && properties[property].value !== undefined) {
                properties[property] = properties[property].value;
            }
        }

        console.log('Updating App Service Configuration settings. Data: ' + JSON.stringify(properties));
        await this._appService.patchConfiguration({'properties': properties});
        console.log('Updated App Service Configuration settings.');
    }

    public async updateAndMonitorAppSettings(addProperties?: any, deleteProperties?: any): Promise<boolean> {
        for(var property in addProperties) {
            if(!!addProperties[property] && addProperties[property].value !== undefined) {
                addProperties[property] = addProperties[property].value;
            }
        }
        
        console.log('Updating App Service Application settings. Adding: %s. Deleting : %s', JSON.stringify(addProperties), JSON.stringify(deleteProperties));
        var isNewValueUpdated: boolean = await this._appService.patchApplicationSettings(addProperties, deleteProperties);

        if(!isNewValueUpdated) {
            console.log('Updated App Service Application settings and Kudu Application settings.');
            return isNewValueUpdated;
        }

        var kuduService = await this.getKuduService();
        var noOftimesToIterate: number = 12;
        core.debug('retrieving values from Kudu service to check if new values are updated');
        while(noOftimesToIterate > 0) {
            var kuduServiceAppSettings = await kuduService.getAppSettings();
            var propertiesChanged: boolean = true;
            for(var property in addProperties) {
                if(kuduServiceAppSettings[property] != addProperties[property]) {
                    core.debug('New properties are not updated in Kudu service :(');
                    propertiesChanged = false;
                    break;
                }
            }
            for(var property in deleteProperties) {
                if(kuduServiceAppSettings[property]) {
                    core.debug('Deleted properties are not reflected in Kudu service :(');
                    propertiesChanged = false;
                    break;
                }
            }

            if(propertiesChanged) {
                core.debug('New properties are updated in Kudu service.');
                console.log('Updated App Service Application settings and Kudu Application settings.');
                return isNewValueUpdated;
            }

            noOftimesToIterate -= 1;
            await webClient.sleepFor(5);
        }

        core.debug('Timing out from app settings check');
        return isNewValueUpdated;
    }
}