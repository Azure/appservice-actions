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
const taskparameters_1 = require("../taskparameters");
const KuduServiceUtility_1 = require("../common/RestUtilities/KuduServiceUtility");
const azure_app_service_1 = require("../common/ArmRest/azure-app-service");
const AzureAppServiceUtility_1 = require("../common/RestUtilities/AzureAppServiceUtility");
const AnnotationUtility_1 = require("../common/RestUtilities/AnnotationUtility");
const core = __importStar(require("@actions/core"));
class SpnBasedDeploymentHelper {
    constructor() {
        this.taskParams = taskparameters_1.TaskParameters.getTaskParams();
    }
    get AzureAppServiceUtility() {
        return this.appServiceUtility;
    }
    get AzureAppService() {
        return this.appService;
    }
    get KuduServiceUtility() {
        return this.kuduServiceUtility;
    }
    get TaskParams() {
        return this.taskParams;
    }
    get ActiveDeploymentID() {
        return this.activeDeploymentID;
    }
    PreDeploymentStep() {
        return __awaiter(this, void 0, void 0, function* () {
            this.appService = new azure_app_service_1.AzureAppService(this.taskParams.endpoint, this.taskParams.resourceGroupName, this.taskParams.appName);
            this.appServiceUtility = new AzureAppServiceUtility_1.AzureAppServiceUtility(this.appService);
            this.kuduService = yield this.appServiceUtility.getKuduService();
            this.kuduServiceUtility = new KuduServiceUtility_1.KuduServiceUtility(this.kuduService);
        });
    }
    UpdateDeploymentStatus(isDeploymentSuccess, updateStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.kuduServiceUtility) {
                yield AnnotationUtility_1.addAnnotation(this.taskParams.endpoint, this.appService, isDeploymentSuccess);
                if (!!updateStatus && updateStatus == true) {
                    this.activeDeploymentID = yield this.kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, { 'type': 'Deployment', slotName: this.appService.getSlot() });
                    core.debug('Active DeploymentId :' + this.activeDeploymentID);
                }
            }
            let appServiceApplicationUrl = yield this.appServiceUtility.getApplicationURL();
            console.log('App Service Application URL: ' + appServiceApplicationUrl);
            core.exportVariable('AppServiceApplicationUrl', appServiceApplicationUrl);
        });
    }
}
exports.SpnBasedDeploymentHelper = SpnBasedDeploymentHelper;
