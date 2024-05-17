import { Injectable } from "@angular/core";
import { Classnames } from "../common/classnames.model";
import { Document } from "../models/document.model";
import { ParseDataService } from "./data.service";
import Parse from 'parse';
import { BehaviorSubject } from "rxjs";


@Injectable({
    providedIn: 'root'
})
export class DocumentService extends ParseDataService<Document>
{
    constructor() {
        super(Classnames.Document);
        this.startLiveQuery = false;
    }
}
