import { EntityObject } from "./DataEntities/entityObjects.model";
import { DataType, DisplayName } from "./DataEntities/entity.interface";
import { Video } from "./video.model";

export class LearningPath extends EntityObject {
    @DisplayName("Title")
    @DataType("string")
    title?: string;
    
    @DisplayName("Description")
    @DataType("string")
    description?: string;
    @DisplayName("Videos")
    @DataType("Object")
    videos?: Record<number, Video>;
    
    constructor(
        title?: string,
        description?: string,
        videos?: Record<number, Video>
    ) {
        super();
        this.title = title;
        this.description = description;
        this.videos = videos;
    }
}
