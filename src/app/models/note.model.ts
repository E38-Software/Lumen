import { EntityObject } from "./DataEntities/entityObjects.model";


export class Note extends EntityObject {
    public draft?: boolean = false; //true when is a draft (=bozza)
    public description?: string = "";
    public title: string = "";
    public status?: string;
}
