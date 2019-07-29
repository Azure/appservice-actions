import util = require('util');
import webClient = require('../webClient');
import * as core from '@actions/core';

export class KuduServiceClient {
    private _scmUri;
    private _accesssToken: string;
    private _cookie: string[];

    constructor(scmUri: string, accessToken: string) {
        this._accesssToken = accessToken;
        this._scmUri = scmUri;
    }

    public async beginRequest(request: webClient.WebRequest, reqOptions?: webClient.WebRequestOptions, contentType?: string): Promise<webClient.WebResponse> {
        request.headers = request.headers || {};
        request.headers["Authorization"] = "Basic " + this._accesssToken;
        request.headers['Content-Type'] = contentType || 'application/json; charset=utf-8';
        
        if(!!this._cookie) {
            core.debug(`setting affinity cookie ${JSON.stringify(this._cookie)}`);
            request.headers['Cookie'] = this._cookie;
        }

        let retryCount = reqOptions && util.isNumber(reqOptions.retryCount) ? reqOptions.retryCount : 5;

        while(retryCount >= 0) {
            try {
                let httpResponse = await webClient.sendRequest(request, reqOptions);
                if(httpResponse.headers['set-cookie'] && !this._cookie) {
                    this._cookie = httpResponse.headers['set-cookie'];
                    core.debug(`loaded affinity cookie ${JSON.stringify(this._cookie)}`);
                }
                
                return httpResponse;
            }
            catch(exception) {
                let exceptionString: string = exception.toString();
                if(exceptionString.indexOf("Hostname/IP doesn't match certificates's altnames") != -1
                    || exceptionString.indexOf("unable to verify the first certificate") != -1
                    || exceptionString.indexOf("unable to get local issuer certificate") != -1) {
                        core.warning('ASE_SSLIssueRecommendation');
                }

                if(retryCount > 0 && exceptionString.indexOf('Request timeout') != -1 && (!reqOptions || reqOptions.retryRequestTimedout)) {
                    core.debug('encountered request timedout issue in Kudu. Retrying again');
                    retryCount -= 1;
                    continue;
                }

                throw new Error(exceptionString);
            }
        }

    }

    public getRequestUri(uriFormat: string, queryParameters?: Array<string>) {
        uriFormat = uriFormat[0] == "/" ? uriFormat : "/" + uriFormat;

        if(queryParameters && queryParameters.length > 0) {
            uriFormat = uriFormat + '?' + queryParameters.join('&');
        }

        return this._scmUri + uriFormat;
    }

    public getScmUri(): string {
        return this._scmUri;
    }
}