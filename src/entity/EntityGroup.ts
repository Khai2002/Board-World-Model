type EntityGroupJSON = {
    description: string;
    items: number[];
}

export default class EntityGroup {
    description: string
    items: number[]

    constructor(description: string, items: number[]) {
        this.description = description
        this.items = items
    }

    static fromJson(json: EntityGroupJSON): EntityGroup {
        return new EntityGroup(json.description, json.items)
    }
  
}