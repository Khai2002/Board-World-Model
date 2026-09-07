import Entity from "../entity/Entity";

/**
 * The density or sparsity level of a cube dimension.
 */
export type Sparsity = "sparse" | "dense"

/**
 * Represents a single dimension of a cube.
 */
export default class CubeDimension {
    /**
     * The entity associated with this cube dimension.
     */
    entity: Entity

    /**
     * Whether this dimension is sparse or dense.
     */
    sparsity: Sparsity

    /**
     * Creates a new cube dimension.
     *
     * @param entity - The entity represented by this dimension.
     * @param sparsity - The storage sparsity of this dimension. Defaults to "sparse".
     */
    constructor(entity: Entity, sparsity: Sparsity = "sparse"){
        this.entity = entity
        this.sparsity = sparsity
    }
}
