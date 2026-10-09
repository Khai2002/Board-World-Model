import CubeDatabase from "../database/CubeDatabase"
import LinkDatabase, { type Link, type LinkAccess } from "../database/LinkDatabase"
import ProcedureDatabase, { type ProcedureRecord } from "../database/ProcedureDatabase"
import Procedure from "../procedure/Procedure"
import { resolveDataflowCubes } from "./resolveDataflowCubes"

export async function createProcedureCubeUsesFromDataflow(
    name: string,
    defaultDatabase: string,
): Promise<number> {
    const procedureDb = new ProcedureDatabase()
    const linkDb = new LinkDatabase()

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

    const links: Link[] = [...modesByCube].map(([cubeIdx, modes]) => {
        const cubeId = CubeDatabase.getId(defaultDatabase, cubeIdx)
        const access: LinkAccess = modes.size > 1
            ? "readwrite"
            : modes.has("read") ? "read" : "write"
        const link = {
            srcType: "procedure" as const,
            srcId: procedureId,
            kind: "usesCube" as const,
            dstType: "cube" as const,
            dstId: cubeId,
            ownerType: "database" as const,
            ownerId: defaultDatabase,
            meta: { access },
        }
        return {
            ...link,
            id: LinkDatabase.getId(link),
        }
    })

    await linkDb.replaceLinksForSource(
        "database",
        defaultDatabase,
        "usesCube",
        "procedure",
        procedureId,
        links,
    )
    return links.length
}
