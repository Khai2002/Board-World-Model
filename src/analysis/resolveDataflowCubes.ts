import CubeDatabase from "../database/CubeDatabase"
import Procedure from "../procedure/Procedure"
import DataflowStep from "../procedure/step/DataflowStep"

export type ResolvedDataflowCubes = {
    sourceCubeIds: number[]
    targetCubeId?: number
}

export async function resolveDataflowCubes(
    procedure: Procedure,
    modelId: string,
    cubeDb: CubeDatabase,
): Promise<ResolvedDataflowCubes[]> {
    const dataflows = await Promise.all(procedure.getStepsByType(DataflowStep)
        .map(async step => ({
            target: step.targetLetter,
            sources: extractVariables(step.expression),
            blocks: await Promise.all(step.layouts
                .flatMap(layout => layout.blocks)
                .map(async block => ({
                    letter: block.letter,
                    cubeIdx: block.cubeIdx,
                    isVirtualCube: block.cubeIdx === -1,
                    virtualCubeId: block.virtualCubeId,
                    exists: block.cubeIdx !== -1 &&
                        Boolean(await cubeDb.getCubeByDatabaseAndIdx(modelId, block.cubeIdx)),
                }))),
        })));

    const resolvedDataflows: ResolvedDataflowCubes[] = [];
    const virtualCubeSources = new Map<string, Set<number>>();
    for (const dataflow of dataflows) {
        const blocksByLetter = new Map(dataflow.blocks.map(block => [block.letter, block]));
        const targetBlock = blocksByLetter.get(dataflow.target);
        if (!targetBlock) {
            console.warn(`Cannot find target cube for block ${dataflow.target}`);
            continue;
        }
        if (!targetBlock.isVirtualCube && !targetBlock.exists) {
            console.warn(`Cannot find target cube for block ${dataflow.target}`);
            continue;
        }

        const sourceCubeIds = new Set<number>();
        for (const source of dataflow.sources) {
            const sourceBlock = blocksByLetter.get(source);
            if (!sourceBlock) {
                console.warn(`Cannot find source cube for block ${source}`);
                continue;
            }

            if (sourceBlock.isVirtualCube) {
                const virtualSources = sourceBlock.virtualCubeId
                    ? virtualCubeSources.get(sourceBlock.virtualCubeId)
                    : undefined;
                if (!virtualSources) {
                    console.warn(`Cannot find source cube for block ${source}`);
                    continue;
                }
                for (const cubeId of virtualSources) sourceCubeIds.add(cubeId);
            } else if (sourceBlock.exists) {
                sourceCubeIds.add(sourceBlock.cubeIdx);
            } else {
                console.warn(`Cannot find source cube for block ${source}`);
            }
        }

        if (targetBlock.isVirtualCube) {
            if (!targetBlock.virtualCubeId) {
                console.warn(`Cannot find virtual cube ID for block ${dataflow.target}`);
                continue;
            }
            const virtualSources = virtualCubeSources.get(targetBlock.virtualCubeId) ?? new Set<number>();
            for (const cubeId of sourceCubeIds) virtualSources.add(cubeId);
            virtualCubeSources.set(targetBlock.virtualCubeId, virtualSources);
            resolvedDataflows.push({ sourceCubeIds: [...sourceCubeIds] });
            continue;
        }

        resolvedDataflows.push({
            sourceCubeIds: [...sourceCubeIds],
            targetCubeId: targetBlock.cubeIdx,
        });
    }

    return resolvedDataflows;
}

export function extractVariables(expression: string): string[] {
    const matches = expression.match(/\b[a-zA-Z]\b/g)
    return [...new Set(matches ?? [])]
}
