import { EntityObject } from "./DataEntities/entityObjects.model";
import { DataType, DisplayName } from "./DataEntities/entity.interface";
import { User } from "./DataEntities/user.model";
import { Video } from "./video.model";

export class Certificate extends EntityObject {
    @DisplayName("Title")
    @DataType("string")
    title?: string;

    videoPointer?: Video;
    userPointer?: User;

    constructor(
        title?: string,
        videoPointer?: Video,
        userPointer?: User
    ) {
        super();
        this.title = title;
        this.videoPointer = videoPointer;
        this.userPointer = userPointer;
    }
}
