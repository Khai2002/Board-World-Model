import Dexie, { type EntityTable } from "dexie";
import type { ScreenMetadataJSON, CapsuleMetadataJSON } from "../utils/json";

export type ScreenMetadata = ScreenMetadataJSON & {
    capsule: string      // the capsules that has this screen 
    is_home: boolean,    // if the screen is the home screen of tha capsule
    is_screen: boolean,  // is this a file/screen or just a folder, if in JSON type exists and = 1, then it is a screen.
}

export type ScreenDetail = {
    id: string
    capsule: string
    screenId: string
    data: unknown
}

export type CapsuleMetadata = CapsuleMetadataJSON & {
    id: string
}

export type CapsuleScan = {
    capsule: CapsuleMetadataJSON
    sitemap: {
        home?: string
        items: ScreenMetadataJSON[]
    }
    screenDetails: {
        screenId: string
        data: unknown
    }[]
}


export default class ScreenDatabase extends Dexie {
    capsule!: EntityTable<CapsuleMetadata, "id">
    screenMetadata!: EntityTable<ScreenMetadata, "id">
    screenDetails!: EntityTable<ScreenDetail, "id">

    constructor(name = "screen-model") {
        super(name);

        this.version(1).stores({
            capsule: "&id, name, path",
            screenMetadata: "&id, text, capsule",
        })

        this.version(2).stores({
            capsule: "&id, name, path",
            screenMetadata: "&id, text, capsule",
            screenDetails: "&id, capsule, screenId, [capsule+screenId]",
        })
    }

    static getScreenDetailId(capsulePath: string, screenId: string): string {
        return `${capsulePath}:${screenId}`
    }

    async getScreensByCapsulePath(capsule_path: string): Promise<ScreenMetadata[]> {
        return this.screenMetadata.where("capsule").equals(capsule_path).toArray();
    }

    async getScreenDetail(capsulePath: string, screenId: string): Promise<ScreenDetail | undefined> {
        return this.screenDetails.get(ScreenDatabase.getScreenDetailId(capsulePath, screenId));
    }

    async saveScannedCapsules(scans: CapsuleScan[]): Promise<void> {
        const capsuleRows = scans.map(({ capsule }) => ({
            ...capsule,
            id: capsule.path,
        }));
        const screenRows = scans.flatMap(({ capsule, sitemap }) => {
            if (!Array.isArray(sitemap.items)) {
                throw new Error(`Sitemap for ${capsule.path} does not contain an items list.`);
            }

            return sitemap.items.map((screen) => {
                if (typeof screen.id !== "string" || typeof screen.text !== "string") {
                    throw new Error(`Sitemap for ${capsule.path} contains an invalid screen entry.`);
                }

                return {
                    ...screen,
                    capsule: capsule.path,
                    is_home: screen.id === sitemap.home,
                    is_screen: screen.type === 1,
                };
            });
        });
        const screenDetailRows = scans.flatMap(({ capsule, screenDetails }) =>
            screenDetails.map(({ screenId, data }) => ({
                id: ScreenDatabase.getScreenDetailId(capsule.path, screenId),
                capsule: capsule.path,
                screenId,
                data,
            })),
        );

        await this.transaction("rw", this.capsule, this.screenMetadata, this.screenDetails, async () => {
            for (const { capsule } of scans) {
                await this.screenMetadata.where("capsule").equals(capsule.path).delete();
                await this.screenDetails.where("capsule").equals(capsule.path).delete();
            }
            await this.capsule.bulkPut(capsuleRows);
            await this.screenMetadata.bulkPut(screenRows);
            await this.screenDetails.bulkPut(screenDetailRows);
        });
    }
}