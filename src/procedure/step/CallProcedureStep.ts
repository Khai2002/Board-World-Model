import type Step from "../StepFactory";
import type { ProcedureIdentifier } from "../../utils/json";

export default class CallProcedureStep implements Step {
    discriminator: string;
    actionType: number;
    comment: string;
    detail: string;
    name: string;
    id: string;
    databaseName: string;
    procedureToExecute: ProcedureIdentifier;

    constructor(discriminator: string, actionType: number, comment: string, detail: string, name: string, id: string, databaseName: string, procedureToExecute: ProcedureIdentifier) {
        this.discriminator = discriminator
        this.actionType = actionType
        this.comment = comment
        this.detail = detail
        this.name = name
        this.id = id
        this.databaseName = databaseName
        this.procedureToExecute = procedureToExecute
    }    

}