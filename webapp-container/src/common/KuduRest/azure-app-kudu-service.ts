import fs = require('fs');
import { KuduServiceClient } from './KuduServiceClient';
import webClient = require('../webClient');
import { KUDU_DEPLOYMENT_CONSTANTS } from '../constants';
import { exist } from '../Utilities/packageUtility';
import * as core from '@actions/core';

export class Kudu {
    private _client: KuduServiceClient;

    constructor(scmUri: string, username: string, password: string) {
        var base64EncodedCredential = (new Buffer(username + ':' + password).toString('base64'));
        this._client = new KuduServiceClient(scmUri, base64EncodedCredential);
    }

    public async updateDeployment(requestBody: any): Promise<string> {
        var httpRequest: webClient.WebRequest = {
            method: 'PUT',
            body: JSON.stringify(requestBody),
            uri: this._client.getRequestUri(`/api/deployments/${requestBody.id}`)
        };

        try {
            let webRequestOptions: webClient.WebRequestOptions = {retriableErrorCodes: [], retriableStatusCodes: null, retryCount: 5, retryIntervalInSeconds: 5, retryRequestTimedout: true};
            var response = await this._client.beginRequest(httpRequest, webRequestOptions);
            core.debug(`updateDeployment. Data: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                console.log("Successfully updated deployment History at " + response.body.url);
                return response.body.id;
            }

            throw response;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to update deployment history.\n" + error.message;
            }
            throw error;
        }
    }

    public async getAppSettings(): Promise<Map<string, string>> {
        var httpRequest: webClient.WebRequest = {
            method: 'GET',
            uri: this._client.getRequestUri(`/api/settings`)
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`getAppSettings. Data: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                return response.body;
            }

            throw response;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to fetch Kudu App Settings.\n" + error.message;
            }
            throw error;
        }
    }

    public async runCommand(physicalPath: string, command: string): Promise<void> {
        var httpRequest: webClient.WebRequest = {
            method: 'POST',
            uri: this._client.getRequestUri(`/api/command`),
            headers: {
                'Content-Type': 'multipart/form-data',
                'If-Match': '*'
            },
            body: JSON.stringify({
                'command': command,
                'dir': physicalPath
            })
        };

        try {
            core.debug('Executing Script on Kudu. Command: ' + command);
            let webRequestOptions: webClient.WebRequestOptions = {retriableErrorCodes: null, retriableStatusCodes: null, retryCount: 5, retryIntervalInSeconds: 5, retryRequestTimedout: false};
            var response = await this._client.beginRequest(httpRequest, webRequestOptions);
            core.debug(`runCommand. Data: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                return ;
            }
            else {
                throw response;
            }
        }
        catch(error) {
            throw error;
        }
    }

    public async extractZIP(webPackage: string, physicalPath: string): Promise<void> {
        physicalPath = physicalPath.replace(/[\\]/g, "/");
        physicalPath = physicalPath[0] == "/" ? physicalPath.slice(1): physicalPath;
        var httpRequest: webClient.WebRequest = {
            method: 'PUT',
            uri: this._client.getRequestUri(`/api/zip/${physicalPath}/`),
            headers: {
                'Content-Type': 'multipart/form-data',
                'If-Match': '*'
            },
            body: fs.createReadStream(webPackage)
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`extractZIP. Data: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                return ;
            }
            else {
                throw response;
            }
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to deploy App Service package using kudu service.\n" + error.message;
            }
            throw error;
        }
    }

    public async zipDeploy(webPackage: string, queryParameters?: Array<string>): Promise<any> {
        let httpRequest: webClient.WebRequest = {
            method: 'POST',
            uri: this._client.getRequestUri(`/api/zipdeploy`, queryParameters),
            body: fs.createReadStream(webPackage)
        };

        try {
            let response = await this._client.beginRequest(httpRequest, null, 'application/octet-stream');
            core.debug(`ZIP Deploy response: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                core.debug('Deployment passed');
                return null;
            }
            else if(response.statusCode == 202) {
                let pollableURL: string = response.headers.location;
                if(!!pollableURL) {
                    core.debug(`Polling for ZIP Deploy URL: ${pollableURL}`);
                    return await this._getDeploymentDetailsFromPollURL(pollableURL);
                }
                else {
                    core.debug('zip deploy returned 202 without pollable URL.');
                    return null;
                }
            }
            else {
                throw response;
            }
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to deploy web package to App Service.\n" + error.message;
            }
            throw error;
        }
    }

    public async warDeploy(webPackage: string, queryParameters?: Array<string>): Promise<any> {
        let httpRequest: webClient.WebRequest = {
            method: 'POST',
            uri: this._client.getRequestUri(`/api/wardeploy`, queryParameters),
            body: fs.createReadStream(webPackage)
        };

        try {
            let response = await this._client.beginRequest(httpRequest, null, 'application/octet-stream');
            core.debug(`War Deploy response: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                core.debug('Deployment passed');
                return null;
            }
            else if(response.statusCode == 202) {
                let pollableURL: string = response.headers.location;
                if(!!pollableURL) {
                    core.debug(`Polling for War Deploy URL: ${pollableURL}`);
                    return await this._getDeploymentDetailsFromPollURL(pollableURL);
                }
                else {
                    core.debug('war deploy returned 202 without pollable URL.');
                    return null;
                }
            }
            else {
                throw response;
            }
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to deploy web package to App Service.\n" + error.message;
            }
            throw error;
        }
    }


    public async getDeploymentDetails(deploymentID: string): Promise<any> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'GET',
                uri: this._client.getRequestUri(`/api/deployments/${deploymentID}`)
            };
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`getDeploymentDetails. Data: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                return response.body;
            }

            throw response;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to gte deployment logs.\n" + error.message;
            }
            throw error;
        }
    }

    public async getDeploymentLogs(log_url: string): Promise<any> {
        try {
            var httpRequest: webClient.WebRequest = {
                method: 'GET',
                uri: log_url
            };
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`getDeploymentLogs. Data: ${JSON.stringify(response)}`);
            if(response.statusCode == 200) {
                return response.body;
            }

            throw response;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to gte deployment logs.\n" + error.message;
            }
            throw error;
        }
    }    

    public async getFileContent(physicalPath: string, fileName: string): Promise<string> {
        physicalPath = physicalPath.replace(/[\\]/g, "/");
        physicalPath = physicalPath[0] == "/" ? physicalPath.slice(1): physicalPath;
        var httpRequest: webClient.WebRequest = {
            method: 'GET',
            uri: this._client.getRequestUri(`/api/vfs/${physicalPath}/${fileName}`),
            headers: {
                'If-Match': '*'
            }
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`getFileContent. Status code: ${response.statusCode} - ${response.statusMessage}`);
            if([200, 201, 204].indexOf(response.statusCode) != -1) {
                return response.body;
            }
            else if(response.statusCode === 404) {
                return null;
            }
            else {
                throw response;
            }
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to get file content " + physicalPath + fileName + " from Kudu.\n" + error.message;
            }
            throw error;
        }
    }

    public async uploadFile(physicalPath: string, fileName: string, filePath: string): Promise<void> {
        physicalPath = physicalPath.replace(/[\\]/g, "/");
        physicalPath = physicalPath[0] == "/" ? physicalPath.slice(1): physicalPath;
        if(!exist(filePath)) {
            throw new Error('FilePathInvalid' + filePath);
        }

        var httpRequest: webClient.WebRequest = {
            method: 'PUT',
            uri: this._client.getRequestUri(`/api/vfs/${physicalPath}/${fileName}`),
            headers: {
                'If-Match': '*'
            },
            body: fs.createReadStream(filePath)
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`uploadFile. Data: ${JSON.stringify(response)}`);
            if([200, 201, 204].indexOf(response.statusCode) != -1) {
                return response.body;
            }
            
            throw response;
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to upload file " + physicalPath + fileName + " from Kudu.\n" + error.message;
            }
            throw error;
        }
    }

    public async deleteFile(physicalPath: string, fileName: string): Promise<void> {
        physicalPath = physicalPath.replace(/[\\]/g, "/");
        physicalPath = physicalPath[0] == "/" ? physicalPath.slice(1): physicalPath;
        var httpRequest: webClient.WebRequest = {
            method: 'DELETE',
            uri: this._client.getRequestUri(`/api/vfs/${physicalPath}/${fileName}`),
            headers: {
                'If-Match': '*'
            }
        };

        try {
            var response = await this._client.beginRequest(httpRequest);
            core.debug(`deleteFile. Data: ${JSON.stringify(response)}`);
            if([200, 201, 204, 404].indexOf(response.statusCode) != -1) {
                return ;
            }
            else {
                throw response;
            }
        }
        catch(error) {
            if(error && error.message && typeof error.message.valueOf() == 'string') {
                error.message = "Failed to delete file " + physicalPath + fileName + " from Kudu.\n" + error.message;
            }
            throw error;
        }
    }

    private async _getDeploymentDetailsFromPollURL(pollURL: string):Promise<any> {
        let httpRequest: webClient.WebRequest = {
            method: 'GET',
            uri: pollURL,
            headers: {}
        };

        while(true) {
            let response = await this._client.beginRequest(httpRequest);
            if(response.statusCode == 200 || response.statusCode == 202) {
                var result = response.body;
                core.debug(`POLL URL RESULT: ${JSON.stringify(response)}`);
                if(result.status == KUDU_DEPLOYMENT_CONSTANTS.SUCCESS || result.status == KUDU_DEPLOYMENT_CONSTANTS.FAILED) {
                    return result;
                }
                else {
                    core.debug(`Deployment status: ${result.status} '${result.status_text}'. retry after 5 seconds`);
                    await webClient.sleepFor(5);
                    continue;
                }
            }
            else {
                throw response;
            }
        }
    }
}