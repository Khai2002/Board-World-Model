import type Cube from "./Cube";

/**
 * Registry for managing cubes and their associations with entities.
 * Maintains a mapping of cubes by ID and indexes cubes by entity dimensions.
 */
export default class CubeRegistry {
    private cubes = new Map<string, Cube>()
    private entityIndex = new Map<number, Set<string>>()

    /**
     * Registers a cube in the registry.
     * @param cube - The cube to register
     */
    register(cube: Cube): void {
        this.cubes.set(cube.id, cube)
        for (const dim of cube.dimensions.values()) {
            const cubeSet = this.entityIndex.get(dim.entity.idx) ?? new Set()
            cubeSet.add(cube.id)
            this.entityIndex.set(dim.entity.idx, cubeSet)
        }
    }

    /**
     * Retrieves all cubes associated with a given entity ID.
     * @param entityId - The entity ID to look up
     * @returns An array of cubes associated with the entity
     */
    cubesForEntity(entityId: number): Cube[] {
        const ids = this.entityIndex.get(entityId) ?? new Set()
        return [...ids].map(id => this.cubes.get(id)!)
    }
}