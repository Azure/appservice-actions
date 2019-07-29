import webClient = require('../webClient');
import  {ToError, ServiceClient } from './AzureServiceClient';
import { IAuthorizationHandler } from './IAuthorizationHandler';

export interface ApplicationInsights {
    id?: string;
    name: string;
    type: string;
    location: string;
    tags: {[key: string]: string},
    kind?: string,
    etag?: string;
    properties?: {[key: string]: any};
}

export class AzureApplicationInsights {
    private _name: string;
    private _resourceGroupName: string;
    private _client: ServiceClient;

    constructor(endpoint: IAuthorizationHandler, resourceGroupName: string, name: string) {
        this._client = new ServiceClient(endpoint, 30);
        this._resourceGroupName = resourceGroupName;
        this._name = name;
    }

    public async addReleaseAnnotation(annotation: any): Promise<void> {
        var httpRequest: webClient.WebRequest = {
            method: 'PUT',
            body: JSON.stringify(annotation),
            uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/microsoft.insights/components/{resourceName}/Annotations`,
            {
                '{resourceGroupName}': this._resourceGroupName,
                '{resourceName}': this._name,
            }, null, '2015-05-01')
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            console.log(`addReleaseAnnotation. Data : ${JSON.stringify(response)}`);
            if(response.statusCode == 200 || response.statusCode == 201) {
                return ;
            }

            throw ToError(response);
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to update Application Insights for resource " + this._name + ".\n" + error.message;
            }
            throw error;
        }
    }

    public getResourceGroupName(): string {
        return this._resourceGroupName;
    }
}


export class ApplicationInsightsResources {
    private _client: ServiceClient;

    constructor(endpoint: IAuthorizationHandler) {
        this._client = new ServiceClient(endpoint, 30);
    }

    public async list(resourceGroupName?: string, filter?: string[]): Promise<ApplicationInsights[]> {
        resourceGroupName = resourceGroupName ? `resourceGroups/${resourceGroupName}` : '';
        var httpRequest: webClient.WebRequest = {
            method: 'GET',
            uri: this._client.getRequestUri(`//subscriptions/{subscriptionId}/${resourceGroupName}/providers/microsoft.insights/components`,
            {}, filter, '2015-05-01')
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            if(response.statusCode == 200) {
                var responseBody = response.body;
                var applicationInsightsResources: ApplicationInsights[] = [];
                if(responseBody.value && responseBody.value.length > 0) {
                    for(var value of responseBody.value) {
                        applicationInsightsResources.push(value as ApplicationInsights);
                    }
                }

                return applicationInsightsResources;

            }

            throw ToError(response);
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to get Application Insights Resource.\n" + error.message;
            }
            throw error;
        }

    }
}