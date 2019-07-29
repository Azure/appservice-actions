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
const fs = require("fs");
const taskparameters_1 = require("../taskparameters");
const KuduServiceUtility_1 = require("../common/RestUtilities/KuduServiceUtility");
const azure_app_kudu_service_1 = require("../common/KuduRest/azure-app-kudu-service");
const core = __importStar(require("@actions/core"));
var parseString = require('xml2js').parseString;
class PublishProfileBasedDeploymentHelper {
    get KuduServiceUtility() {
        return this.kuduServiceUtility;
    }
    get ActiveDeploymentID() {
        return this.activeDeploymentID;
    }
    PreDeploymentStep() {
        return __awaiter(this, void 0, void 0, function* () {
            let scmCreds = yield this.getCredsFromXml(taskparameters_1.TaskParameters.getTaskParams().publishProfilePath);
            this.kuduService = new azure_app_kudu_service_1.Kudu(scmCreds.uri, scmCreds.username, scmCreds.password);
            this.kuduServiceUtility = new KuduServiceUtility_1.KuduServiceUtility(this.kuduService);
        });
    }
    UpdateDeploymentStatus(isDeploymentSuccess, updateStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.kuduServiceUtility) {
                if (!!updateStatus && updateStatus == true) {
                    // can pass slotName: this.appService.getSlot() in  custom message
                    this.activeDeploymentID = yield this.kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, { 'type': 'Deployment' });
                    core.debug('Active DeploymentId :' + this.activeDeploymentID);
                }
            }
            console.log('App Service Application URL: ' + this.applicationURL);
            core.exportVariable('AppServiceApplicationUrl', this.applicationURL);
        });
    }
    getCredsFromXml(pubxmlFile) {
        return __awaiter(this, void 0, void 0, function* () {
            var publishProfileXML = fs.readFileSync(pubxmlFile);
            let res;
            yield parseString(publishProfileXML, (error, result) => {
                if (!!error) {
                    throw new Error("Failed XML parsing " + error);
                }
                res = result.publishData.publishProfile[0].$;
            });
            let creds = {
                uri: res.publishUrl.split(":")[0],
                username: res.userName,
                password: res.userPWD
            };
            if (creds.uri.indexOf("scm") < 0) {
                throw new Error("Publish profile does not contain kudu URL");
            }
            this.applicationURL = res.destinationAppUrl;
            return creds;
        });
    }
}
exports.PublishProfileBasedDeploymentHelper = PublishProfileBasedDeploymentHelper;
