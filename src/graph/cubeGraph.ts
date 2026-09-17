import DirectedGraph from "./DirectedGraph";
import CubeDatabase from "../cube/CubeDatabase";

export async function loadCubeGraph(db: CubeDatabase, modelIds?: string[]): Promise<DirectedGraph<string>> {
    const graph = new DirectedGraph<string>();
    const modelSet = modelIds ? new Set(modelIds) : null;

    const nodes = modelSet 
        ? await db.cubes.where("modelId").equals([...modelSet]).toArray()
        : await db.cubes.toArray();

    for (const node of nodes) {
        graph.addNode(CubeDatabase.getId(node.modelId, node.cubeId));
    }

    const edges = await db.cubeEdges.toArray();
    for (const edge of edges) {
        if (modelSet && (!modelSet.has(edge.fromModelId) || !modelSet.has(edge.toModelId))) {
            continue;
        }

        graph.addEdge(
            CubeDatabase.getId(edge.fromModelId, edge.fromCubeId),
            CubeDatabase.getId(edge.toModelId, edge.toCubeId),
        );
    }

    return graph;
}