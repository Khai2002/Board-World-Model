import type Step from "../StepFactory";
import type { ProcedureIdentifier, ProcedureEntry, ProcedureRegistry } from "../ProcedureRegistry";
import Procedure from "../Procedure";

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

    getProcedureToExecute(registry: ProcedureRegistry): ProcedureEntry {
        const procedure = registry.get(this.procedureToExecute)
        if(!procedure) throw new Error(`Procedure ${this.procedureToExecute.name} does not exist in ${this.procedureToExecute.defaultDatabase} database`)
        return procedure
    }

    getFullProcedure(registry: ProcedureRegistry): Procedure {
        const procedure = this.getProcedureToExecute(registry)
        if (procedure.kind === "placeholder") {
            throw new Error(`Procedure ${procedure.name} has not been loaded`)
        }
        return procedure
    }
}