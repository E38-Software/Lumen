import { EntityObject } from "./DataEntities/entityObjects.model";
import { DataType, DisplayName } from "./DataEntities/entity.interface";

export class License extends EntityObject {
    @DisplayName("Token")
    @DataType("number")
    token: number;
    
    @DisplayName("Type")
    @DataType("string")
    type: string;
    
    @DisplayName("Deadline")
    @DataType("Date")
    deadline: Date;
    
    constructor(token: number, type: string, deadline: Date) {
        super();
        this.token = token;
        this.type = type;
        this.deadline = deadline;
    }
}
