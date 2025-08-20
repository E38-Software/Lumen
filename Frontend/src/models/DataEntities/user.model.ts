import { Customer } from "../customer.model";
import { DataType, DisplayName, IEntity } from "./entity.interface";
import { EntityFile } from "./entityObjects.model";
import * as Parse from 'parse';

export class User extends Parse.User {
    @DataType("string")
    @DisplayName("Nome Utente")
    username?: string | null;
    email?: string | null;
    password?: string;
    role?: string;
    entity?: IEntity;
    profilePicture?: EntityFile;
    disabled?: boolean;
    customer?: Customer;
    personalSettings?: any;
}