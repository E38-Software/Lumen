import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import * as Parse from 'parse';
import { Buffer } from 'buffer';
import { EntityFile } from "../models/entityObjects.model";
import { Document } from "../models/document.model";

export interface FileService {
    upload(name: string, data: { base64: string } | number[] | File, type: string): Promise<any>;
    delete(file: EntityFile): Promise<any>;
}

@Injectable({
    providedIn: 'root'
})
export class ParseFileService implements FileService {

    constructor(private _httpService: HttpClient) {

    }

    fileToUpload: Parse.File | undefined;

    async upload(name: string, data: number[] | { base64: string; } | File, type?: string): Promise<EntityFile> {
        
        let newFile: EntityFile = new EntityFile();
        let parts = name.split('.');
        let extension = parts.pop();
        let filename = parts.join('_');
        let parseFile = new Parse.File(`${filename}.${extension}`.replace(/[^a-zA-Z0-9.]/g, '_'), data, type);
        // let parseFile = new Parse.File(name.replace(/[^a-zA-Z0-9.]/g, '_'), data, type);
        parseFile = await parseFile.save();
        // remove from file name the special characters
        newFile.name = name;
        // newFile.data = data;
        newFile.url = parseFile._url;
        newFile.entity = parseFile;
        return newFile;
    }

    async download(file: Document): Promise<any> {
        
        let parseFile;
        if (file.relatedFile) {
            parseFile = file.relatedFile;
        } else if (file.file) {
            parseFile = file.file;
        }
        if (!parseFile) {
            throw new Error("File not found");
        }
        let data = await (parseFile.entity as Parse.File).getData();
        const binaryString: string = Buffer.from(data, 'base64').toString('binary');
        const binaryData: Uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            binaryData[i] = binaryString.charCodeAt(i);
        }
        const blob: Blob = new Blob([binaryData], { type: 'application/octet-stream' });
        const url: string = URL.createObjectURL(blob);
        const link: HTMLAnchorElement = document.createElement('a');
        link.href = url;
        if (file.name) {
            link.download = file.name;
        }
        if (file.file) {
            if (!link.download) {
                // tkae the full file.name after the first '_' (the name of the file is the name of the document)
                let fileName = file.file.name.split('_');
                fileName.splice(0, 1);
                link.download = fileName.join('_');
            }
            // if link.download doesn't have extension
            if (!link.download.includes('.')) {
                link.download = link.download + '.' + (file.file.entity as Parse.File).name().split('.').pop();
            }
        }
        else if (file.relatedFile) {
            if (!link.download) {
                // tkae the full file.name after the first '_' (the name of the file is the name of the document)
                let fileName = file.relatedFile.name.split('_');
                fileName.splice(0, 1);
                link.download = fileName.join('_');
            }
            if (!link.download.includes('.')) {
                link.download = link.download + '.' + (file.relatedFile.entity as Parse.File).name().split('.').pop();
            }
        }
        else {
            if (!link.download) {
                link.download = "file";
            }
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    delete(file: EntityFile): Promise<any> {
        throw new Error("Method not implemented.");
    }

}