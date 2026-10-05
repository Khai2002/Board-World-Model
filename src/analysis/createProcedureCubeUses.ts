import CubeDatabase from "../database/CubeDatabase"
import ProcedureDatabase, {
    type ProcedureCubeUse,
    type ProcedureCubeUseMode,
    type ProcedureRecord,
} from "../database/ProcedureDatabase"
import Procedure from "../procedure/Procedure"
import { resolveDataflowCubes } from "./resolveDataflowCubes"

export async function createProcedureCubeUsesFromDataflow(
    name: string,
    defaultDatabase: string,
): Promise<number> {
    const procedureDb = new ProcedureDatabase()
    const procedureId = ProcedureDatabase.getId({ name, defaultDatabase })
    const procedureJSON: ProcedureRecord | undefined = await procedureDb.getDetailsById(procedureId)
    if (!procedureJSON) {
        console.warn(`Cannot find procedure with key ${procedureId}`)
        return 0
    }

    const procedure = Procedure.fromJSON(procedureJSON)
    const cubeDb = new CubeDatabase()
    const dataflows = await resolveDataflowCubes(procedure, defaultDatabase, cubeDb)
    const modesByCube = new Map<number, Set<"read" | "write">>()
    const addMode = (cubeIdx: number, mode: "read" | "write") => {
        const modes = modesByCube.get(cubeIdx) ?? new Set<"read" | "write">()
        modes.add(mode)
        modesByCube.set(cubeIdx, modes)
    }

    for (const dataflow of dataflows) {
        for (const cubeIdx of dataflow.sourceCubeIds) addMode(cubeIdx, "read")
        if (dataflow.targetCubeId !== undefined) addMode(dataflow.targetCubeId, "write")
    }

    const uses: ProcedureCubeUse[] = [...modesByCube].map(([cubeIdx, modes]) => {
        const cubeRecordId = CubeDatabase.getId(defaultDatabase, cubeIdx)
        const mode: ProcedureCubeUseMode = modes.size > 1
            ? "readwrite"
            : modes.has("read") ? "read" : "write"
        return {
            id: ProcedureDatabase.getCubeUseId(procedureId, cubeRecordId),
            procedureId,
            procedureDefaultDatabase: defaultDatabase,
            cubeRecordId,
            cubeModelId: defaultDatabase,
            cubeIdx,
            mode,
        }
    })

    if (uses.length > 0) {
        await procedureDb.procedureCubeUses.bulkPut(uses)
    }
    return uses.length
}
