import { IAuthorizationHandler } from "./IAuthorizationHandler";
import webClient = require("../webClient");

export class ApiResult {
    public error: any;
    public result: any;
    public request: any;
    public response: any;

    constructor(error: any, result?: any, request?: any, response?: any) {
        this.error = error;
        this.result = result;
        this.request = request;
        this.response = response;
    }
}

export class AzureError {
    public code: any;
    public message: string | undefined;
    public statusCode: number | undefined;
    public details: any;
}

export interface ApiCallback {
    (error: any, result?: any, request?: any, response?: any): void
}

export function ToError(response: webClient.WebResponse): AzureError {
    var error = new AzureError();
    error.statusCode = response.statusCode;
    error.message = response.body
    if (response.body && response.body.error) {
        error.code = response.body.error.code;
        error.message = response.body.error.message;
        error.details = response.body.error.details;

        console.log("##[error]" + error.message);
    }

    return error;
}

export class ServiceClient {
    private endpoint: IAuthorizationHandler;
    protected baseUrl: string;
    protected longRunningOperationRetryTimeout: number;

    public subscriptionId: string;

    constructor(endpoint: IAuthorizationHandler, timeout?: number) {
        this.endpoint = endpoint;
        this.subscriptionId = this.endpoint.subscriptionID;
        this.baseUrl = this.endpoint.baseUrl;
        this.longRunningOperationRetryTimeout = !!timeout ? timeout : 0; // In minutes
    }

    public getRequestUri(uriFormat: string, parameters: {}, queryParameters?: string[], apiVersion?: string): string {
        return this.getRequestUriForbaseUrl(this.baseUrl, uriFormat, parameters, queryParameters, apiVersion);
    }

    public getRequestUriForbaseUrl(baseUrl: string, uriFormat: string, parameters: {}, queryParameters?: string[], apiVersion?: string): string {
        var requestUri = baseUrl + uriFormat;
        requestUri = requestUri.replace('{subscriptionId}', encodeURIComponent(this.subscriptionId));
        for (var key in parameters) {
            requestUri = requestUri.replace(key, encodeURIComponent((<any>parameters)[key]));
        }

        // trim all duplicate forward slashes in the url
        var regex = /([^:]\/)\/+/gi;
        requestUri = requestUri.replace(regex, '$1');

        // process query paramerters
        queryParameters = queryParameters || [];
        if(!!apiVersion) {
            queryParameters.push('api-version=' + encodeURIComponent(apiVersion));
        }
        if (queryParameters.length > 0) {
            requestUri += '?' + queryParameters.join('&');
        }

        return requestUri
    }

    public async beginRequest(request: webClient.WebRequest): Promise<webClient.WebResponse> {
        var token = await this.endpoint.getToken();

        request.headers = request.headers || {};
        request.headers["Authorization"] = "Bearer " + token;
        request.headers['Content-Type'] = 'application/json; charset=utf-8';

        var httpResponse = null;

        try
        {
            httpResponse = await webClient.sendRequest(request);
            if (httpResponse.statusCode === 401 && httpResponse.body && httpResponse.body.error && httpResponse.body.error.code === "ExpiredAuthenticationToken") {
                // The access token might have expire. Re-issue the request after refreshing the token.
                token = await this.endpoint.getToken(true);
                request.headers["Authorization"] = "Bearer " + token;
                httpResponse = await webClient.sendRequest(request);
            }
        } catch(exception) {
            let exceptionString: string = exception.toString();
            if(exceptionString.indexOf("Hostname/IP doesn't match certificates's altnames") != -1
                || exceptionString.indexOf("unable to verify the first certificate") != -1
                || exceptionString.indexOf("unable to get local issuer certificate") != -1) {
                    console.log('Warning:' + 'ASE_SSLIssueRecommendation');
            } 

            throw exception;
        }

        return httpResponse;
    }

    public async accumulateResultFromPagedResult(nextLinkUrl: string): Promise<ApiResult> {
        var result: any[] = [];
        while (nextLinkUrl) {
            var nextRequest: webClient.WebRequest = {
                method: 'GET',
                uri: nextLinkUrl
            };
            var response = await this.beginRequest(nextRequest);
            if (response.statusCode == 200 && response.body) {
                if (response.body.value) {
                    result = result.concat(response.body.value);
                }

                nextLinkUrl = response.body.nextLink;
            }
            else {
                return new ApiResult(ToError(response));
            }
        }

        return new ApiResult(null, result);
    }
}
