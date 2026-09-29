import Dexie, { type EntityTable } from "dexie";
import type { ScreenMetadataJSON, CapsuleMetadataJSON } from "../utils/json";

export type ScreenMetadata = ScreenMetadataJSON & {
    capsule: string      // the capsules that has this screen 
    is_home: boolean,    // if the screen is the home screen of tha capsule
    is_screen: boolean,  // is this a file/screen or just a folder, if in JSON type exists and = 1, then it is a screen.
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
}


export default class ScreenDatabase extends Dexie {
    capsule!: EntityTable<CapsuleMetadata, "id">
    screenMetadata!: EntityTable<ScreenMetadata, "id">

    constructor(name = "screen-model") {
        super(name);

        this.version(1).stores({
            capsule: "&id, name, path",
            screenMetadata: "&id, text, capsule",
        })
    }

    async getScreensByCapsulePath(capsule_path: string): Promise<ScreenMetadata[]> {
        return this.screenMetadata.where("capsule").equals(capsule_path).toArray();
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

        await this.transaction("rw", this.capsule, this.screenMetadata, async () => {
            for (const { capsule } of scans) {
                await this.screenMetadata.where("capsule").equals(capsule.path).delete();
            }
            await this.capsule.bulkPut(capsuleRows);
            await this.screenMetadata.bulkPut(screenRows);
        });
    }
}