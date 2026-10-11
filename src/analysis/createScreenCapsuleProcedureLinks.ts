import CapsuleProcedureDatabase from "../database/CapsuleProcedureDatabase"
import LinkDatabase, { type Link } from "../database/LinkDatabase"
import ScreenDatabase from "../database/ScreenDatabase"

type ProcedureReference = {
    name?: unknown
}

function getProcedureReferences(screenData: unknown): ProcedureReference[] {
    const data = Array.isArray(screenData) ? screenData[0] : screenData
    if (!data || typeof data !== "object") return []

    const screen = data as {
        onOpenProcedure?: ProcedureReference
        screenDrills?: unknown
        toolboxes?: {
            action?: { procedure?: ProcedureReference }
            onOpenCoreProcedure?: ProcedureReference
        }[]
    }
    const references: unknown[] = [screen.onOpenProcedure]
    const seen = new WeakSet<object>()
    const collectDrillProcedures = (value: unknown): void => {
        if (!value || typeof value !== "object" || seen.has(value)) return
        seen.add(value)
        if (Array.isArray(value)) {
            value.forEach(collectDrillProcedures)
            return
        }

        const record = value as Record<string, unknown>
        if (Array.isArray(record.procedures)) references.push(...record.procedures)
        Object.values(record).forEach(collectDrillProcedures)
    }
    for (const toolbox of screen.toolboxes ?? []) {
        references.push(toolbox.action?.procedure, toolbox.onOpenCoreProcedure)
    }
    collectDrillProcedures(screen.screenDrills)
    return references.filter((reference): reference is ProcedureReference => {
        if (!reference || typeof reference !== "object") return false
        const name = (reference as ProcedureReference).name
        return typeof name === "string" && name.length > 0
    })
}

/** Rebuilds screen-to-capsule-procedure links for all screens in a capsule. */
export async function createScreenCapsuleProcedureLinks(capsulePath: string): Promise<number> {
    const screenDb = new ScreenDatabase()
    const linkDb = new LinkDatabase()
    const screens = await screenDb.screenDetails.where("capsule").equals(capsulePath).toArray()
    const linksById = new Map<string, Link>()

    for (const screen of screens) {
        for (const procedure of getProcedureReferences(screen.data)) {
            const targetId = CapsuleProcedureDatabase.getId(capsulePath, procedure.name as string)
            const link = {
                srcType: "screen" as const,
                srcId: ScreenDatabase.getScreenDetailId(capsulePath, screen.screenId),
                kind: "contains" as const,
                dstType: "capsuleProcedure" as const,
                dstId: targetId,
                ownerType: "capsule" as const,
                ownerId: capsulePath,
            }
            linksById.set(LinkDatabase.getId(link), {
                ...link,
                id: LinkDatabase.getId(link),
            })
        }
    }

    const links = [...linksById.values()]
    await linkDb.transaction("rw", linkDb.links, async () => {
        const existingLinks = await linkDb.links
            .where("[ownerType+ownerId]")
            .equals(["capsule", capsulePath])
            .toArray()
        await linkDb.links.bulkDelete(
            existingLinks.filter(link => link.kind === "contains").map(link => link.id),
        )
        await linkDb.links.bulkPut(links)
    })
    return links.length
}