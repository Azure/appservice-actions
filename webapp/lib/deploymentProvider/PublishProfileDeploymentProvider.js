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
const packageUtility_1 = require("../common/Utilities/packageUtility");
const KuduServiceUtility_1 = require("../common/RestUtilities/KuduServiceUtility");
const azure_app_kudu_service_1 = require("../common/KuduRest/azure-app-kudu-service");
const core = __importStar(require("@actions/core"));
const utility = __importStar(require("../common/Utilities/utility.js"));
const zipUtility = __importStar(require("../common/Utilities/ziputility.js"));
var parseString = require('xml2js').parseString;
class PublishProfileDeploymentProvider {
    PreDeploymentStep() {
        return __awaiter(this, void 0, void 0, function* () {
            let scmCreds = yield this.getCredsFromXml(taskparameters_1.TaskParameters.getTaskParams().publishProfileContent);
            this.kuduService = new azure_app_kudu_service_1.Kudu(scmCreds.uri, scmCreds.username, scmCreds.password);
            this.kuduServiceUtility = new KuduServiceUtility_1.KuduServiceUtility(this.kuduService);
        });
    }
    DeployWebAppStep() {
        return __awaiter(this, void 0, void 0, function* () {
            let packageType = taskparameters_1.TaskParameters.getTaskParams().package.getPackageType();
            let packagePath = taskparameters_1.TaskParameters.getTaskParams().package.getPath();
            yield this.kuduServiceUtility.warmpUp();
            switch (packageType) {
                case packageUtility_1.PackageType.folder:
                    let tempPackagePath = utility.generateTemporaryFolderOrZipPath(`${process.env.RUNNER_TEMPDIRECTORY}`, false);
                    let archivedWebPackage = yield zipUtility.archiveFolder(packagePath, "", tempPackagePath);
                    core.debug("Compressed folder into zip " + archivedWebPackage);
                    this.zipDeploymentID = yield this.kuduServiceUtility.deployUsingZipDeploy(archivedWebPackage);
                    break;
                case packageUtility_1.PackageType.zip:
                    this.zipDeploymentID = yield this.kuduServiceUtility.deployUsingZipDeploy(packagePath);
                    break;
                case packageUtility_1.PackageType.jar:
                    core.debug("Initiated deployment via kudu service for webapp jar package : " + packagePath);
                    let folderPath = yield utility.generateTemporaryFolderForDeployment(false, packagePath, packageUtility_1.PackageType.jar);
                    let output = yield utility.archiveFolderForDeployment(false, folderPath);
                    let webPackage = output.webDeployPkg;
                    core.debug("Initiated deployment via kudu service for webapp jar package : " + webPackage);
                    this.zipDeploymentID = yield this.kuduServiceUtility.deployUsingZipDeploy(webPackage);
                    break;
                case packageUtility_1.PackageType.war:
                    core.debug("Initiated deployment via kudu service for webapp war package : " + packagePath);
                    let warName = utility.getFileNameFromPath(packagePath, ".war");
                    this.zipDeploymentID = yield this.kuduServiceUtility.deployUsingWarDeploy(packagePath, {}, warName);
                    break;
                default:
                    throw new Error('Invalid App Service package or folder path provided: ' + packagePath);
            }
        });
    }
    UpdateDeploymentStatus(isDeploymentSuccess, updateStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.kuduServiceUtility) {
                if (this.zipDeploymentID && this.activeDeploymentID && isDeploymentSuccess) {
                    yield this.kuduServiceUtility.postZipDeployOperation(this.zipDeploymentID, this.activeDeploymentID);
                }
                if (!!updateStatus && updateStatus == true) {
                    this.activeDeploymentID = yield this.kuduServiceUtility.updateDeploymentStatus(isDeploymentSuccess, null, { 'type': 'Deployment' });
                    core.debug('Active DeploymentId :' + this.activeDeploymentID);
                }
            }
            console.log('App Service Application URL: ' + this.applicationURL);
            core.setOutput('webapp-url', this.applicationURL);
        });
    }
    getCredsFromXml(pubxmlFile) {
        return __awaiter(this, void 0, void 0, function* () {
            let res;
            yield parseString(pubxmlFile, (error, result) => {
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
            creds.uri = `https://${creds.username}:${creds.password}@${creds.uri}`;
            this.applicationURL = res.destinationAppUrl;
            return creds;
        });
    }
}
exports.PublishProfileDeploymentProvider = PublishProfileDeploymentProvider;
