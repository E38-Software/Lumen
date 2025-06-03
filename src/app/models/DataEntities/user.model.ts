import { DataType, DisplayName, IEntity } from "./entity.interface";
import { EntityFile } from "./entityObjects.model";
import { PersonalSettings } from '../personal-settings';
import * as Parse from 'parse';

export class User extends Parse.User {
    @DataType("string")
    @DisplayName("Nome Utente")
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    entity: IEntity;
    profilePicture: EntityFile;
    personalSettings: PersonalSettings;
    disabled: boolean;
}