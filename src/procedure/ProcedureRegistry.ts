import Procedure from "./Procedure"
import ProcedurePlaceholder from "./ProcedurePlaceholder"

export interface ProcedureIdentifier {
    name: string
    defaultDatabase: string
}

export type ProcedureEntry = Procedure | ProcedurePlaceholder

export class ProcedureRegistry {
    items: Map<string, ProcedureEntry> = new Map<string, ProcedureEntry>()

    private static getKey(identifier: ProcedureIdentifier): string {
        return `${identifier.defaultDatabase}:${identifier.name}`
    }

    register(procedure: ProcedureEntry): void {
        this.items.set(ProcedureRegistry.getKey(procedure), procedure)
    }

    get(identifier: ProcedureIdentifier): ProcedureEntry | undefined {
        return this.items.get(ProcedureRegistry.getKey(identifier))
    }
}