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
const azure_arm_appinsights_1 = require("../ArmRest/azure-arm-appinsights");
const core = __importStar(require("@actions/core"));
var uuidV4 = require("uuid/v4");
function addAnnotation(endpoint, azureAppService, isDeploymentSuccess) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var appSettings = yield azureAppService.getApplicationSettings();
            var instrumentationKey = appSettings && appSettings.properties && appSettings.properties.APPINSIGHTS_INSTRUMENTATIONKEY;
            if (instrumentationKey) {
                let appinsightsResources = new azure_arm_appinsights_1.ApplicationInsightsResources(endpoint);
                var appInsightsResources = yield appinsightsResources.list(null, [`$filter=InstrumentationKey eq '${instrumentationKey}'`]);
                if (appInsightsResources.length > 0) {
                    var appInsights = new azure_arm_appinsights_1.AzureApplicationInsights(endpoint, appInsightsResources[0].id.split('/')[4], appInsightsResources[0].name);
                    var releaseAnnotationData = getReleaseAnnotation(isDeploymentSuccess);
                    yield appInsights.addReleaseAnnotation(releaseAnnotationData);
                    console.log("Successfully added release annotation to the Application Insight :" + appInsightsResources[0].name);
                }
                else {
                    core.debug(`Unable to find Application Insights resource with Instrumentation key ${instrumentationKey}. Skipping adding release annotation.`);
                }
            }
            else {
                core.debug(`Application Insights is not configured for the App Service. Skipping adding release annotation.`);
            }
        }
        catch (error) {
            error.exception = "FailedAddingReleaseAnnotation";
            throw error;
        }
    });
}
exports.addAnnotation = addAnnotation;
function getReleaseAnnotation(isDeploymentSuccess) {
    let releaseAnnotationProperties = {
        "Label": isDeploymentSuccess ? "Success" : "Error",
        "Deployment Uri": `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${process.env.GITHUB_SHA}/checks`
    };
    let releaseAnnotation = {
        "AnnotationName": "GitHUb Annotation",
        "Category": "Text",
        "EventTime": new Date(),
        "Id": uuidV4(),
        "Properties": JSON.stringify(releaseAnnotationProperties)
    };
    return releaseAnnotation;
}
