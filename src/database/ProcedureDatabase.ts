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

/** A directed call relationship between two procedures. */
export type ProcedureEdge = {
    id: string
    fromName: string
    fromDefaultDatabase: string
    toName: string
    toDefaultDatabase: string
}

/** Persistent storage for procedure metadata and detailed definitions. */
export default class ProcedureDatabase extends Dexie {
    procedureMetadata!: EntityTable<ProcedureMetadata, "id">
    procedures!: EntityTable<ProcedureRecord, "id">
    procedureEdges!: EntityTable<ProcedureEdge, "id">

    static getId(procedure: Pick<ProcedureMetadataJSON, "name" | "defaultDatabase">): string {
        return `${procedure.defaultDatabase}:${procedure.name}`
    }

    static getEdgeId(
        from: Pick<ProcedureMetadataJSON, "name" | "defaultDatabase">,
        to: Pick<ProcedureMetadataJSON, "name" | "defaultDatabase">,
    ): string {
        return `${ProcedureDatabase.getId(from)}->${ProcedureDatabase.getId(to)}`
    }

    constructor(name = "procedure-model") {
        super(name)

        this.version(1).stores({
            procedureMetadata: "&id, name, defaultDatabase, [defaultDatabase+name]",
            procedures: "&id, name, defaultDatabase, [defaultDatabase+name]",
        })

        this.version(2).stores({
            procedureMetadata: "&id, name, defaultDatabase, [defaultDatabase+name]",
            procedures: "&id, name, defaultDatabase, [defaultDatabase+name]",
            procedureEdges: "&id, fromName, fromDefaultDatabase, toName, toDefaultDatabase, [fromDefaultDatabase+fromName], [toDefaultDatabase+toName], [fromDefaultDatabase+fromName+toDefaultDatabase+toName]",
        })
    }

    async getDetailsById(id: string): Promise<ProcedureRecord | undefined> {
        return this.procedures.get(id)
    }

    async getDetailsByDatabaseAndIdx(database: string, idx: string): Promise<ProcedureRecord | undefined> {
        const id = ProcedureDatabase.getId({defaultDatabase: database, name: idx});
        return this.procedures.get(id);
    }
}