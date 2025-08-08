import { EntityObject } from "./DataEntities/entityObjects.model";
import { User } from "./DataEntities/user.model";
import { Customer } from "./customers.model";

export class Role extends EntityObject {
    name: string = ""; //Controlla
    users: User[] = [];
    roles: Role[] = [];
    relatedCustomer?: Customer;
}
