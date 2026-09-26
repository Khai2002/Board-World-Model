import ProcedureDatabase, { type ProcedureRecord } from "../procedure/ProcedureDatabase";
import Procedure from "../procedure/Procedure";
import DataflowStep from "../procedure/step/DataflowStep";
import CubeDatabase, { type CubeEdge, type CubeEdgeProcedure } from "../cube/CubeDatabase";


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
          virtualCubeId: block.virtualCubeId,
          name: 
            block.cubeIdx === -1
              ? undefined
              : await cDb.getCubeByDatabaseAndIdx(defaultDatabase, block.cubeIdx), 
        })))
    })));

  const edgesById = new Map<string, CubeEdge>();
  const virtualCubeSources = new Map<string, Set<number>>();
  for (const dataflow of dataflows) {
    const blocksByLetter = new Map(
      dataflow.blocks.map(block => [block.letter, block])
    );
    const targetBlock = blocksByLetter.get(dataflow.target);

    if (!targetBlock) {
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
      } else if (sourceBlock.name) {
        sourceCubeIds.add(sourceBlock.idx);
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
      continue;
    }

    if (!targetBlock.name) {
      console.warn(`Cannot find target cube for block ${dataflow.target}`);
      continue;
    }

    for (const sourceCubeId of sourceCubeIds) {
      const edge: CubeEdge = {
        id: CubeDatabase.getEdgeId(
          defaultDatabase,
          sourceCubeId,
          defaultDatabase,
          targetBlock.idx,
        ),
        fromModelId: defaultDatabase,
        fromCubeId: sourceCubeId,
        toModelId: defaultDatabase,
        toCubeId: targetBlock.idx,
        procedures: [dataflow.procedure],
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


function extractVariables(expression: string): string[] {
  const matches = expression.match(/\b[a-zA-Z]\b/g);
  return [...new Set(matches ?? [])];
}

