"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LinuxWebAppDeploymentProvider_1 = require("./LinuxWebAppDeploymentProvider");
const WindowsWebAppDeploymentProvider_1 = require("./WindowsWebAppDeploymentProvider");
const PublishProfileDeploymentProvider_1 = require("./PublishProfileDeploymentProvider");
class DeploymentFactory {
    static GetDeploymentProvider(type) {
        switch (type) {
            case DEPLOYMENT_PROVIDER_TYPES.PUBLISHPROFILE:
                console.log("Deployment started using publish profile crdentials");
                return new PublishProfileDeploymentProvider_1.PublishProfileDeploymentProvider();
            case DEPLOYMENT_PROVIDER_TYPES.WINDOWS:
                console.log("Deployment started for windows app service");
                return new WindowsWebAppDeploymentProvider_1.WindowsWebAppDeploymentProvider();
            case DEPLOYMENT_PROVIDER_TYPES.LINUX:
                console.log("Deployment started for linux app service");
                return new LinuxWebAppDeploymentProvider_1.LinuxWebAppDeploymentProvider();
            default:
                throw new Error("Invalid deployment provider type");
        }
    }
}
exports.DeploymentFactory = DeploymentFactory;
var DEPLOYMENT_PROVIDER_TYPES;
(function (DEPLOYMENT_PROVIDER_TYPES) {
    DEPLOYMENT_PROVIDER_TYPES[DEPLOYMENT_PROVIDER_TYPES["WINDOWS"] = 0] = "WINDOWS";
    DEPLOYMENT_PROVIDER_TYPES[DEPLOYMENT_PROVIDER_TYPES["LINUX"] = 1] = "LINUX";
    DEPLOYMENT_PROVIDER_TYPES[DEPLOYMENT_PROVIDER_TYPES["PUBLISHPROFILE"] = 2] = "PUBLISHPROFILE";
})(DEPLOYMENT_PROVIDER_TYPES = exports.DEPLOYMENT_PROVIDER_TYPES || (exports.DEPLOYMENT_PROVIDER_TYPES = {}));
