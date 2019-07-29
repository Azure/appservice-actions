import fs = require('fs');
import utility = require('./utility');
import zipUtility = require('./ziputility.js');

export enum PackageType {
    war,
    zip,
    jar,
    folder
}

export class PackageUtility {
    public static getPackagePath(packagePath: string): string {
        var availablePackages: string[] = utility.findfiles(packagePath);
        if(availablePackages.length == 0) {
            throw new Error('No package found with specified pattern: ' + packagePath);
        }

        if(availablePackages.length > 1) {
            throw new Error('More than one package matched with specified pattern: ' + packagePath + '. Please restrain the search pattern.');
        }

        return availablePackages[0];
    }
}

export class Package {
    constructor(packagePath: string) {
        this._path = PackageUtility.getPackagePath(packagePath);
        this._isMSBuildPackage = undefined;
    }

    public getPath(): string {
        return this._path;
    }

    public async isMSBuildPackage(): Promise<boolean> {
        if(this._isMSBuildPackage == undefined) {
            this._isMSBuildPackage = this.getPackageType() != PackageType.folder && await zipUtility.checkIfFilesExistsInZip(this._path, ["parameters.xml", "systeminfo.xml"]);
            console.log("Is the package an msdeploy package : " + this._isMSBuildPackage);
        }
        return this._isMSBuildPackage;
    }

    public getPackageType(): PackageType {
        if (this._packageType == undefined) {
            if (!exist(this._path)) {
                throw new Error('Invalidwebapppackageorfolderpathprovided' + this._path);
            } else{
                if (this._path.toLowerCase().endsWith('.war')) {
                    this._packageType = PackageType.war;
                    console.log("This is war package ");
                } else if(this._path.toLowerCase().endsWith('.jar')){
                    this._packageType = PackageType.jar;
                    console.log("This is jar package ");
                } else if (this._path.toLowerCase().endsWith('.zip')){
                    this._packageType = PackageType.zip;
                    console.log("This is zip package ");
                } else if(fs.statSync(this._path).isDirectory()){
                    this._packageType = PackageType.folder;
                    console.log("This is folder package ");
                } else{
                    throw new Error('Invalidwebapppackageorfolderpathprovided' + this._path);
                }
            }
        }
        return this._packageType;
    }
    
    private _path: string;
    private _isMSBuildPackage?: boolean;
    private _packageType?: PackageType;
}

export function exist(path) {
    var exist = false;
    try {
        exist = path && fs.statSync(path) != null;
    }
    catch (err) {
        if (err && err.code === 'ENOENT') {
            exist = false;
        }
        else {
            throw err;
        }
    }
    return exist;
}