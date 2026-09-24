import ProcedureDatabase, { type ProcedureRecord } from "../procedure/ProcedureDatabase";
import Procedure from "../procedure/Procedure";
import DataflowStep from "../procedure/step/DataflowStep";
import CubeDatabase, { type CubeEdge, type CubeEdgeProcedure } from "../cube/CubeDatabase";


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
          name: await cDb.getCubeByDatabaseAndIdx(defaultDatabase, block.cubeIdx), 
        })))
    })));

  const edges: CubeEdge[] = [];
  for (const dataflow of dataflows) {
    const blocksByLetter = new Map(
      dataflow.blocks.map(block => [block.letter, block])
    );
    const targetBlock = blocksByLetter.get(dataflow.target);

    if (!targetBlock?.name) {
      console.warn(`Cannot find target cube for block ${dataflow.target}`);
      continue;
    }

    for (const source of dataflow.sources) {
      const sourceBlock = blocksByLetter.get(source);
      if (!sourceBlock?.name) {
        console.warn(`Cannot find source cube for block ${source}`);
        continue;
      }

      edges.push({
        id: CubeDatabase.getEdgeId(
          defaultDatabase,
          sourceBlock.idx,
          defaultDatabase,
          targetBlock.idx,
        ),
        fromModelId: defaultDatabase,
        fromCubeId: sourceBlock.idx,
        toModelId: defaultDatabase,
        toCubeId: targetBlock.idx,
        procedures: [dataflow.procedure],
      });
    }
  }

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


function extractVariables(expression: string): string[] {
  const matches = expression.match(/\b[a-zA-Z]\b/g);
  return [...new Set(matches ?? [])];
}

