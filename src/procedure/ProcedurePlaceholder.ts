import type { ProcedureMetadataJSON } from "../utils/json"

export default class ProcedurePlaceholder {
    readonly kind = "placeholder"
    oldDescription: string
    name: string
    description: string
    procedureType: number
    defaultDatabase: string

    constructor(data: ProcedureMetadataJSON) {
        this.oldDescription = data.oldDescription
        this.name = data.name
        this.description = data.description
        this.procedureType = data.procedureType
        this.defaultDatabase = data.defaultDatabase
    }

    static fromJSON(data: ProcedureMetadataJSON): ProcedurePlaceholder {
        return new ProcedurePlaceholder(data)
    }
}
