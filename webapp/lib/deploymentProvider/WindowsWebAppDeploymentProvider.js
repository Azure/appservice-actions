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
const WebAppDeploymentProvider_1 = require("./WebAppDeploymentProvider");
const packageUtility_1 = require("../common/Utilities/packageUtility");
const parameterParserUtility_1 = require("../common/Utilities/parameterParserUtility");
const fileTransformationUtility_1 = require("../common/Utilities/fileTransformationUtility");
const utility = __importStar(require("../common/Utilities/utility.js"));
const zipUtility = __importStar(require("../common/Utilities/ziputility.js"));
const core = __importStar(require("@actions/core"));
const taskparameters_1 = require("../taskparameters");
const removeRunFromZipAppSetting = '-WEBSITE_RUN_FROM_PACKAGE 0';
const runFromZipAppSetting = '-WEBSITE_RUN_FROM_PACKAGE 1';
const appType = "-appType java_springboot";
const jarPath = " -JAR_PATH ";
class WindowsWebAppDeploymentProvider extends WebAppDeploymentProvider_1.WebAppDeploymentProvider {
    DeployWebAppStep() {
        return __awaiter(this, void 0, void 0, function* () {
            let webPackage = taskparameters_1.TaskParameters.getTaskParams().package.getPath();
            var _isMSBuildPackage = yield taskparameters_1.TaskParameters.getTaskParams().package.isMSBuildPackage();
            if (_isMSBuildPackage) {
                throw new Error('MsBuildPackageNotSupported' + webPackage);
            }
            let packageType = taskparameters_1.TaskParameters.getTaskParams().package.getPackageType();
            let deploymentMethodtelemetry;
            switch (packageType) {
                case packageUtility_1.PackageType.war:
                    core.debug("Initiated deployment via kudu service for webapp war package : " + webPackage);
                    yield this.kuduServiceUtility.warmpUp();
                    var warName = utility.getFileNameFromPath(webPackage, ".war");
                    this.zipDeploymentID = yield this.kuduServiceUtility.deployUsingWarDeploy(webPackage, { slotName: this.appService.getSlot() }, warName);
                    this.updateStatus = true;
                    break;
                case packageUtility_1.PackageType.jar:
                    core.debug("Initiated deployment via kudu service for webapp jar package : " + webPackage);
                    var updateApplicationSetting = parameterParserUtility_1.parse(removeRunFromZipAppSetting);
                    var isNewValueUpdated = yield this.appServiceUtility.updateAndMonitorAppSettings(updateApplicationSetting);
                    if (!isNewValueUpdated) {
                        yield this.kuduServiceUtility.warmpUp();
                    }
                    var jarFile = utility.getFileNameFromPath(webPackage);
                    webPackage = yield fileTransformationUtility_1.FileTransformUtility.applyTransformations(webPackage, appType + jarPath + jarFile, taskparameters_1.TaskParameters.getTaskParams().package.getPackageType());
                    this.zipDeploymentID = yield this.kuduServiceUtility.deployUsingZipDeploy(webPackage);
                    this.updateStatus = true;
                    break;
                case packageUtility_1.PackageType.folder:
                    let tempPackagePath = utility.generateTemporaryFolderOrZipPath(`${process.env.RUNNER_TEMPDIRECTORY}`, false);
                    webPackage = (yield zipUtility.archiveFolder(webPackage, "", tempPackagePath));
                    core.debug("Compressed folder into zip " + webPackage);
                case packageUtility_1.PackageType.zip:
                    core.debug("Initiated deployment via kudu service for webapp package : " + webPackage);
                    var addCustomApplicationSetting = parameterParserUtility_1.parse(runFromZipAppSetting);
                    var isNewValueUpdated = yield this.appServiceUtility.updateAndMonitorAppSettings(addCustomApplicationSetting);
                    if (!isNewValueUpdated) {
                        yield this.kuduServiceUtility.warmpUp();
                    }
                    yield this.kuduServiceUtility.deployUsingRunFromZip(webPackage, { slotName: this.appService.getSlot() });
                    this.updateStatus = false;
                    break;
                default:
                    throw new Error('Invalid App Service package or folder path provided: ' + webPackage);
            }
        });
    }
    UpdateDeploymentStatus(isDeploymentSuccess, updateStatus) {
        const _super = Object.create(null, {
            UpdateDeploymentStatus: { get: () => super.UpdateDeploymentStatus }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.kuduServiceUtility && this.zipDeploymentID && this.activeDeploymentID && isDeploymentSuccess) {
                yield this.kuduServiceUtility.postZipDeployOperation(this.zipDeploymentID, this.activeDeploymentID);
            }
            yield _super.UpdateDeploymentStatus.call(this, isDeploymentSuccess, this.updateStatus);
        });
    }
}
exports.WindowsWebAppDeploymentProvider = WindowsWebAppDeploymentProvider;
