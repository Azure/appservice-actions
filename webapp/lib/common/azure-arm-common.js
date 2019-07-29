"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const Q = require("q");
const querystring = require("querystring");
const webClient = require("./webClient");
class ApplicationTokenCredentials {
    constructor(clientId, domain, secret, authorityUrl, activeDirectoryResourceId, isAzureStackEnvironment, scheme, msiClientId, authType, certFilePath, isADFSEnabled) {
        if (!Boolean(domain) || typeof domain.valueOf() !== 'string') {
            throw new Error(tl.loc("DomainCannotBeEmpty"));
        }
        if (!Boolean(clientId) || typeof clientId.valueOf() !== 'string') {
            throw new Error(tl.loc("ClientIdCannotBeEmpty"));
        }
        if (!Boolean(secret) || typeof secret.valueOf() !== 'string') {
            throw new Error(tl.loc("SecretCannotBeEmpty"));
        }
        if (!Boolean(authorityUrl) || typeof authorityUrl.valueOf() !== 'string') {
            throw new Error(tl.loc("authorityUrlCannotBeEmpty"));
        }
        if (!Boolean(activeDirectoryResourceId) || typeof activeDirectoryResourceId.valueOf() !== 'string') {
            throw new Error(tl.loc("activeDirectoryResourceIdUrlCannotBeEmpty"));
        }
        this.clientId = clientId;
        this.domain = domain;
        this.authorityUrl = authorityUrl;
        this.activeDirectoryResourceId = activeDirectoryResourceId;
        this.secret = secret;
    }
    getToken(force) {
        var deferred = Q.defer();
        let webRequest = new webClient.WebRequest();
        webRequest.method = "POST";
        webRequest.uri = this.authorityUrl + this.domain + "/oauth2/token/";
        webRequest.body = querystring.stringify({
            resource: this.activeDirectoryResourceId,
            client_id: this.clientId,
            grant_type: "client_credentials",
            client_secret: this.secret
        });
        webRequest.headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
        };
        webClient.sendRequest(webRequest).then((response) => {
            if (response.statusCode == 200) {
                deferred.resolve(response.body.access_token);
            }
            else {
                deferred.reject(tl.loc('CouldNotFetchAccessTokenforAzureStatusCode', response.statusCode, response.statusMessage));
            }
        }, (error) => {
            deferred.reject(error);
        });
        return deferred.promise;
    }
    getDomain() {
        return this.domain;
    }
    getClientId() {
        return this.clientId;
    }
}
exports.ApplicationTokenCredentials = ApplicationTokenCredentials;
