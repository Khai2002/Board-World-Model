import Dexie, { type EntityTable } from "dexie"
import type { ProcedureJSON, ProcedureMetadataJSON } from "../utils/json"

/** A lightweight procedure entry stored from the procedure list. */
export type ProcedureMetadata = ProcedureMetadataJSON & {
    id: string
}

/** A detailed procedure definition stored from a procedure JSON document. */
export type ProcedureRecord = ProcedureJSON & {
    id: string
}

/** Persistent storage for procedure metadata and detailed definitions. */
export default class ProcedureDatabase extends Dexie {
    procedureMetadata!: EntityTable<ProcedureMetadata, "id">
    procedures!: EntityTable<ProcedureRecord, "id">

    constructor(name = "procedure-model") {
        super(name)

        this.version(1).stores({
            procedureMetadata: "&id, name, defaultDatabase, [defaultDatabase+name]",
            procedures: "&id, name, defaultDatabase, [defaultDatabase+name]",
        })
    }

    static getId(procedure: Pick<ProcedureMetadataJSON, "name" | "defaultDatabase">): string {
        return `${procedure.defaultDatabase}:${procedure.name}`
    }
}