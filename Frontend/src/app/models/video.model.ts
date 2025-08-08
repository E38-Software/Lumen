import { EntityObject } from "./DataEntities/entityObjects.model";

export class Video extends EntityObject {
    thumbnailUrl?: string;
    videoUrl?: string;
    title?: string;

    constructor(
        title?: string,
        videoUrl?: string,
        thumbnailUrl?: string
    ) {
        super();
        this.title = title;
        this.videoUrl = videoUrl;
        this.thumbnailUrl = thumbnailUrl;
    }
}