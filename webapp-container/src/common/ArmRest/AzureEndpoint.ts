import Q = require('q');
import fs = require('fs');
import webClient = require("../webClient");
import querystring = require('querystring');
import { IAuthorizationHandler } from "./IAuthorizationHandler";

export class AzureEndpoint implements IAuthorizationHandler {
    private static endpoint: AzureEndpoint;
    private _subscriptionID: string;
    private servicePrincipalClientID: string;
    private servicePrincipalKey: string;
    private tenantID: string;
    private _baseUrl: string;
    private environmentAuthorityUrl: string;
    private activeDirectoryResourceId: string;
    private token_deferred?: Q.Promise<string>;

    private constructor(authFilePath: string) {
        let content = fs.readFileSync(authFilePath).toString();
        let jsonObj = JSON.parse(content);
        this._subscriptionID = jsonObj.subscriptionId;
        this.servicePrincipalClientID = jsonObj.clientId;
        this.servicePrincipalKey = jsonObj.clientSecret;
        this.tenantID = jsonObj.tenantId;
        if(!this.subscriptionID || !this.servicePrincipalClientID || !this.servicePrincipalKey || !this.tenantID) {
            throw new Error("Not all credentail details present in file.");
        }
        this._baseUrl = "https://management.azure.com/";
        this.environmentAuthorityUrl = "https://login.windows.net/";
        this.activeDirectoryResourceId = "https://management.core.windows.net/";
    }

    public static getEndpoint(authFilePath: string): AzureEndpoint {
        if(!this.endpoint) {
            this.endpoint = new AzureEndpoint(authFilePath);
        }
        return this.endpoint;
    }

    public get subscriptionID(): string {
        return this._subscriptionID;
    }

    public get baseUrl(): string {
        return this._baseUrl;
    }

    public getToken(force?: boolean): Q.Promise<string> {
        if (!this.token_deferred || force) {
            this.token_deferred = this._getSPNAuthorizationToken();
        }

        return this.token_deferred;
    }

    private _getSPNAuthorizationToken(): Q.Promise<string> {        
        var deferred = Q.defer<string>();
        let webRequest: webClient.WebRequest = {
            method: "POST",
            uri: this.environmentAuthorityUrl + this.tenantID + "/oauth2/token/",
            body: querystring.stringify({
                resource: this.activeDirectoryResourceId,
                client_id: this.servicePrincipalClientID,
                grant_type: "client_credentials",
                client_secret: this.servicePrincipalKey
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            }
        };

        let webRequestOptions: webClient.WebRequestOptions = {
            retriableStatusCodes: [400, 408, 409, 500, 502, 503, 504]
        };

        webClient.sendRequest(webRequest, webRequestOptions).then(
            (response: webClient.WebResponse) => {
                if (response.statusCode == 200) {
                    deferred.resolve(response.body.access_token);
                }
                else if([400, 401, 403].indexOf(response.statusCode) != -1) {
                    deferred.reject('ExpiredServicePrincipal');
                }
                else {
                    deferred.reject('CouldNotFetchAccessTokenforAzureStatusCode');
                }
            },
            (error) => {
                deferred.reject(error)
            }
        );

        return deferred.promise;
    }
}