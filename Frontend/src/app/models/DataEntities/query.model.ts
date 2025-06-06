import { EntityObjectDefinition } from "../../common/classnames.model";
import { EntityObject } from "./entityObjects.model";

class Where <T extends EntityObject> {
    field?: keyof T;
    operator?: Condition;
    value: any;
}

class Conditions {
    equal?: string;
    notEqual?: string;
    greaterThan?: string;
    greaterThanOrEqual?: string;
    lessThan?: string;
    lessThanOrEqual?: string;
    exists?: string;
    doesNotExist?: string;
    equalToOn?: string;
    notEqualToOn?: string;
    equalToFrom?: string;
    notEqualToFrom?: string;
}

// let's create a new type whose actual type is keyof Conditions
export type Condition = keyof Conditions;

export class IQuery<T extends EntityObject> {
    private classReference: EntityObjectDefinition<T>;
    private where: Where<T>[];
    constructor(classReference: EntityObjectDefinition<T>) {
        this.classReference = classReference;
        this.where = [];
    }
    public compareDifferentClassQuery<T2 extends EntityObject>(query: IQuery<T2>, equal: boolean, fetchon: boolean): void {
        if(this.classReference.classname == query.classReference.classname)
            throw new Error("Cannot compare queries with same class");
        let condition: Condition;
        if(fetchon && !equal)
            condition = "notEqualToOn";
        else if(fetchon && equal)
            condition = "equalToOn";
        else if(!fetchon && !equal)
            condition = "notEqualToFrom";
        else if(!fetchon && equal)
            condition = "equalToFrom";

        const where: Where<T> = new Where<T>();
        where.operator = condition!;
        where.value = query;

        this.where.push(where);
    }
    public equalTo(field: keyof T, value: any): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "equal";
        where.value = value;

        this.where.push(where);
    }
    public notEqualTo(field: keyof T, value: any): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "notEqual";
        where.value = value;

        this.where.push(where);
    }
    public greaterThan(field: keyof T, value: any): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "greaterThan";
        where.value = value;

        this.where.push(where);
    }
    public greaterThanOrEqual(field: keyof T, value: any): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "greaterThanOrEqual";
        where.value = value;

        this.where.push(where);
    }
    public lessThan(field: keyof T, value: any): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "lessThan";
        where.value = value;

        this.where.push(where);
    }
    public lessThanOrEqual(field: keyof T, value: any): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "lessThanOrEqual";
        where.value = value;

        this.where.push(where);
    }
    public exists(field: keyof T): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "exists";
        where.value = null;

        this.where.push(where);
    }
    public doesNotExist(field: keyof T): void {
        const where: Where<T> = new Where<T>();
        where.field = field;
        where.operator = "doesNotExist";
        where.value = null;

        this.where.push(where);
    }
}