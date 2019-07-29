import * as core from '@actions/core';
import { parse } from './parameterParserUtility';
import { PackageType, exist } from './packageUtility';
import fs = require('fs');
import path = require('path');
import util = require('util');
var deployUtility = require('./utility');

export class FileTransformUtility {

    private static rootDirectoryPath: string = "D:\\home\\site\\wwwroot";

    public static async applyTransformations(webPackage: string, parameters: string, packageType: PackageType): Promise<string> {
        core.debug("WebConfigParameters is "+ parameters);
        if (parameters) {
            var folderPath = await deployUtility.generateTemporaryFolderForDeployment(false, webPackage, packageType);
            if (parameters) {
                core.debug('parsing web.config parameters');
                var webConfigParameters = parse(parameters);
                addWebConfigFile(folderPath, webConfigParameters, this.rootDirectoryPath);
            }

            var output = await deployUtility.archiveFolderForDeployment(false, folderPath);
            webPackage = output.webDeployPkg;
        }
        else {
            core.debug('File Tranformation not enabled');
        }

        return webPackage;
    }
}

function addWebConfigFile(folderPath: any, webConfigParameters, rootDirectoryPath: string) {
    //Generate the web.config file if it does not already exist.
    var webConfigPath = path.join(folderPath, "web.config");
    if (!exist(webConfigPath)) {
        try {
            // Create web.config
            var appType: string = webConfigParameters['appType'].value;
            core.debug('Generating Web.config file for App type: ' + appType);
            delete webConfigParameters['appType'];

            var selectedAppTypeParams = addMissingParametersValue(appType, webConfigParameters);
            if(appType == 'java_springboot') {
                if (util.isNullOrUndefined(webConfigParameters['JAR_PATH'])
                || util.isNullOrUndefined(webConfigParameters['JAR_PATH'].value) 
                || webConfigParameters['JAR_PATH'].value.length <= 0) {
                    throw Error('Java jar path is not present');
                }
                selectedAppTypeParams['JAR_PATH'] = rootDirectoryPath + "\\" + webConfigParameters['JAR_PATH'].value;
            }

            generateWebConfigFile(webConfigPath, appType, selectedAppTypeParams);
            console.log("Successfully generated web.config file");
        }
        catch (error) {
            throw new Error("Failed to generate web.config. " + error);
        }
    }
    else {
        console.log("web.config file already exists. Not generating.");
    }
}

function addMissingParametersValue(appType: string, webConfigParameters) {
    var paramDefaultValue = {
        'java_springboot': {
            'JAVA_PATH' : '%JAVA_HOME%\\bin\\java.exe',
            'JAR_PATH' : '',
            'ADDITIONAL_DEPLOYMENT_OPTIONS' : ''
        }
    };
    var selectedAppTypeParams = paramDefaultValue[appType];
    var resultAppTypeParams = {};
    for(var paramAtttribute in selectedAppTypeParams) {
        if(webConfigParameters[paramAtttribute]) {
            core.debug("param Attribute'" + paramAtttribute + "' values provided as: " + webConfigParameters[paramAtttribute].value);
            resultAppTypeParams[paramAtttribute] = webConfigParameters[paramAtttribute].value;
        }
        else {
            core.debug("param Attribute '" + paramAtttribute + "' is not provided. Overriding the value with '" + selectedAppTypeParams[paramAtttribute]+ "'");
            resultAppTypeParams[paramAtttribute] = selectedAppTypeParams[paramAtttribute];
        }
    }
    return resultAppTypeParams;
}

function generateWebConfigFile(webConfigTargetPath: string, appType: string, substitutionParameters: any) {
    // Get the template path for the given appType
    var webConfigTemplatePath = path.join(__dirname, './WebConfigTemplates', appType.toLowerCase());
    var webConfigContent: string = fs.readFileSync(webConfigTemplatePath, 'utf8');
    webConfigContent = replaceMultiple(webConfigContent, substitutionParameters);
    fs.writeFileSync(webConfigTargetPath, webConfigContent, { encoding: "utf8" });
}

function replaceMultiple(text: string, substitutions: any): string {
    for(var key in substitutions) {
        core.debug('Replacing: ' + '{' + key + '} with: ' + substitutions[key]);
        text = text.replace(new RegExp('{' + key + '}', 'g'), substitutions[key]);
    }
    return text;
}