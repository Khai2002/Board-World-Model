import Dexie, { type EntityTable } from "dexie"

/** A cube node row stored in the dataflow graph table. */
export type CubeNode = {
    id: string
    modelId: string
    cubeId: string | number
    name?: string
    data: unknown
}

/** A directed dataflow edge row stored in the graph table. */
export type CubeEdge = {
    id: string
    fromModelId: string
    fromCubeId: string | number
    toModelId: string
    toCubeId: string | number
}

/** Persistent storage for cubes and their directed dataflow relationships. */
export default class CubeDatabase extends Dexie {
    cubes!: EntityTable<CubeNode, "id">
    cubeEdges!: EntityTable<CubeEdge, "id">

    static getId(modelId: string, cubeId: string | number): string {
        return `${modelId}:${cubeId}`
    }

    static getEdgeId(
        fromModelId: string,
        fromCubeId: string | number,
        toModelId: string,
        toCubeId: string | number,
    ): string {
        return `${CubeDatabase.getId(fromModelId, fromCubeId)}->${CubeDatabase.getId(toModelId, toCubeId)}`
    }

    constructor(name = "cube-model") {
        super(name)

        this.version(1).stores({
            cubes: "&id, modelId, cubeId, [modelId+cubeId]",
            cubeEdges: "&id, fromModelId, fromCubeId, toModelId, toCubeId, [fromModelId+fromCubeId], [toModelId+toCubeId], [fromModelId+fromCubeId+toModelId+toCubeId]",
        })
    }

    async getCubeById(id: string): Promise<CubeNode | undefined> {
        return this.cubes.get(id);
    }

    async getCubeByDatabaseAndIdx(database: string, idx: string | number): Promise<CubeNode | undefined> {
        const id = CubeDatabase.getId(database, idx)
        return this.cubes.get(id);
    }
}