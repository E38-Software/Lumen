import { EntityRelation } from "./entityObjects.model";

export interface IEntity {
    get id(): string;
    get className(): string;
    set id(id: string);
    set className(id: string);
    set(attributeName: string, attributeValue: any): any;
}

export interface IFile {

}

export class typeAvailable {
    string: string;
    number: number;
    boolean: boolean;
    Date: Date;
    Object: Object;
    EntityRelation: EntityRelation;
    unknown: never;
}

export interface PropertyTypesRegistry {
    [className: string]: Record<string, string>;
}

export const propertyTypesRegistry: PropertyTypesRegistry = {};
export const propertyDislayNamesRegistry: PropertyTypesRegistry = {};
const classDisplayNamesRegistry: { [key: string]: string } = {};


export function DataType(type: keyof typeAvailable, isArray: boolean = false) {
    return function (target: any, key: string) {
        const className = target.constructor.name;

        if (!propertyTypesRegistry[className]) {
            propertyTypesRegistry[className] = {};
        }
        if (!isArray)
            propertyTypesRegistry[className][key] = type;
        else
            propertyTypesRegistry[className][key] = "Array_" + type;
    };
}

export function getDataType<T extends Object>(instance: T, property: keyof T): keyof typeAvailable {
    let prototype = Object.getPrototypeOf(instance);
    let className = prototype.constructor.name;

    while (prototype && (!propertyTypesRegistry[className] || !propertyTypesRegistry[className][property as string])) {
        prototype = Object.getPrototypeOf(prototype);
        className = prototype ? prototype.constructor.name : null;
    }

    if (!className) {
        console.warn(`No data type found for property '${property as string}'`);
        return "unknown";
    }

    const value = propertyTypesRegistry[className][property as string];

    if (value.startsWith("Array_"))
        // remove Array_ from the string
        return value.substring(6) as keyof typeAvailable;

    return value as keyof typeAvailable;
}

export function isArray<T extends Object>(instance: T, property: keyof T): boolean {
    let prototype = Object.getPrototypeOf(instance);
    let className = prototype.constructor.name;

    while (prototype && (!propertyTypesRegistry[className] || !propertyTypesRegistry[className][property as string])) {
        prototype = Object.getPrototypeOf(prototype);
        className = prototype ? prototype.constructor.name : null;
    }

    if (!className)
        throw new Error(`No data type found for property '${property as string}'`);

    return propertyTypesRegistry[className][property as string].startsWith("Array_");
}

export function DisplayName(displayName: string) {
    return function (target: any, key: string) {
        const className = target.constructor.name;

        if (!propertyDislayNamesRegistry[className]) {
            propertyDislayNamesRegistry[className] = {};
        }
        propertyDislayNamesRegistry[className][key] = displayName;
    };
}

export function getDisplayName<T extends Object>(instance: T, property: keyof T): string {
    let prototype = Object.getPrototypeOf(instance);
    let className = prototype.constructor.name;

    while (prototype && (!propertyDislayNamesRegistry[className] || !propertyDislayNamesRegistry[className][property as string])) {
        prototype = Object.getPrototypeOf(prototype);
        className = prototype ? prototype.constructor.name : null;
    }
    if (!className) {
        console.warn(`No display name found for property '${property as string}'`);
        return property as string;
    }
    return propertyDislayNamesRegistry[className][property as string];
}

export function ClassDisplayName(displayName: string) {
    return function (target: Function) {
        const className = target.name;
        classDisplayNamesRegistry[className] = displayName;
    };
}

export function getClassDisplayName<T extends Object>(instance: T): string | undefined {
    let prototype = Object.getPrototypeOf(instance);
    let className = prototype.constructor.name;

    while (prototype && !classDisplayNamesRegistry[className]) {
        prototype = Object.getPrototypeOf(prototype);
        className = prototype ? prototype.constructor.name : null;
    }

    if (!className) {
        console.warn(`No display name found for class '${className}'`);
        return undefined;
    }
    return classDisplayNamesRegistry[className];
}