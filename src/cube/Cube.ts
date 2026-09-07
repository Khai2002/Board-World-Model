import CubeDimension from "./CubeDimension"

/**
 * Represents a cube containing multiple dimensions
 */
export default class Cube {
    /** The unique identifier for this cube */
    id: string
    private _dimensions = new Map<number, CubeDimension>

    /**
     * Creates a new Cube instance
     * @param id - The unique identifier for the cube
     */
    constructor(id: string) {
        this.id = id
    }

    /**
     * Adds a dimension to the cube
     * @param dimension - The dimension to add
     */
    addDimension(dimension: CubeDimension): void {
        this._dimensions.set(dimension.entity.idx, dimension)
    }

    /**
     * Removes a dimension from the cube
     * @param entityId - The entity id of the dimension to remove
     */
    removeDimension(entityId: number): void {
        this._dimensions.delete(entityId)
    }

    /**
     * Retrieves a dimension by entity id
     * @param entityId - The entity id of the dimension to retrieve
     * @returns The dimension if found, otherwise undefined
     */
    getDimension(entityId: number): CubeDimension | undefined {
        return this._dimensions.get(entityId)
    }

    /**
     * Gets all dimensions in the cube
     * @returns A readonly map of dimensions keyed by entity id
     */
    get dimensions(): ReadonlyMap<number, CubeDimension> {
        return this._dimensions
    }
}