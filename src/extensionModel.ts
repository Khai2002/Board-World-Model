import Procedure from "./procedure/Procedure"
import ProcedurePlaceholder from "./procedure/ProcedurePlaceholder"
import CallProcedureStep from "./procedure/step/CallProcedureStep"
import { ProcedureRegistry, type ProcedureIdentifier } from "./procedure/ProcedureRegistry"
import type { ProcedureJSON, ProcedureMetadataJSON } from "./utils/json"

type ProcedureModel = {
    procedure: Procedure
    proceduresToExecute: Array<Procedure | ProcedurePlaceholder>
}

export type ProcedureLoader = (
    identifier: ProcedureIdentifier,
) => Promise<unknown>

export type RecursiveProcedureModel = {
    procedure: Procedure
    proceduresToExecute: ProcedureExecution[]
}

export type ProcedureExecution = {
    procedure: Procedure
    depth: number
}

function asProcedureList(data: unknown): ProcedureMetadataJSON[] {
    if (!Array.isArray(data)) {
        throw new Error("The core procedure response is not a list")
    }

    return data as ProcedureMetadataJSON[]
}

function asProcedureJSON(data: unknown): ProcedureJSON {
    const procedureData = Array.isArray(data) ? data[0] : data
    if (!procedureData || typeof procedureData !== "object") {
        throw new Error("The procedure response is empty")
    }

    return procedureData as ProcedureJSON
}

export function createProcedureModel(
    proceduresData: unknown,
    procedureData: unknown,
): ProcedureModel {
    const registry = new ProcedureRegistry()
    for (const procedure of asProcedureList(proceduresData)) {
        registry.register(ProcedurePlaceholder.fromJSON(procedure))
    }

    const procedure = Procedure.fromJSON(asProcedureJSON(procedureData))
    registry.register(procedure)

    const proceduresToExecute = procedure
        .getStepsByType(CallProcedureStep)
        .map(step => step.getProcedureToExecute(registry))

    return { procedure, proceduresToExecute }
}

export async function createRecursiveProcedureModel(
    proceduresData: unknown,
    procedureData: unknown,
    loadProcedure: ProcedureLoader,
): Promise<RecursiveProcedureModel> {
    const registry = new ProcedureRegistry()
    for (const procedure of asProcedureList(proceduresData)) {
        registry.register(ProcedurePlaceholder.fromJSON(procedure))
    }

    const rootProcedure = Procedure.fromJSON(asProcedureJSON(procedureData))
    registry.register(rootProcedure)

    const loaded = new Set<string>([procedureKey(rootProcedure)])
    const proceduresToExecute: ProcedureExecution[] = []

    async function resolveProcedure(identifier: ProcedureIdentifier): Promise<Procedure> {
        const existing = registry.get(identifier)
        if (existing?.kind === "procedure") return existing

        const loadedData = await loadProcedure(identifier)
        const procedure = Procedure.fromJSON(asProcedureJSON(loadedData))
        registry.register(procedure)
        return procedure
    }

    async function visitProcedure(procedure: Procedure, depth: number): Promise<void> {
        for (const step of procedure.getStepsByType(CallProcedureStep)) {
            const calledProcedure = await resolveProcedure(step.procedureToExecute)
            const key = procedureKey(calledProcedure)
            if (loaded.has(key)) continue

            loaded.add(key)
            proceduresToExecute.push({ procedure: calledProcedure, depth })
            await visitProcedure(calledProcedure, depth + 1)
        }
    }

    await visitProcedure(rootProcedure, 1)

    return { procedure: rootProcedure, proceduresToExecute }
}

function procedureKey(procedure: Procedure): string {
    return `${procedure.defaultDatabase}:${procedure.name}`
}

declare global {
    interface Window {
        BoardWorldModel: {
            createProcedureModel: typeof createProcedureModel
            createRecursiveProcedureModel: typeof createRecursiveProcedureModel
        }
    }
}

window.BoardWorldModel = {
    createProcedureModel,
    createRecursiveProcedureModel,
}
