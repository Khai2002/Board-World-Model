import ProcedureDatabase, { type ProcedureRecord } from "../procedure/ProcedureDatabase";
import Procedure from "../procedure/Procedure";
import DataflowStep from "../procedure/step/DataflowStep";
import CubeDatabase, { type CubeEdge } from "../cube/CubeDatabase";


export async function analyzeDataflowDependency(name: string, defaultDatabase: string): Promise<void> {
  const pDb = new ProcedureDatabase();
  const cDb = new CubeDatabase();

  const procedureId: string = ProcedureDatabase.getId({name, defaultDatabase});
  const procedureJSON: ProcedureRecord | undefined = await pDb.getDetailsById(procedureId);
  
  if(!procedureJSON) {
      console.log(`Cannot find procedure with key ${procedureId}`);
      return;
  }

  const procedure: Procedure = Procedure.fromJSON(procedureJSON);
  const dataflows = await Promise.all(procedure.getStepsByType(DataflowStep)
    .map(async dStep => ({
      database: defaultDatabase,
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
          dataflow.database,
          sourceBlock.idx,
          dataflow.database,
          targetBlock.idx,
        ),
        fromModelId: dataflow.database,
        fromCubeId: sourceBlock.idx,
        toModelId: dataflow.database,
        toCubeId: targetBlock.idx,
      });
    }
  }

  console.log(edges)

  if (edges.length > 0) {
    //await cDb.cubeEdges.bulkPut(edges);
  }
}


function extractVariables(expression: string): string[] {
  const matches = expression.match(/\b[a-zA-Z]\b/g);
  return [...new Set(matches ?? [])];
}

