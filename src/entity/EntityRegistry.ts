import Entity from "./Entity";

/**
 * A collection of entities indexed by their ID.
 */
export default class EntityRegistry {
    /** < entityIdx, Entity > */
    private items = new Map<number, Entity>();
    /** < treeIdx, entityIdx[] > */
    private trees = new Map<number, number[]>();

    /**
     * Adds an entity to the registry.
     *
     * @param item The entity to add.
     */
    add(item: Entity): void {
        this.items.set(item.idx, item)

        if (!item.treeIdx) return
        const tree = this.trees.get(item.treeIdx)

        if (tree) {
            tree.push(item.treeIdx)
        } else {
            this.trees.set(item.treeIdx, [item.idx])
        }
        
    }

    /**
     * Removes and returns an entity from the list.
     *
     * @param id The ID of the entity to remove.
     * @returns The removed entity if found, otherwise `undefined`.
     */
    pop(idx: number): Entity | undefined {
        const item = this.items.get(idx)
        this.items.delete(idx)
        return item
    }

    /**
     * Retrieves all entities from the registry.
     *
     * @returns An array containing all entities.
     */
    getAll(): Entity[] {
        return [...this.items.values()]
    }

    /**
     * Retrieves an entity by its ID.
     *
     * @param id The ID of the entity to retrieve.
     * @returns The entity if found, otherwise `undefined`.
     */
    getEntityByIdx(idx: number): Entity | undefined {
        return this.items.get(idx)
    }

    getChildrenByIdx(idx: number): Entity[] {
        const entity = this.items.get(idx)
        if (!entity) throw new Error(`Entity with index ${idx} does not exist.`);
        
        return entity.childrenIdx
            .map(childIdx => this.items.get(childIdx))
            .filter(value => value !== undefined) 
    }

    getParentsByIdx(idx: number): Entity[] {
        const entity = this.items.get(idx)
        if(!entity) throw new Error(`Entity with index ${idx} does not exist.`);

        return entity.parentsIdx
            .map(parentIdx => this.items.get(parentIdx))
            .filter(value => value !== undefined)
    }

    getTreeByIdx(idx: number): Entity[] {
        const entity = this.items.get(idx)
        if (!entity) throw new Error(`Entity with index ${idx} does not exist.`);
        if (!entity.treeIdx) return [entity]

        const entityList = this.trees.get(entity.treeIdx)
        if(!entityList) return [entity]

        return entityList.map(key => {
                const entity = this.items.get(key)
                if (!entity) throw new Error(`Entity with index ${idx} does not exist.`);
                return entity
            })
    }
    
}