import { IAuthorizationHandler } from "./IAuthorizationHandler";
import { execSync, IExecSyncResult, IExecSyncOptions } from "../Utilities/utilityHelperFunctions";
import * as core from '@actions/core';

export class AzCliAuthHandler implements IAuthorizationHandler{
    private static endpoint: AzCliAuthHandler;
    private _subscriptionID: string;
    private _baseUrl: string;
    private token;

    private constructor(subscriptionID: string) {
        this._subscriptionID = subscriptionID;
        this._baseUrl = "https://management.azure.com/";
    }

    public static getEndpoint(param?: string) {
        if(!this.endpoint) {
            this.endpoint = new AzCliAuthHandler(param);
        }
        return this.endpoint;
    }

    public get subscriptionID(): string {
        return this._subscriptionID;
    }

    public get baseUrl(): string {
        return this._baseUrl;
    }

    public getToken(force?: boolean) {
        if(!this.token || force) {            
            let resultOfExec: IExecSyncResult = execSync("az", "account get-access-token --query \"accessToken\"", { silent: true } as IExecSyncOptions);
            if (resultOfExec.code != 0) {
                core.error("Error Code: [" + resultOfExec.code + "]");
                throw resultOfExec;
            }
            let tok = resultOfExec.stdout.trim();
            this.token = tok.substring(1,tok.length - 1);
        }
        return this.token;
    }
}