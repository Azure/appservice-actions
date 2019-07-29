import path = require('path');
import { PackageType, exist } from './packageUtility';
import { cp, find, mkdirP, match } from './utilityHelperFunctions';
import zipUtility = require('./ziputility');
import * as os from "os";
import * as fs from "fs";

export function findfiles(filepath){

    console.log("Finding files matching input: " + filepath);

    var filesList : string [];
    if (filepath.indexOf('*') == -1 && filepath.indexOf('?') == -1) {

        // No pattern found, check literal path to a single file
        if(exist(filepath)) {
            filesList = [filepath];
        }
        else {
            console.log('No matching files were found with search pattern: ' + filepath);
            return [];
        }
    } else {
        var firstWildcardIndex = function(str) {
            var idx = str.indexOf('*');

            var idxOfWildcard = str.indexOf('?');
            if (idxOfWildcard > -1) {
                return (idx > -1) ?
                    Math.min(idx, idxOfWildcard) : idxOfWildcard;
            }

            return idx;
        }

        // Find app files matching the specified pattern
        console.log('Matching glob pattern: ' + filepath);

        // First find the most complete path without any matching patterns
        var idx = firstWildcardIndex(filepath);
        console.log('Index of first wildcard: ' + idx);
        var slicedPath = filepath.slice(0, idx);
        var findPathRoot = path.dirname(slicedPath);
        if(slicedPath.endsWith("\\") || slicedPath.endsWith("/")){
            findPathRoot = slicedPath;
        }

        console.log('find root dir: ' + findPathRoot);

        // Now we get a list of all files under this root
        var allFiles = find(findPathRoot);

        // Now matching the pattern against all files
        filesList = match(allFiles, filepath, '', {matchBase: true, nocase: !!os.type().match(/^Win/) });

        // Fail if no matching files were found
        if (!filesList || filesList.length == 0) {
            console.log('No matching files were found with search pattern: ' + filepath);
            return [];
        }
    }
    return filesList;
}

export function generateTemporaryFolderOrZipPath(folderPath: string, isFolder: boolean) {
    var randomString = Math.random().toString().split('.')[1];
    var tempPath = path.join(folderPath, 'temp_web_package_' + randomString +  (isFolder ? "" : ".zip"));
    if(exist(tempPath)) {
        return generateTemporaryFolderOrZipPath(folderPath, isFolder);
    }
    return tempPath;
}

export function copyDirectory(sourceDirectory: string, destDirectory: string) {
    if(!exist(destDirectory)) {
        mkdirP(destDirectory);
    }
    var listSrcDirectory = find(sourceDirectory);
    for(var srcDirPath of listSrcDirectory) {
        var relativePath = srcDirPath.substring(sourceDirectory.length);
        var destinationPath = path.join(destDirectory, relativePath);
        if(fs.statSync(srcDirPath).isDirectory()) {
            mkdirP(destinationPath);
        }
        else {
            if(!exist(path.dirname(destinationPath))) {
                mkdirP(path.dirname(destinationPath));
            }
            console.log('copy file from: ' + srcDirPath + ' to: ' + destinationPath);
            cp(srcDirPath, destinationPath, '-f', false);
        }
    }
}

export async function generateTemporaryFolderForDeployment(isFolderBasedDeployment: boolean, webDeployPkg: string, packageType: PackageType) {  
    var folderName = `${process.env.RUNNER_TEMPDIRECTORY}`;
    var folderPath = generateTemporaryFolderOrZipPath(folderName, true);
    if(isFolderBasedDeployment || packageType === PackageType.jar) {
        console.log('Copying Web Packge: ' + webDeployPkg + ' to temporary location: ' + folderPath);
        copyDirectory(webDeployPkg, folderPath);
        if(packageType === PackageType.jar && this.getFileNameFromPath(webDeployPkg, ".jar") != "app") {
            let src = path.join(folderPath, getFileNameFromPath(webDeployPkg));
            let dest = path.join(folderPath, "app.jar")
            console.log("Renaming " + src + " to " + dest);
            fs.renameSync(src, dest);
        }
        
        console.log('Copied Web Package: ' + webDeployPkg + ' to temporary location: ' + folderPath + ' successfully.');
    }
    else {
        await zipUtility.unzip(webDeployPkg, folderPath);
    }
    return folderPath;
}

export async function archiveFolderForDeployment(isFolderBasedDeployment: boolean, folderPath: string) {
    var webDeployPkg;

    if(isFolderBasedDeployment) {
        webDeployPkg = folderPath;
    }
    else {
        var tempWebPackageZip = generateTemporaryFolderOrZipPath(`${process.env.RUNNER_WORKFOLDER}`, false);
        webDeployPkg = await zipUtility.archiveFolder(folderPath, "", tempWebPackageZip);
    }

    return {
        "webDeployPkg": webDeployPkg,
        "tempPackagePath": webDeployPkg
    };
}

export function getFileNameFromPath(filePath: string, extension?: string): string {
    var isWindows = os.type().match(/^Win/);
    var fileName;
    if(isWindows) {
        fileName = path.win32.basename(filePath, extension);
    }
    else {
        fileName = path.posix.basename(filePath, extension);
    }

    return fileName;
}

export function getTempDirectory(): string {
    return `${process.env.RUNNER_TEMPDIRECTORY}` || os.tmpdir();
}