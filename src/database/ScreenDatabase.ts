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
}