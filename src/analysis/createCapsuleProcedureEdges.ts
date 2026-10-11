import CapsuleProcedureDatabase, { type CapsuleProcedureEdge, type CapsuleProcedureIdentifier } from "../database/CapsuleProcedureDatabase"
import LinkDatabase, { type Link } from "../database/LinkDatabase"
import ProcedureDatabase from "../database/ProcedureDatabase"
import Procedure from "../procedure/Procedure"
import CallProcedureStep from "../procedure/step/CallProcedureStep"
import type { ProcedureJSON } from "../utils/json"

/**
 * Builds the call graph for a capsule procedure.
 *
 * Capsule procedures can call either another capsule procedure or a regular procedure.
 * Capsule-to-capsule calls live in the capsule procedure database, while capsule-to-standard
 * procedure calls are stored as link rows in the generic link database.
 */
export async function createCapsuleProcedureEdgesFromCallProcedure(
    name: string,
    capsulePath: string,
    defaultDatabase: string,
): Promise<number> {
    const capsuleProcedureDb = new CapsuleProcedureDatabase()
    const procedureId = CapsuleProcedureDatabase.getId(capsulePath, name)
    const procedureJSON = await capsuleProcedureDb.procedures.get(procedureId)

    if (!procedureJSON) {
        console.warn(`Cannot find capsule procedure with key ${procedureId}`)
        return 0
    }

    const procedure = Procedure.fromJSON(procedureJSON as unknown as ProcedureJSON)
    const from: CapsuleProcedureIdentifier = {
        name: procedure.name,
        capsulePath,
        defaultDatabase: procedure.defaultDatabase ?? defaultDatabase,
    }

    const internalEdges: CapsuleProcedureEdge[] = []
    const callLinks: Link[] = []

    for (const step of procedure.getStepsByType(CallProcedureStep)) {
        const target = step.procedureToExecute as Record<string, unknown>
        const targetName = typeof target.name === "string" ? target.name : undefined
        if (!targetName) {
            console.warn(`Skipping capsule procedure call without a target name in ${procedureId}`)
            continue
        }

        const targetDefaultDatabase = typeof target.defaultDatabase === "string"
            ? target.defaultDatabase
            : defaultDatabase

        const targetProcedureType = typeof target.procedureType === "number"
            ? target.procedureType
            : undefined

        if (targetProcedureType === 1) {
            const dstId = ProcedureDatabase.getId({
                name: targetName,
                defaultDatabase: targetDefaultDatabase,
            })
            const link: Link = {
                id: LinkDatabase.getId({
                    srcType: "capsuleProcedure",
                    srcId: procedureId,
                    kind: "calls",
                    dstType: "procedure",
                    dstId: dstId,
                }),
                srcType: "capsuleProcedure",
                srcId: procedureId,
                kind: "calls",
                dstType: "procedure",
                dstId: dstId,
                ownerType: "capsule",
                ownerId: capsulePath,
                meta: { stepId: step.id },
            }
            callLinks.push(link)
            continue
        }

        const targetCapsulePath = typeof target.capsulePath === "string"
            ? target.capsulePath
            : capsulePath
        const to: CapsuleProcedureIdentifier = {
            name: targetName,
            capsulePath: targetCapsulePath,
            defaultDatabase: typeof target.defaultDatabase === "string"
                ? target.defaultDatabase
                : defaultDatabase,
        }
        const edge: CapsuleProcedureEdge = {
            id: CapsuleProcedureDatabase.getEdgeId(from, to),
            fromCapsulePath: from.capsulePath,
            fromName: from.name,
            fromDefaultDatabase: from.defaultDatabase,
            toCapsulePath: to.capsulePath,
            toName: to.name,
            toDefaultDatabase: to.defaultDatabase,
        }
        internalEdges.push(edge)
    }

    if (internalEdges.length > 0) {
        await capsuleProcedureDb.procedureEdges.bulkPut(internalEdges)
    }

    if (callLinks.length > 0) {
        await new LinkDatabase().replaceLinksForSource(
            "capsule",
            capsulePath,
            "calls",
            "capsuleProcedure",
            procedureId,
            callLinks,
        )
    }

    return internalEdges.length + callLinks.length
}
