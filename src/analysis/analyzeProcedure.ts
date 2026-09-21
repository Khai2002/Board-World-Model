import ProcedureDatabase, { type ProcedureRecord } from "../procedure/ProcedureDatabase";
import Procedure from "../procedure/Procedure";
import DataflowStep from "../procedure/step/DataflowStep";


export async function analyzeProcedureSteps(name: string, defaultDatabase: string): Promise<void> {
    const db = new ProcedureDatabase();
    const procedureId: string = ProcedureDatabase.getId({name, defaultDatabase});
    const procedureJSON: ProcedureRecord | undefined = await db.getDetailsById(procedureId);
    
    if(!procedureJSON) {
        console.log(`Cannot find procedure with key ${procedureId}`);
        return;
    }

    const procedure: Procedure = Procedure.fromJSON(procedureJSON);
    console.log(procedure);
    console.log(procedure.getStepsByType(DataflowStep).map(dStep => extractVariables(dStep.expression)));
    console.log(procedure.getStepsByType(DataflowStep)
                        .flatMap(dStep => dStep.layouts)
                        .flatMap(layouts => layouts.blocks)
                        .map(block => ({ letter: block.letter, idx: block.cubeIdx })))
}

function extractVariables(expression: string): string[] {
  const matches = expression.match(/\b[a-zA-Z]\b/g);
  return [...new Set(matches ?? [])];
}

