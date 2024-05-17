import { EntityFile, EntityObject } from "./entityObjects.model";

export class Document extends EntityObject {
    public relatedFile: EntityFile;
    /**
     * @deprecated è stato utilizzato per errore nell'import dei file... e sostituire con relatedFIle prima o poi
     */
    public file: EntityFile;
    public description: string;
    public name: string;
    public type: string;
    public subtype: string;
    public template: boolean;
    public html: string;
}
