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
const AzureResourceFilterUtility_1 = require("./common/RestUtilities/AzureResourceFilterUtility");
const AuthorizationHandlerFactory_1 = require("./common/AuthorizationHandlerFactory");
const packageUtility_1 = require("./common/Utilities/packageUtility");
const fs = require("fs");
class TaskParameters {
    constructor() {
        this._appName = core.getInput('app-name', { required: true });
        this._images = core.getInput('images');
        this._multiContainerConfigFile = core.getInput('configuration-file');
        this._containerCommand = core.getInput('container-command');
        this._endpoint = AuthorizationHandlerFactory_1.getHandler();
        this.checkContainerType();
    }
    static getTaskParams() {
        if (!this.taskparams) {
            this.taskparams = new TaskParameters();
        }
        return this.taskparams;
    }
    get appName() {
        return this._appName;
    }
    get images() {
        return this._images;
    }
    get resourceGroupName() {
        return this._resourceGroupName;
    }
    get endpoint() {
        return this._endpoint;
    }
    get isLinux() {
        return this._isLinux;
    }
    get isMultiContainer() {
        return this._isMultiContainer;
    }
    get containerCommand() {
        return this._containerCommand;
    }
    get multiContainerConfigFile() {
        return this._multiContainerConfigFile;
    }
    getResourceDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            let appDetails = yield AzureResourceFilterUtility_1.AzureResourceFilterUtility.getAppDetails(this.endpoint, this.appName);
            this._resourceGroupName = appDetails["resourceGroupName"];
            this._kind = appDetails["kind"];
            this._isLinux = this._kind.indexOf('linux') >= 0;
        });
    }
    checkContainerType() {
        let images = this._images.split("\n");
        this._isMultiContainer = false;
        if (!!this._multiContainerConfigFile && packageUtility_1.exist(this._multiContainerConfigFile)) {
            let stats = fs.statSync(this._multiContainerConfigFile);
            if (!stats.isFile()) {
                throw new Error("Docker-compose file path is incorrect.");
            }
            else {
                this._isMultiContainer = true;
                core.debug("Is multi-container app");
            }
            if (!!this._images) {
                console.log("Multi-container deployment with the transformation of Docker-Compose file.");
            }
            else {
                console.log("Multi-container deployment without transformation of Docker-Compose file.");
            }
        }
        else if (images.length > 1) {
            throw new Error("Multiple images indicate multi-container deployment type, but Docker-compose file is absent.");
        }
    }
}
exports.TaskParameters = TaskParameters;
