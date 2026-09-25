import DirectedGraph from "./DirectedGraph";
import ProcedureDatabase, { type ProcedureRecord } from "../procedure/ProcedureDatabase";

export async function loadProcedureGraph(db: ProcedureDatabase, databases?: string[]): Promise<DirectedGraph<string>> {
    const graph = new DirectedGraph<string>();
    const databaseSet = databases ? new Set(databases) : null;

    const nodes: ProcedureRecord[] = databaseSet
        ? await db.procedures.where("defaultDatabase").equals([...databaseSet]).toArray()
        : await db.procedures.toArray();
    
    for (const node of nodes) {
        graph.addNode(ProcedureDatabase.getId( {defaultDatabase: node.defaultDatabase, name: node.name} ));
    }

    const edges = await db.procedureEdges.toArray();
    for (const edge of edges) {
        if (databaseSet && (!databaseSet.has(edge.fromDefaultDatabase) || !databaseSet.has(edge.toDefaultDatabase))) {
            continue;
        }

        graph.addEdge(
            ProcedureDatabase.getId({defaultDatabase: edge.fromDefaultDatabase, name: edge.fromName}),
            ProcedureDatabase.getId({defaultDatabase: edge.toDefaultDatabase, name: edge.toName}),
        );
    }

    return graph;
    
}