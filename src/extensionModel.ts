import Procedure from "./procedure/Procedure"
import CallProcedureStep from "./procedure/step/CallProcedureStep"
import type { DataflowBlock } from "./procedure/step/DataflowStep"
import type { ProcedureJSON } from "./utils/json"
import DataflowStep from "./procedure/step/DataflowStep"
import CubeDatabase from "./cube/CubeDatabase"
import ProcedureDatabase from "./procedure/ProcedureDatabase"
import { analyzeDataflowDependency } from "./analysis/analyzeProcedure"

type ProcedureModel = {
    procedure: Procedure
    proceduresToExecute: Procedure[]
}

export type ProcedureIdentifier = {
    name: string
    defaultDatabase: string
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

export type WrittenDataflowBlock = {
    procedureKey: string
    detail: string
    block: DataflowBlock
}

export function getWrittenDataflowBlocks(procedures: Procedure[]): WrittenDataflowBlock[] {
    return procedures.flatMap(procedure =>
        procedure.getStepsByType(DataflowStep).map(step => ({
            procedureKey: procedureKey(procedure),
            detail: step.detail,
            block: step.getTargetBlock(),
        })).filter(
            result => result.block.cubeIdx !== -1
        )
    )
}

export function openCubeDatabase(): CubeDatabase {
    return new CubeDatabase()
}

export function openProcedureDatabase(): ProcedureDatabase {
    return new ProcedureDatabase()
}

function asProcedureJSON(data: unknown): ProcedureJSON {
    const procedureData = Array.isArray(data) ? data[0] : data
    if (!procedureData || typeof procedureData !== "object") {
        throw new Error(
            "Procedure details are not saved. Scan and save procedures in the popup menu first."
        )
    }

    return procedureData as ProcedureJSON
}

export async function createProcedureModel(
    source: ProcedureDatabase | ProcedureLoader,
    procedureData: unknown,
): Promise<ProcedureModel> {
    const loadProcedure = asProcedureLoader(source)
    const procedure = Procedure.fromJSON(asProcedureJSON(procedureData))
    const proceduresToExecute = await Promise.all(
        procedure
            .getStepsByType(CallProcedureStep)
            .map(step => getStoredProcedure(loadProcedure, step.procedureToExecute))
    )

    return { procedure, proceduresToExecute }
}

export async function createRecursiveProcedureModel(
    source: ProcedureDatabase | ProcedureLoader,
    procedureData: unknown,
): Promise<RecursiveProcedureModel> {
    const loadProcedure = asProcedureLoader(source)
    const rootProcedure = Procedure.fromJSON(asProcedureJSON(procedureData))
    const loaded = new Set<string>([procedureKey(rootProcedure)])
    const proceduresToExecute: ProcedureExecution[] = []

    async function visitProcedure(procedure: Procedure, depth: number): Promise<void> {
        for (const step of procedure.getStepsByType(CallProcedureStep)) {
            const calledProcedure = await getStoredProcedure(loadProcedure, step.procedureToExecute)
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

async function getStoredProcedure(
    loadProcedure: ProcedureLoader,
    identifier: ProcedureIdentifier,
): Promise<Procedure> {
    const procedureData = await loadProcedure(identifier)
    if (!procedureData) {
        throw new Error(
            `Procedure ${identifier.name} does not have saved details. Scan and save procedures in the popup menu first.`
        )
    }

    return Procedure.fromJSON(asProcedureJSON(procedureData))
}

function asProcedureLoader(
    source: ProcedureDatabase | ProcedureLoader,
): ProcedureLoader {
    if (typeof source === "function") return source

    return async identifier => source.procedures.get(
        ProcedureDatabase.getId(identifier)
    )
}

function procedureKey(procedure: Procedure): string {
    return `${procedure.defaultDatabase}:${procedure.name}`
}

export function printTest(): void {
    analyzeDataflowDependency("e91cf58b-260b-4a6c-a8c4-7ab837022505", "FIN");
}

declare global {
    interface Window {
        BoardWorldModel: {
            createProcedureModel: typeof createProcedureModel
            createRecursiveProcedureModel: typeof createRecursiveProcedureModel
            getWrittenDataflowBlocks: typeof getWrittenDataflowBlocks
            CubeDatabase: typeof CubeDatabase
            openCubeDatabase: typeof openCubeDatabase
            ProcedureDatabase: typeof ProcedureDatabase
            openProcedureDatabase: typeof openProcedureDatabase
            printTest: typeof printTest
        }
    }
}

window.BoardWorldModel = {
    createProcedureModel,
    createRecursiveProcedureModel,
    getWrittenDataflowBlocks,
    CubeDatabase,
    openCubeDatabase,
    ProcedureDatabase,
    openProcedureDatabase,
    printTest,
}
