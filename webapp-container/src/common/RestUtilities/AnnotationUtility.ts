import { IAuthorizationHandler } from "../ArmRest/IAuthorizationHandler";
import { AzureAppService } from "../ArmRest/azure-app-service";
import { ApplicationInsightsResources, AzureApplicationInsights } from "../ArmRest/azure-arm-appinsights";
import * as core from '@actions/core';
var uuidV4 = require("uuid/v4");

export async function addAnnotation(endpoint: IAuthorizationHandler, azureAppService: AzureAppService, isDeploymentSuccess: boolean): Promise<void> {
    try {
        var appSettings = await azureAppService.getApplicationSettings();
        var instrumentationKey = appSettings && appSettings.properties && appSettings.properties.APPINSIGHTS_INSTRUMENTATIONKEY;
        if(instrumentationKey) {
            let appinsightsResources: ApplicationInsightsResources = new ApplicationInsightsResources(endpoint);
            var appInsightsResources = await appinsightsResources.list(null, [`$filter=InstrumentationKey eq '${instrumentationKey}'`]);
            if(appInsightsResources.length > 0) {
                var appInsights: AzureApplicationInsights = new AzureApplicationInsights(endpoint, appInsightsResources[0].id.split('/')[4], appInsightsResources[0].name);
                var releaseAnnotationData = getReleaseAnnotation(isDeploymentSuccess);
                await appInsights.addReleaseAnnotation(releaseAnnotationData);
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
    catch(error) {
        error.exception = "FailedAddingReleaseAnnotation";
        throw error;
    }
}

function getReleaseAnnotation(isDeploymentSuccess: boolean): {[key: string]: any} { 
    let releaseAnnotationProperties = {
        "Label": isDeploymentSuccess ? "Success" : "Error", // Label decides the icon for annotation
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