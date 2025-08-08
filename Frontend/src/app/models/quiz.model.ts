import { EntityObject } from "./DataEntities/entityObjects.model";

export class Quiz extends EntityObject {
    answer?: Array<{ description: string; true_ans: boolean; motivation: string }>;
    question?: string;
    timeLimit?: number;

    constructor(
        question?: string, 
        answer?: Array<{ description: string; true_ans: boolean; motivation: string }>,
        timeLimit?: number
    ) {
        super();
        this.question = question;
        this.answer = answer;
        this.timeLimit = timeLimit;
    }
}