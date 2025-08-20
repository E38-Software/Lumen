import { EntityObject } from "./DataEntities/entityObjects.model";

export class Customer extends EntityObject {
    companyName: string;
    address?: string;
    referenceName?: string;
    email?: string;
    referencePhoneNumber?: string;
    constructor(companyName: string) {
        super();
        this.companyName = companyName;
    }
}