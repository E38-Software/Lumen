import { EntityObject } from "./DataEntities/entityObjects.model";
import { User } from "./DataEntities/user.model";
import { Video } from "./video.model";

export class userVideo extends EntityObject {
    video?: Video;
    deadline?: Date;
    userPointer?: User;
    timeLastQuiz?: number;

    constructor(
        video?: Video,
        deadline?: Date,
        userPointer?: User,
        timeLastQuiz?: number
    ) {
        super();
        this.video = video;
        this.deadline = deadline;
        this.userPointer = userPointer;
        this.timeLastQuiz = timeLastQuiz;
    }

}