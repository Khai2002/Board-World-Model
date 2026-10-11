import Dexie, { type EntityTable } from "dexie"
import type { CapsuleProcedureJSON, CapsuleProcedureMetadataJSON } from "../utils/json"

export type CapsuleProcedureMetadata = CapsuleProcedureMetadataJSON & {
    id: string
    capsulePath: string
}

export type CapsuleProcedureRecord = CapsuleProcedureJSON & {
    id: string
    capsulePath: string
}

export type CapsuleProcedureScan = {
    capsulePath: string
    metadata: CapsuleProcedureMetadataJSON[]
    procedures: CapsuleProcedureJSON[]
}

export type CapsuleProcedureIdentifier = {
    name: string
    capsulePath: string
    defaultDatabase?: string
}

export type CapsuleProcedureEdge = {
    id: string
    fromCapsulePath: string
    fromName: string
    fromDefaultDatabase?: string
    toCapsulePath: string
    toName: string
    toDefaultDatabase?: string
}

/** Persistent storage for capsule procedure metadata and detailed definitions. */
export default class CapsuleProcedureDatabase extends Dexie {
    procedureMetadata!: EntityTable<CapsuleProcedureMetadata, "id">
    procedures!: EntityTable<CapsuleProcedureRecord, "id">
    procedureEdges!: EntityTable<CapsuleProcedureEdge, "id">

    static getId(capsulePath: string, name: string): string {
        return `${capsulePath}:${name}`
    }

    static getEdgeId(
        from: CapsuleProcedureIdentifier,
        to: CapsuleProcedureIdentifier,
    ): string {
        return `${CapsuleProcedureDatabase.getId(from.capsulePath, from.name)}->${CapsuleProcedureDatabase.getId(to.capsulePath, to.name)}`
    }

    constructor(name = "capsule-procedure-model") {
        super(name)

        this.version(1).stores({
            procedureMetadata: "&id, capsulePath, name, [capsulePath+name]",
            procedures: "&id, capsulePath, name, [capsulePath+name]",
        })

        this.version(2).stores({
            procedureMetadata: "&id, capsulePath, name, [capsulePath+name]",
            procedures: "&id, capsulePath, name, [capsulePath+name]",
            procedureEdges: "&id, fromCapsulePath, fromName, toCapsulePath, toName, [fromCapsulePath+fromName], [toCapsulePath+toName], [fromCapsulePath+fromName+toCapsulePath+toName]",
        })
    }

    async saveScannedCapsules(scans: CapsuleProcedureScan[]): Promise<void> {
        const metadataRows = scans.flatMap(({ capsulePath, metadata }) =>
            metadata.map(procedure => {
                if (typeof procedure.name !== "string" || procedure.name.length === 0) {
                    throw new Error(`Capsule procedure metadata for ${capsulePath} has no name.`)
                }

                return {
                    ...procedure,
                    capsulePath,
                    id: CapsuleProcedureDatabase.getId(capsulePath, procedure.name),
                }
            }),
        )
        const procedureRows = scans.flatMap(({ capsulePath, procedures }) =>
            procedures.map(procedure => {
                if (typeof procedure.name !== "string" || procedure.name.length === 0) {
                    throw new Error(`Capsule procedure details for ${capsulePath} has no name.`)
                }

                return {
                    ...procedure,
                    capsulePath,
                    id: CapsuleProcedureDatabase.getId(capsulePath, procedure.name),
                }
            }),
        )

        await this.transaction("rw", this.procedureMetadata, this.procedures, async () => {
            for (const { capsulePath } of scans) {
                await this.procedureMetadata.where("capsulePath").equals(capsulePath).delete()
                await this.procedures.where("capsulePath").equals(capsulePath).delete()
            }
            await this.procedureMetadata.bulkPut(metadataRows)
            await this.procedures.bulkPut(procedureRows)
        })
    }
}
