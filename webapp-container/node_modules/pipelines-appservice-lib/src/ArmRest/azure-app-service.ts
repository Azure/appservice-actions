import webClient = require('../webClient');
import { IAuthorizationHandler } from './IAuthorizationHandler';

import {
    ServiceClient,
    ToError
} from './AzureServiceClient';

interface AzureAppServiceConfigurationDetails {
    id: string;
    name: string;
    type: string;
    kind?: string;
    location: string;
    tags: string;
    properties?: {[key: string]: any};
}

export class AzureAppService {
    private _resourceGroup: string;
    private _name: string;
    private _slot: string;
    private _slotUrl: string;
    public _client: ServiceClient;
    private _appServiceConfigurationDetails: AzureAppServiceConfigurationDetails;
    private _appServicePublishingProfile: any;
    private _appServiceApplicationSetings: AzureAppServiceConfigurationDetails;

    constructor(endpoint: IAuthorizationHandler, resourceGroup: string, name: string, slot?: string, appKind?: string) {
        this._client = new ServiceClient(endpoint, 30);
        this._resourceGroup = resourceGroup;
        this._name = name;
        this._slot = (slot && slot.toLowerCase() == "production") ? null : slot;        
        this._slotUrl = !!this._slot ? `/slots/${this._slot}` : '';
    }

    public async get(force?: boolean): Promise<AzureAppServiceConfigurationDetails> {
        if(force || !this._appServiceConfigurationDetails) {
            this._appServiceConfigurationDetails = await this._get();
        }
        
        return this._appServiceConfigurationDetails;
    }

    public async restart(): Promise<void> {
        try {            
            var slotUrl: string = !!this._slot ? `/slots/${this._slot}` : '';
            var webRequest: webClient.WebRequest = {
                method: 'POST',
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Web/sites/{name}/${slotUrl}/restart`, {
                    '{ResourceGroupName}': this._resourceGroup,
                    '{name}': this._name
                }, null, '2016-08-01')
            };

            console.log("Restarting app service: " + this._getFormattedName());
            var response = await this._client.beginRequest(webRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            console.log("Restarted app service: " + this._getFormattedName());
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to restart app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async getPublishingProfileWithSecrets(force?: boolean): Promise<any>{
        if(force || !this._appServicePublishingProfile) {
            this._appServicePublishingProfile = await this._getPublishingProfileWithSecrets();
        }

        return this._appServicePublishingProfile;
    }

    public async getPublishingCredentials(): Promise<any> {
        try {            
            var httpRequest: webClient.WebRequest = {
                method: 'POST',
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/publishingcredentials/list`,
                    {
                        '{resourceGroupName}': this._resourceGroup,
                        '{name}': this._name,
                    }, null, '2016-08-01')
            };
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to fetch publishing credentials for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async getApplicationSettings(force?: boolean): Promise<AzureAppServiceConfigurationDetails> {
        if(force || !this._appServiceApplicationSetings) {
            this._appServiceApplicationSetings = await this._getApplicationSettings();
        }

        return this._appServiceApplicationSetings;
    }

    public async updateApplicationSettings(applicationSettings): Promise<AzureAppServiceConfigurationDetails> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'PUT',
                body: JSON.stringify(applicationSettings),
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/appsettings`,
                    {
                        '{resourceGroupName}': this._resourceGroup,
                        '{name}': this._name,
                    }, null, '2016-08-01')
            };
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to update application settings for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async patchApplicationSettings(addProperties: any, deleteProperties?: any): Promise<boolean> {
        var applicationSettings = await this.getApplicationSettings();
        var isNewValueUpdated: boolean = false;
        for(var key in addProperties) {
            if(applicationSettings.properties[key] != addProperties[key]) {
                console.log(`Value of ${key} has been changed to ${addProperties[key]}`);
                isNewValueUpdated = true;
            }

            applicationSettings.properties[key] = addProperties[key];
        }
        for(var key in deleteProperties) {
            if(key in applicationSettings.properties) {
                delete applicationSettings.properties[key];
                console.log(`Removing app setting : ${key}`);
                isNewValueUpdated = true;
            }
        }

        if(isNewValueUpdated) {
            await this.updateApplicationSettings(applicationSettings);
        }

        return isNewValueUpdated;
    }
    
    public async syncFunctionTriggers(): Promise<any> {
        try {
            let i = 0;
            let retryCount = 5;
            let retryIntervalInSeconds = 2;
            let timeToWait: number = retryIntervalInSeconds;
            var httpRequest: webClient.WebRequest = {
                method: 'POST',                
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/syncfunctiontriggers`,
                {
                    '{resourceGroupName}': this._resourceGroup,
                    '{name}': this._name,
                }, null, '2016-08-01')
            }
            
            while(true) {
                var response = await this._client.beginRequest(httpRequest);
                if(response.statusCode == 200) {
                    return response.body;
                }
                else if(response.statusCode == 400) {
                    if (++i < retryCount) {
                        await webClient.sleepFor(timeToWait);
                        timeToWait = timeToWait * retryIntervalInSeconds + retryIntervalInSeconds;
                        continue;
                    }
                    else {
                        throw ToError(response);
                    }
                }
                else {
                    throw ToError(response);
                }
            }
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to sync triggers for function app " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async getConfiguration(): Promise<AzureAppServiceConfigurationDetails> {
        try {            
            var httpRequest: webClient.WebRequest = {
                method: 'GET',
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/web`,
                    {
                        '{resourceGroupName}': this._resourceGroup,
                        '{name}': this._name,
                    }, null, '2016-08-01')
            };
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to get configuration settings for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async updateConfiguration(applicationSettings): Promise<AzureAppServiceConfigurationDetails> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'PUT',
                body: JSON.stringify(applicationSettings),
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/web`,
                {
                    '{resourceGroupName}': this._resourceGroup,
                    '{name}': this._name,
                }, null, '2016-08-01')
            };
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to update configuration settings for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async patchConfiguration(properties: any): Promise<any> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'PATCH',
                body: JSON.stringify(properties),
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/web`,
                    {
                        '{resourceGroupName}': this._resourceGroup,
                        '{name}': this._name,
                    }, null, '2016-08-01')
            }
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to patch configuration settings for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }

    }

    public async getMetadata(): Promise<AzureAppServiceConfigurationDetails> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'POST',                
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/metadata/list`,
                {
                    '{resourceGroupName}': this._resourceGroup,
                    '{name}': this._name,
                }, null, '2016-08-01')
            }
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to get app service Meta data for " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    public async updateMetadata(applicationSettings): Promise<AzureAppServiceConfigurationDetails> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'PUT',
                body: JSON.stringify(applicationSettings),           
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/metadata`,
                {
                    '{resourceGroupName}': this._resourceGroup,
                    '{name}': this._name,
                }, null, '2016-08-01')
            }
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to update app serviceMeta data for " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }
    
    public async patchMetadata(properties): Promise<void> {
        var applicationSettings = await this.getMetadata();
        for(var key in properties) {
            applicationSettings.properties[key] = properties[key];
        }

        await this.updateMetadata(applicationSettings);
    }
    
    public getSlot(): string {
        return this._slot ? this._slot : "production";
    }
    
    private async _getPublishingProfileWithSecrets(): Promise<any> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'POST',                
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/publishxml`,
                {
                    '{resourceGroupName}': this._resourceGroup,
                    '{name}': this._name,
                }, null, '2016-08-01')
            }
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            var publishingProfile = response.body;
            return publishingProfile;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to fetch publishing profile for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    private async _getApplicationSettings(): Promise<AzureAppServiceConfigurationDetails> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'POST',                
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}/config/appsettings/list`,
                {
                    '{resourceGroupName}': this._resourceGroup,
                    '{name}': this._name,
                }, null, '2016-08-01')
            }
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            return response.body;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to get application settings for app service " + this._getFormattedName() + ".\n" + error.message;
            }
            throw error;
        }
    }

    private async _get(): Promise<AzureAppServiceConfigurationDetails> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'GET',
                uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/${this._slotUrl}`,
                    {
                        '{resourceGroupName}': this._resourceGroup,
                        '{name}': this._name,
                    }, null, '2016-08-01')
            };
            
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode != 200) {
                throw ToError(response);
            }

            var appDetails = response.body;
            return appDetails as AzureAppServiceConfigurationDetails;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to fetch app service " + this._getFormattedName() + " details.\n" + error.message;
            }
            throw error;
        }
    }

    private _getFormattedName(): string {
        return this._slot ? `${this._name}-${this._slot}` : this._name;
    }

    public getName(): string {
        return this._name;
    }
 }