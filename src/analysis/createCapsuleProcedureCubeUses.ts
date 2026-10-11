import CapsuleProcedureDatabase from "../database/CapsuleProcedureDatabase"
import CubeDatabase from "../database/CubeDatabase"
import LinkDatabase, { type Link, type LinkAccess } from "../database/LinkDatabase"
import Procedure from "../procedure/Procedure"
import type { ProcedureJSON } from "../utils/json"
import { resolveDataflowCubes } from "./resolveDataflowCubes"

/**
 * Resolves all dataflow reads and writes for a capsule procedure and writes the resulting
 * usesCube links for that procedure back to the link database. Returns the number of links created.
 */
export async function createCapsuleProcedureCubeUsesFromDataflow(
    name: string,
    capsulePath: string,
    defaultDatabase: string,
): Promise<number> {
    const capsuleProcedureId = CapsuleProcedureDatabase.getId(capsulePath, name)
    const procedureJSON = await new CapsuleProcedureDatabase().procedures.get(capsuleProcedureId)
    if (!procedureJSON) {
        console.warn(`Cannot find capsule procedure with key ${capsuleProcedureId}`)
        return 0
    }

    const procedure = Procedure.fromJSON(procedureJSON as unknown as ProcedureJSON)
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
            srcType: "capsuleProcedure" as const,
            srcId: capsuleProcedureId,
            kind: "usesCube" as const,
            dstType: "cube" as const,
            dstId: cubeId,
            ownerType: "capsule" as const,
            ownerId: capsulePath,
            meta: { access },
        }
        return {
            ...link,
            id: LinkDatabase.getId(link),
        }
    })

    await new LinkDatabase().replaceLinksForSource(
        "capsule",
        capsulePath,
        "usesCube",
        "capsuleProcedure",
        capsuleProcedureId,
        links,
    )
    return links.length
}