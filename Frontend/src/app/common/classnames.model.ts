import { Document } from "../models/document.model";
import { EntityObject } from "../models/DataEntities/entityObjects.model";
import { Note } from "../models/note.model";
import { ClientsConnections } from "../models/ActivityMonitoring/clientsConnections.model";
import { Role } from "../models/role.model";

export class EntityObjectDefinition<T extends EntityObject> {
    public classname: string;
    public type: { new(): T };
    constructor(classname: string, type: { new(): T }) {
        this.classname = classname;
        this.type = type;
    }
}

export class Classnames {

    /**
     * Default ones
     */
    public static _Role: EntityObjectDefinition<Role> = new EntityObjectDefinition<Role>("_Role", Role);
    public static _User: string = "_User";
    public static File: string = "_File";
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    public static Document: EntityObjectDefinition<Document> = new EntityObjectDefinition<Document>("Document", Document);
    public static Note: EntityObjectDefinition<Note> = new EntityObjectDefinition<Note>("Note", Note);
    public static ClientsConnections: EntityObjectDefinition<ClientsConnections> = new EntityObjectDefinition<ClientsConnections>("ClientsConnections", ClientsConnections);
}