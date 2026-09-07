import procedure_example from "../data/procedure_example.json"
import procedures_list from "../data/procedures.json"
import { createProcedureModel } from "./extensionModel"

const { procedure, proceduresToExecute } = createProcedureModel(
	procedures_list,
	procedure_example[0],
)

console.log(procedure)
console.log(proceduresToExecute)
