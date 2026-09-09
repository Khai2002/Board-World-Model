import type { StepJSON } from "../utils/json"
import CallProcedureStep from "./step/CallProcedureStep"
import DataflowStep, { isDataflowLayouts } from "./step/DataflowStep"

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

            case "DataFlowActionDto":
                if (!isDataflowLayouts(data.layouts) || !data.expression || !data.targetLetter) {
                    throw new Error(
                        "DataflowStep is missing a valid layout"
                    )
                }

                return new DataflowStep(
                    data.discriminator,
                    data.actionType,
                    data.comment,
                    data.detail,
                    data.name,
                    data.id,
                    data.databaseName,
                    data.layouts,
                    data.expression,
                    data.targetLetter
                )

            default:
                return data
        }
    }
}