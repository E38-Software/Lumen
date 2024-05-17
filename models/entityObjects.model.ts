import { Classnames } from "../common/classnames.model";
import { User } from "../services/users.service";
import { IEntity, IFile } from "./entity.interface";

export class EntityObject {
    // create a getter for id
    // public get id(): string {
    //     return this.entity.id;
    // }
    public entity: IEntity;
    /**
     * @deprecated, use the inerithed one from the entity
     */
    public classname: string;
    // public entityProperties: string[];
    // public entityArrayProperties: string[]
    public updatedBy?: User;
    public createdBy?: User;
    public updatedAt?: Date;
    public createdAt?: Date;
}

export class EntityFile {
    public entity: IFile;
    public url: string;
    public name: string;
    public fileName: string;
}

export class EntityRelation {
    childClass: keyof Classnames;
    parentClass: keyof Classnames;

    //add a constructor
    constructor(childClass: keyof Classnames, parentClass: keyof Classnames) {
        this.childClass = childClass;
        this.parentClass = parentClass;
    }
}