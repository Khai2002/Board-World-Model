import Procedure from "../procedure/Procedure";
import ProcedureDatabase, { type ProcedureEdge, type ProcedureRecord } from "../procedure/ProcedureDatabase";
import CallProcedureStep from "../procedure/step/CallProcedureStep";

export async function createProcedureEdgesFromCallProcedure(
    name: string,
    defaultDatabase: string,
): Promise<number> {
    const pDb = new ProcedureDatabase();

    const procedureJSON: ProcedureRecord | undefined = await pDb.getDetailsByDatabaseAndIdx(defaultDatabase, name);

    if(!procedureJSON) {
        console.log(`Cannot find procedure with key ${ProcedureDatabase.getId({name, defaultDatabase})}`);
        return 0;
    }

    const procedure: Procedure = Procedure.fromJSON(procedureJSON);
    const from = {name: procedure.name, defaultDatabase: procedure.defaultDatabase};
    const edges: ProcedureEdge[] = procedure.getStepsByType(CallProcedureStep)
        .map(step => {
            const to = step.procedureToExecute;
            return {
                id: ProcedureDatabase.getEdgeId(from, to),
                fromName: from.name,
                fromDefaultDatabase: from.defaultDatabase,
                toName: to.name,
                toDefaultDatabase: to.defaultDatabase,
            };
        });

    if (edges.length > 0) {
        await pDb.procedureEdges.bulkPut(edges);
    }

    return edges.length;
}