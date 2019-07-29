export interface IAuthorizationHandler {
    getToken(force?: boolean);
    subscriptionID: string;
    baseUrl: string;
}