"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PublishProfileBasedDeploymentHelper_1 = require("./PublishProfileBasedDeploymentHelper");
const SpnBasedDeploymentHelper_1 = require("./SpnBasedDeploymentHelper");
class DeploymentHelperFactory {
    static getHelper(type) {
        switch (type) {
            case DeploymentHelperConstants.SPN:
                {
                    return new SpnBasedDeploymentHelper_1.SpnBasedDeploymentHelper();
                }
            case DeploymentHelperConstants.PublishProfile:
                {
                    return new PublishProfileBasedDeploymentHelper_1.PublishProfileBasedDeploymentHelper();
                }
            default:
                {
                    throw new Error("invalid type");
                }
        }
    }
}
exports.DeploymentHelperFactory = DeploymentHelperFactory;
var DeploymentHelperConstants;
(function (DeploymentHelperConstants) {
    DeploymentHelperConstants[DeploymentHelperConstants["SPN"] = 0] = "SPN";
    DeploymentHelperConstants[DeploymentHelperConstants["PublishProfile"] = 1] = "PublishProfile";
})(DeploymentHelperConstants = exports.DeploymentHelperConstants || (exports.DeploymentHelperConstants = {}));
