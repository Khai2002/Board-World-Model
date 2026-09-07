import type Step from "./StepFactory"
import StepFactory from "./StepFactory"
import type { ProcedureJSON, ProcedureGroupJSON } from "../utils/json"

type Constructor<T> = new (...args: never[]) => T

export class ProcedureGroup {
    debugCounter: number
    description: string
    steps: Step[]
    id: string

    constructor(data: ProcedureGroupJSON) {
        this.debugCounter = data.debugCounter
        this.description = data.description
        this.id = data.id
        this.steps = data.steps.map(StepFactory.fromJSON)
    }

    static fromJSON(data: ProcedureGroupJSON): ProcedureGroup {
        return new ProcedureGroup(data)
    }
}

export default class Procedure {
    readonly kind = "procedure"
    procedureBehaviour: number
    procedureWindowEnum: number
    procedureGroups: ProcedureGroup[]
    virtualCubesList: any[]
    oldDescription: string
    name: string
    description: string
    procedureType: number
    defaultDatabase: string

    constructor(data: ProcedureJSON) {
        this.procedureBehaviour = data.procedureBehaviour
        this.procedureWindowEnum = data.procedureWindowEnum
        this.procedureGroups = data.procedureGroups
        this.virtualCubesList = data.virtualCubesList
        this.oldDescription = data.oldDescription
        this.name = data.name
        this.description = data.description
        this.procedureType = data.procedureType
        this.defaultDatabase = data.defaultDatabase
    }

    static fromJSON(data: ProcedureJSON): Procedure {
        return new Procedure({
            ...data,
            procedureGroups: data.procedureGroups.map(
                group => ProcedureGroup.fromJSON(group)
            )
        })
    }

    getProcedureGroupCount(): number {
        return this.procedureGroups.length
    }

    getStepsByType<T extends Step>(stepType: Constructor<T>): T[] {
        return this.procedureGroups
            .flatMap(group => group.steps)
            .filter(
                (step): step is T => step instanceof stepType
            )
    }
}


