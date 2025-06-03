import { EntityObject } from "../DataEntities/entityObjects.model";
import { User } from "../DataEntities/user.model";

export class ClientsConnections extends EntityObject {
    user: User;
    installationId: string;
    avatar?: string;
}