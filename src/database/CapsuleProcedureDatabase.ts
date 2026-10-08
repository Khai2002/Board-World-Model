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

/** Persistent storage for capsule procedure metadata and detailed definitions. */
export default class CapsuleProcedureDatabase extends Dexie {
    procedureMetadata!: EntityTable<CapsuleProcedureMetadata, "id">
    procedures!: EntityTable<CapsuleProcedureRecord, "id">

    static getId(capsulePath: string, name: string): string {
        return `${capsulePath}:${name}`
    }

    constructor(name = "capsule-procedure-model") {
        super(name)

        this.version(1).stores({
            procedureMetadata: "&id, capsulePath, name, [capsulePath+name]",
            procedures: "&id, capsulePath, name, [capsulePath+name]",
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
