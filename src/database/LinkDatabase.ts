import Dexie, { type EntityTable } from "dexie"

export type EntityType = "cube" | "procedure" | "capsuleProcedure" | "screen"
export type LinkKind = "calls" | "usesCube" | "contains" | "showsCube"
export type LinkOwnerType = "database" | "capsule"
export type LinkAccess = "read" | "write" | "readwrite"

export type Link = {
    id: string
    srcType: EntityType
    srcId: string
    dstType: EntityType
    dstId: string
    kind: LinkKind
    ownerType: LinkOwnerType
    ownerId: string
    meta?: {
        stepId?: string
        access?: LinkAccess
    }
}

type LinkRule = readonly [EntityType, LinkKind, EntityType]

export const ALLOWED_LINKS = [
    ["screen", "contains", "procedure"],
    ["screen", "contains", "capsuleProcedure"],
    ["screen", "showsCube", "cube"],
    ["capsuleProcedure", "calls", "procedure"],
    ["capsuleProcedure", "usesCube", "cube"],
    ["procedure", "usesCube", "cube"],
] as const satisfies readonly LinkRule[]

export function isAllowedLink(link: Pick<Link, "srcType" | "kind" | "dstType">): boolean {
    return ALLOWED_LINKS.some(([srcType, kind, dstType]) =>
        link.srcType === srcType && link.kind === kind && link.dstType === dstType
    )
}

/** Persistent store for relationships between Board model entities. */
export default class LinkDatabase extends Dexie {
    links!: EntityTable<Link, "id">

    constructor(name = "link-model") {
        super(name)

        this.version(1).stores({
            links: "&id, [srcType+srcId], [dstType+dstId], [ownerType+ownerId], [ownerType+ownerId+kind+srcType+srcId], [srcType+srcId+kind], [dstType+dstId+kind]",
        })
    }

    static getId(link: Pick<Link, "srcType" | "srcId" | "kind" | "dstType" | "dstId">): string {
        return JSON.stringify([
            link.srcType,
            link.srcId,
            link.kind,
            link.dstType,
            link.dstId,
        ])
    }

    async replaceLinksForSource(
        ownerType: LinkOwnerType,
        ownerId: string,
        kind: LinkKind,
        srcType: EntityType,
        srcId: string,
        links: Link[],
    ): Promise<void> {
        for (const link of links) {
            if (
                link.ownerType !== ownerType ||
                link.ownerId !== ownerId ||
                link.kind !== kind ||
                link.srcType !== srcType ||
                link.srcId !== srcId ||
                !isAllowedLink(link) ||
                link.id !== LinkDatabase.getId(link)
            ) {
                throw new Error("Link does not match the requested replacement scope.")
            }
        }

        await this.transaction("rw", this.links, async () => {
            await this.links
                .where("[ownerType+ownerId+kind+srcType+srcId]")
                .equals([ownerType, ownerId, kind, srcType, srcId])
                .delete()
            await this.links.bulkPut(links)
        })
    }

    async deleteLinksForOwner(
        ownerType: LinkOwnerType,
        ownerId: string,
        kind?: LinkKind,
    ): Promise<number> {
        return this.transaction("rw", this.links, async () => {
            const ownerLinks = await this.links
                .where("[ownerType+ownerId]")
                .equals([ownerType, ownerId])
                .toArray()
            const ids = ownerLinks
                .filter(link => kind === undefined || link.kind === kind)
                .map(link => link.id)
            await this.links.bulkDelete(ids)
            return ids.length
        })
    }
}
