"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const crypto = __importStar(require("crypto"));
const KuduServiceUtility_1 = require("./common/RestUtilities/KuduServiceUtility");
const azure_app_service_1 = require("./common/ArmRest/azure-app-service");
const AzureAppServiceUtility_1 = require("./common/RestUtilities/AzureAppServiceUtility");
const ContainerDeploymentUtility_1 = require("./common/RestUtilities/ContainerDeploymentUtility");
const AnnotationUtility_1 = require("./common/RestUtilities/AnnotationUtility");
const taskparameters_1 = require("./taskparameters");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let isDeploymentSuccess = true;
        try {
            // Set user agent varable
            let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
            let prefix = "";
            if (!!process.env.AZURE_HTTP_USER_AGENT) {
                prefix = `${process.env.AZURE_HTTP_USER_AGENT}`;
            }
            let actionName = 'Deploy Web Apps to Azure';
            core.exportVariable('AZURE_HTTP_USER_AGENT', `${prefix} GITHUBACTIONS_${actionName}_${usrAgentRepo}`);
            var taskParams = taskparameters_1.TaskParameters.getTaskParams();
            yield taskParams.getResourceDetails();
            core.debug("Predeployment Step Started");
            var appService = new azure_app_service_1.AzureAppService(taskParams.endpoint, taskParams.resourceGroupName, taskParams.appName);
            var appServiceUtility = new AzureAppServiceUtility_1.AzureAppServiceUtility(appService);
            var kuduService = yield appServiceUtility.getKuduService();
            var kuduServiceUtility = new KuduServiceUtility_1.KuduServiceUtility(kuduService);
            core.debug("Deployment Step Started");
            core.debug("Performing container based deployment.");
            let containerDeploymentUtility = new ContainerDeploymentUtility_1.ContainerDeploymentUtility(appService);
            yield containerDeploymentUtility.deployWebAppImage(taskParams.images, taskParams.multiContainerConfigFile, taskParams.isLinux, taskParams.isMultiContainer, taskParams.containerCommand);
        }
        catch (error) {
            core.debug("Deployment Failed with Error: " + error);
            isDeploymentSuccess = false;
            core.setFailed(error);
        }
        finally {
            if (!!kuduServiceUtility) {
                yield AnnotationUtility_1.addAnnotation(taskParams.endpoint, appService, isDeploymentSuccess);
                let activeDeploymentID = yield kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, { 'type': 'Deployment', slotName: appService.getSlot() });
                core.debug('Active DeploymentId :' + activeDeploymentID);
            }
            let appServiceApplicationUrl = yield appServiceUtility.getApplicationURL();
            console.log('App Service Application URL: ' + appServiceApplicationUrl);
            core.setOutput('webapp-url', appServiceApplicationUrl);
            core.debug(isDeploymentSuccess ? "Deployment Succeded" : "Deployment failed");
        }
    });
}
main();
