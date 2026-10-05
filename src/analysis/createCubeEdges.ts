import ProcedureDatabase, { type ProcedureRecord } from "../database/ProcedureDatabase";
import Procedure from "../procedure/Procedure";
import DataflowStep from "../procedure/step/DataflowStep";
import CubeDatabase, { type CubeEdge, type CubeEdgeProcedure } from "../database/CubeDatabase";
import { extractVariables, resolveDataflowCubes } from "./resolveDataflowCubes";


export async function testCubeEdges(
  name: string,
  defaultDatabase: string,
): Promise<void> {
  const pDb = new ProcedureDatabase();
  const cDb = new CubeDatabase();

  const procedureId: string = ProcedureDatabase.getId({name, defaultDatabase});
  const procedureJSON: ProcedureRecord | undefined = await pDb.getDetailsById(procedureId);
  
  if(!procedureJSON) {
      console.log(`Cannot find procedure with key ${procedureId}`);
      return;
  }

  const procedure: Procedure = Procedure.fromJSON(procedureJSON);
  const procedureReference: CubeEdgeProcedure = {
    id: procedureId,
    description: procedure.description,
  };

  const dataflows = await Promise.all(procedure.getStepsByType(DataflowStep)
    .map(async dStep => ({
      database: defaultDatabase,
      procedure: procedureReference,
      target: dStep.targetLetter,
      sources: extractVariables(dStep.expression),
      blocks: await Promise.all(dStep.layouts
        .flatMap(layout => layout.blocks)
        .map(async block => ({ 
          letter: block.letter, 
          idx: block.cubeIdx,
          isVirtualCube: block.cubeIdx === -1 ? true : false,
          name: 
            block.cubeIdx === -1
              ? { id: block.virtualCubeId }
              : await cDb.getCubeByDatabaseAndIdx(defaultDatabase, block.cubeIdx), 
        })))
    })));
  
  console.log(dataflows);
  return;

}

export async function createCubeEdgesFromDataflow(
  name: string,
  defaultDatabase: string,
): Promise<number> {
  const pDb = new ProcedureDatabase();
  const cDb = new CubeDatabase();

  const procedureId: string = ProcedureDatabase.getId({name, defaultDatabase});
  const procedureJSON: ProcedureRecord | undefined = await pDb.getDetailsById(procedureId);
  
  if(!procedureJSON) {
      console.log(`Cannot find procedure with key ${procedureId}`);
      return 0;
  }

  const procedure: Procedure = Procedure.fromJSON(procedureJSON);
  const procedureReference: CubeEdgeProcedure = {
    id: procedureId,
    description: procedure.description,
  };
  const dataflows = await resolveDataflowCubes(procedure, defaultDatabase, cDb);

  const edgesById = new Map<string, CubeEdge>();
  for (const dataflow of dataflows) {
    if (dataflow.targetCubeId === undefined) continue;

    for (const sourceCubeId of dataflow.sourceCubeIds) {
      const edge: CubeEdge = {
        id: CubeDatabase.getEdgeId(
          defaultDatabase,
          sourceCubeId,
          defaultDatabase,
          dataflow.targetCubeId,
        ),
        fromModelId: defaultDatabase,
        fromCubeId: sourceCubeId,
        toModelId: defaultDatabase,
        toCubeId: dataflow.targetCubeId,
        procedures: [procedureReference],
      };
      edgesById.set(edge.id, edge);
    }
  }

  const edges = [...edgesById.values()];
  if (edges.length > 0) {
    const existingEdges = await cDb.cubeEdges.bulkGet(edges.map(edge => edge.id));
    const mergedEdges = edges.map((edge, index) => {
      const existing = existingEdges[index];
      const procedures = new Map(
        [...(existing?.procedures ?? []), ...(edge.procedures ?? [])]
          .map(procedure => [procedure.id, procedure]),
      );
      return { ...edge, procedures: [...procedures.values()] };
    });
    await cDb.cubeEdges.bulkPut(mergedEdges);
  }

  return edges.length;
}
