import ProcedureDatabase from "./procedure/ProcedureDatabase"
import CubeDatabase from "./cube/CubeDatabase"
import type { ProcedureIdentifier } from "./extensionModel"

type ProcedureMessage = {
    type: "GET_PROCEDURE"
    identifier: ProcedureIdentifier
}
type CubeMessage = {
    type: "GET_CUBE"
    modelId: string
    name?: string
}

type MessageResponse = {
    success: boolean
    data?: unknown
    error?: string
}

declare const chrome: {
    runtime: {
        onMessage: {
            addListener(
                listener: (
                    message: ProcedureMessage | CubeMessage,
                    sender: unknown,
                    sendResponse: (response: MessageResponse) => void,
                ) => boolean | void,
            ): void
        }
    }
}

const procedureDatabase = new ProcedureDatabase()
const cubeDatabase = new CubeDatabase()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_CUBE") {
        cubeDatabase.cubes
            .where("modelId").equals(message.modelId)
            .toArray()
            .then(cubes => sendResponse({
                success: true,
                data: cubes.find(cube => cube.name === message.name),
            }))
            .catch(error => sendResponse({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            }))

        return true
    }

    if (message?.type !== "GET_PROCEDURE") return

    procedureDatabase.procedures
        .get(ProcedureDatabase.getId(message.identifier))
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }))

    return true
})