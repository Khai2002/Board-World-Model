import type { ProcedureIdentifier } from "../procedure/ProcedureRegistry"

export type StepJSON = {
    discriminator: string
    actionType: number
    comment: string
    detail: string
    name: string
    id: string
    databaseName: string
    configuredLayoutIds?: string[]
    layouts?: unknown

    // Depending on the discriminator, additional fields can exist
    procedureToExecute?: ProcedureIdentifier
}

export type ProcedureGroupJSON = {
    debugCounter: number
    description: string
    steps: StepJSON[]
    id: string
}


export type ProcedureJSON = {
  procedureBehaviour: number
  procedureWindowEnum: number
  procedureGroups: ProcedureGroupJSON[]
  virtualCubesList: any[]
  oldDescription: string
  name: string
  description: string
  procedureType: number
  defaultDatabase: string
}

export type ProcedureMetadataJSON = {
  oldDescription: string
  name: string
  description: string
  procedureType: number
  defaultDatabase: string
}