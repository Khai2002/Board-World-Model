import type { StepJSON } from "../utils/json"
import CallProcedureStep from "./step/CallProcedureStep"

export default interface Step {
    discriminator: string,
    actionType: number,
    comment: string,
    detail: string,
    name: string,
    id: string,
    databaseName: string,
}

export default class StepFactory {
    static fromJSON(data: StepJSON): Step {
        switch (data.discriminator) {
            case "CallProcedureActionDto":
                if (!data.procedureToExecute) {
                    throw new Error(
                        "CallProcedureStep is missing procedureToExecute"
                    )
                }

                return new CallProcedureStep(
                    data.discriminator,
                    data.actionType,
                    data.comment,
                    data.detail,
                    data.name,
                    data.id,
                    data.databaseName,
                    data.procedureToExecute
                )

            default:
                return data
        }
    }
}