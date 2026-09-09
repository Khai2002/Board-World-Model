import type Step from "../StepFactory";

export default class DataflowStep implements Step {
    discriminator: string;
    actionType: number;
    comment: string;
    detail: string;
    name: string;
    id: string;
    databaseName: string;
    layouts: DataflowLayout[];
    expression: string;
    targetLetter: string;

    constructor(discriminator: string, actionType: number, comment: string, 
        detail: string, name: string, id: string, databaseName: string, 
        layouts: DataflowLayout[], expression: string, targetLetter: string) {
        this.discriminator = discriminator
        this.actionType = actionType
        this.comment = comment
        this.detail = detail
        this.name = name
        this.id = id
        this.databaseName = databaseName
        this.layouts = layouts
        this.expression = expression
        this.targetLetter = targetLetter
    }

    getTargetBlock(): DataflowBlock {
        const targetBlock = this.layouts
            .flatMap(layout => layout.blocks)
            .find(block => block.letter === this.targetLetter)

        if (targetBlock) return targetBlock

        throw new Error("Dataflow step doesnt have corresponding target cube")
    }
    
}

export type DataflowLayout = {
    actionId: string;
    blocks: DataflowBlock[]
}

export type DataflowBlock = {
    cubeIdx: number;
    value: string;
    letter: string;

}

export function isDataflowLayout(value: unknown): value is DataflowLayout {
    if (!value || typeof value !== "object") return false

    const layout = value as Partial<DataflowLayout>
    return typeof layout.actionId === "string"
        && Array.isArray(layout.blocks)
        && layout.blocks.every(isDataflowBlock)
}

function isDataflowBlock(value: unknown): value is DataflowBlock {
    if (!value || typeof value !== "object") return false

    const block = value as Partial<DataflowBlock>
    return typeof block.cubeIdx === "number"
        && typeof block.value === "string"
        && typeof block.letter === "string"
}

export function isDataflowLayouts(value: unknown): value is DataflowLayout[] {
    return Array.isArray(value) && value.every(isDataflowLayout)
}