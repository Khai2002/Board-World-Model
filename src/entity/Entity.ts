type EntityJSON = {
  idx: number
  name: string
  assignedGroup: string
  assignedPosition: number
  itemNr?: number
  maxItemNr?: number
  enabled?: boolean
  lessAgregates: number[]
  childrenIdx: number[]
  level: number
  codeWidth: number
  descWidth: number
  physicalName: string
  sortBy?: number
  allowUserView: boolean
  isCustomEntity?: boolean
  isStandAlone?: boolean
  exportName: string
  isInUse?: boolean
  tree?: number
  display?: number
  idxReplicated?: number
  isUnbalancedEntity?: boolean
  isReplica?: boolean
  isTemporalEntity?: boolean
  isTimeEntity?: boolean
  customEntityMask?: string
}

/**
 * Represents an Entity in the data model.
 *
 * An Entity has a unique identifier, a name, a data type,
 * and an optional maximum number of members.
 */
export default class Entity {

    /** Unique identifier of the entity. */
    idx: number

    /** Display name of the entity. */
    name: string

    /** Number of current members. */
    itemNr: number

    /** Maximum number of members allowed. Defaults to 9999. */
    maxItemNr: number

    /** Indexes of parent entities */
    parentsIdx: number[]

    /** Indexes of child entities */
    childrenIdx: number[]

    /** Is a replica entity. The current entity is the replica */
    isReplica: boolean

    /** Index of the replica entity. The current entity is the original */
    replicaIdx: number

    /** Is the entity standalone without relationships */
    isStandAlone: boolean

    /** Tree index representing the realtionship */
    treeIdx: number

    /** Level in the tree */
    treeLevel: number

    /**
     * Creates a new Entity.
     *
     * @param id Unique identifier of the entity.
     * @param name Display name of the entity.
     * @param dtype Data type of the entity.
     * @param max_members Maximum number of members allowed. Defaults to 9999.
     */
    constructor(
        idx: number,
        name: string,
        itemNr: number = 0,
        maxItemNr: number = 9999,
        parentsIdx: number[],
        childrenIdx: number[],
        isReplica: boolean = false,
        replicaIdx: number = 0,
        isStandAlone: boolean = false,
        treeIdx: number = 0,
        treeLevel: number = 0,
    ) {
        this.idx = idx
        this.name = name
        this.itemNr = itemNr
        this.maxItemNr = maxItemNr
        this.parentsIdx = parentsIdx
        this.childrenIdx = childrenIdx
        this.isReplica = isReplica
        this.replicaIdx = replicaIdx
        this.isStandAlone = isStandAlone
        this.treeIdx = treeIdx
        this.treeLevel = treeLevel
    }

    static fromJson(json: EntityJSON) {
        return new Entity(json.idx, json.name, json.itemNr, json.maxItemNr, json.lessAgregates, 
            json.childrenIdx, json.isReplica, json.idxReplicated, json.isStandAlone, json.tree, json.level)
    }
}

