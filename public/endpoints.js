// Board API endpoint resources shared by the page bridge and custom tabs.
// Entries inherit from the nearest earlier Board version when not overridden.
const RESOURCES = {
  "12.5": {
    getClientInfo: { url: "/api/infos/get", method: "GET" },
    getDatabasesDefinitions: { url: "/api/databaseManager/getDatabasesDefinitions", method: "GET" },
    getImpactAnalysis: { url: "/api/AdvImpactAnalysisManager/get?dbName={dbname}", method: "GET" },
    getLogs: { url: "/api/logsManager/getLogs?dbName={dbname}", method: "GET" },
    backupDatabase: { url: "/api/databaseManager/backupDatabase", method: "POST" },
    snapshot: { url: "/api/TransporterSnapshotsManager/add", method: "POST" },
    unloadDatabase: { url: "/api/summary/unloadDatabase?dbName={dbname}", method: "POST" },
    activeMaintenanceMode: { url: "/api/summary/activeMaintenanceMode?dbName={dbname}", method: "POST" },
    deactiveMaintenanceMode: { url: "/api/summary/deactiveMaintenanceMode?dbName={dbname}", method: "POST" },
    addEntity: { url: "/api/EntitiesManager/AddEntity?dbName={dbname}", method: "POST" },
    getAllEntities: { url: "/api/entitiesManager/getAllEntitiesWithSaturation?dbName={dbname}", method: "POST", data: "2" },
    getAllEntitiesWithSaturation: { url: "/api/entitiesManager/getAllEntitiesWithSaturation?dbName={dbname}", method: "POST", data: "2" },
    getElementList: { url: "/api/EntitiesManager/getElementList?dbName={dbname}&entityIdx={uniqueId}&page={page}", method: "GET" },
    updateMembers: { url: "/api/entitiesManager/updateMembers?dbName={dbname}&entityIdx={uniqueId}", method: "POST" },
    addCube: { url: "/api/CubesManager/AddCube?dbName={dbname}", method: "POST" },
    getAllCubes: { url: "/api/cubesManager/getAllCubes?loadSize=false&dbName={dbname}", method: "GET" },
    getCubeImpact: { url: "/api/impactAnalysisManager/GetImpactAnalysisResultFromCube?cubeIdx={uniqueId}&dbName={dbname}", method: "GET" },
    getRelations: { url: "/api/relationships/GetRelations?dbName={dbname}&isTemporal=false", method: "GET" },
    buttonUpScan: { url: "/api/relationships/ButtonUpScan?isTemporal=false&dbName={dbname}", method: "GET" },
    topDownScan: { url: "/api/relationships/TopDownScan?isTemporal=false&dbName={dbname}", method: "GET" },
    getCoreProcedures: { url: "/api/databaseProceduresManager/getCoreProcedures?path={dbname}", method: "GET" },
    getProcedures: { url: "/api/databaseProceduresManager/getProcedures?path={dbname}", method: "POST" },
    addOrUpdateProcedure: { url: "/api/databaseProceduresManager/addOrUpdateProcedure?path={dbname}", method: "POST" },
    getCapsules: { url: "/api/Capsules/Get", method: "GET" },
    getSitemap: { url: "/api/capsulesDesigner/getSitemap?capsulePath={path}&screenId=00000000-0000-0000-0000-000000000000", method: "GET" },
    getCapsuleCoreProcedures: { url: "/api/CapsuleProceduresManager/GetCoreProcedures?path={path}", method: "GET" },
    getCapsuleProcedures: { url: "/api/CapsuleProceduresManager/getProcedures?path={path}", method: "POST" },
    addOrUpdateCapsuleProcedure: { url: "/api/CapsuleProceduresManager/addOrUpdateProcedure?path={dbname}", method: "POST" },
    getCapsuleProperties: { url: "/api/CapsuleDesignerPropertiesManager/GetCapsuleProperties?capsulePath={path}", method: "GET" },
    getProtocolsTable: { url: "/api/dataReaderManager/getProtocolsTable?addAll=true&dbName={dbname}", method: "GET" },
    getProtocol: { url: "/api/dataReaderManager/getProtocol?dbName={dbname}&idx={idx}&type={type}", method: "GET" },
    getMdbItems: { url: "/api/dataReaderManager/getMdbItems?showEntityCustomSort=false&dbName={dbname}", method: "GET" },
    saveProtocolSQL: { url: "/api/sqlDataReader/saveProtocol?dbName={dbname}", method: "POST" },
    saveProtocolText: { url: "/api/textFileDataReader/saveProtocol?dbName={dbname}", method: "POST" },
    saveProtocolSAP: { url: "/api/sapDataReader/saveProtocol?dbName={dbname}", method: "POST" },
    getScreen: { url: "/api/Screen/GetScreen", method: "POST" },
    updateScreen: { url: "/api/Screen/SaveScreen", method: "PUT" },
    authObjectsManager: { url: "/api/authObjectsManager/GetExtendedAuthObjects", method: "GET" },
    addNewAuthObject: { url: "/api/authObjectsManager/addAuthObject?cacheInfoId=undefined", method: "POST" },
    getDbProfiles: { url: "/api/dbProfileManager/getDbProfiles?dbName={dbname}", method: "GET" },
    getTasks: { url: "/api/taskManager/getTasks", method: "GET" },
  },
  "12.6": {},
  "14.1": {
    getClientInfo: { url: "/api/Infos/GetClientInfo", method: "GET" },
    startConnectionId: { url: "/api/Procedures/Start?connectionId={connectionId}", method: "GET" },
    getDatabasesDefinitions: { url: "/api/DatabaseManager/GetDatabasesDefinitions", method: "GET" },
    getImpactAnalysis: { url: "/api/AdvImpactAnalysisManager/Get?dbName={dbname}", method: "GET" },
    getLogs: { url: "/api/LogsManager/GetLogs?dbName={dbname}", method: "GET" },
    backupDatabase: { url: "/api/databaseManager/backupDatabase", method: "POST" },
    snapshot: { url: "/api/DatabaseTransporterSnapshotsManager/add", method: "POST" },
    unloadDatabase: { url: "/api/Summary/UnloadDatabase?dbName={dbname}", method: "GET" },
    activeMaintenanceMode: { url: "/api/Summary/ActiveMaintenanceMode?dbName={dbname}", method: "GET" },
    deactiveMaintenanceMode: { url: "/api/Summary/DeactiveMaintenanceMode?dbName={dbname}", method: "GET" },
    addEntity: { url: "/api/EntitiesManager/AddEntity?dbName={dbname}", method: "POST" },
    getAllEntities: { url: "/api/EntitiesManager/GetAllEntities?dbName={dbname}", method: "POST", data: "0" },
    getAllEntitiesWithSaturation: { url: "/api/EntitiesManager/GetAllEntities?dbName={dbname}", method: "POST", data: "0" },
    getElementList: { url: "/api/EntitiesManager/getElementList?dbName={dbname}&entityIdx={uniqueId}&page={page}", method: "GET" },
    updateMembers: { url: "/api/EntitiesManager/UpdateMembers?dbName={dbname}&entityIdx={uniqueId}", method: "POST" },
    addCube: { url: "/api/CubesManager/AddCube?dbName={dbname}", method: "POST" },
    getAllCubes: { url: "/api/CubesManager/GetAllCubes?dbName={dbname}&loadSize=false", method: "GET" },
    getCubeImpact: { url: "/api/ImpactAnalysisManager/GetImpactAnalysisResultForCube?cubeIdx={uniqueId}&dbName={dbname}", method: "GET" },
    getRelations: { url: "/api/relationships/GetRelations?dbName={dbname}&isTemporal=false", method: "GET" },
    buttonUpScan: { url: "/api/relationships/ButtonUpScan?dbName={dbname}&isTemporal=false", method: "GET" },
    topDownScan: { url: "/api/relationships/TopDownScan?dbName={dbname}&isTemporal=false", method: "GET" },
    getCoreProcedures: { url: "/api/DatabaseProceduresManager/GetCoreProcedures?path={dbname}", method: "GET" },
    getProcedures: { url: "/api/DatabaseProceduresManager/GetProcedures?path={dbname}", method: "POST" },
    addOrUpdateProcedure: { url: "/api/DatabaseProceduresManager/AddOrUpdateProcedure?path={dbname}", method: "POST" },
    addOrUpdateProcedures: { url: "/api/DatabaseProceduresManager/AddOrUpdateProcedures?path={dbname}", method: "POST" },
    getCapsules: { url: "/api/Capsules/GetCapsules", method: "GET" },
    getSitemap: { url: "/api/Capsules/GetSitemap?capsulePath={path}&screenId=00000000-0000-0000-0000-000000000000&isDesign=false", method: "GET" },
    getCapsuleCoreProcedures: { url: "/api/CapsuleProceduresManager/GetCoreProcedures?path={path}", method: "GET" },
    getCapsuleProcedures: { url: "/api/CapsuleProceduresManager/getProcedures?path={path}", method: "POST" },
    addOrUpdateCapsuleProcedure: { url: "/api/CapsuleProceduresManager/AddOrUpdateProcedure?path={dbname}", method: "POST" },
    addOrUpdateCapsulesProcedures: { url: "/api/CapsuleProceduresManager/AddOrUpdateProcedures?path={dbname}", method: "POST" },
    getCapsuleProperties: { url: "/api/CapsuleDesignerPropertiesManager/GetCapsuleProperties?capsulePath={path}", method: "GET" },
    updatePropertiesDefinition: { url: "/api/CapsuleDesignerPropertiesManager/UpdatePropertiesDefinition?capsulePath={path}", method: "GET" },
    getProtocolsTable: { url: "/api/DataReaderManager/GetProtocolsTable?dbName={dbname}&addAll=true", method: "GET" },
    getProtocol: { url: "/api/dataReaderManager/getProtocol?dbName={dbname}&idx={idx}&type={type}", method: "GET" },
    getMdbItems: { url: "/api/dataReaderManager/getMdbItems?showEntityCustomSort=false&dbName={dbname}", method: "GET" },
    saveProtocolSQL: { url: "/api/sqlDataReader/saveProtocol", method: "POST" },
    saveProtocolText: { url: "/api/textFileDataReader/saveProtocol", method: "POST" },
    saveProtocolSAP: { url: "/api/sapDataReader/saveProtocol", method: "POST" },
    getScreen: { url: "/api/Screen/GetScreen", method: "POST" },
    updateScreen: { url: "/api/ScreenDesigner/Update", method: "POST" },
    clearScreenStates: { url: "/api/Screen/ClearScreensStates", method: "POST" },
    addNewAuthObject: { url: "/api/AuthObjectsManager/AddNewAuthenticationjObject", method: "POST" },
    getDbProfiles: { url: "/api/DbProfileManager/GetDatabaseProfiles?dbName={dbname}", method: "GET" },
    layoutEditorOpen: { url: "/api/OpenLayoutEditor/OpenLayoutEditorForProcedureStep?database={dbname}&procedureName={procedureId}&actionId={actionId}&isDatabaseStep=true&actionTypeDto={actionType}&layoutId={layoutId}", method: "GET" },
    layoutEditorBlocksAnalysis: { url: "/api/LayoutEditor/GetCubeBlocksAnalysis?controlId={controlId}&cpsPath=PROCEDURE_STEP_CAPSULE_PATH&screenId={screenId}", method: "POST" },
    layoutEditorUpdateLayout: { url: "/api/LayoutEditor/UpdateProcedureLayoutState?controlId={controlId}&cpsPath=PROCEDURE_STEP_CAPSULE_PATH&screenId={screenId}&updatePreview=false&isDatabaseStep=true&procedurePath={dbname}&procedureName={procedureId}", method: "POST" },
    layoutEditorApplyDFLayout: { url: "/api/ActionConfigurator/UpdateConfiguredDataFlowLayout", method: "POST" },
    layoutEditorProcedureGetBlockLayout: { url: "/api/ActionConfigurator/ProcedureGetBlockArgs?path={dbname}&procedureName={procedureId}&procedureTypeDto=1&actionGuid={actionId}&areNotSavedItems={isNotSaved}&useVirtualCubes=true", method: "GET" },
  },
  "14.2": {
    getElementList: { url: "/api/EntitiesManager/GetElementList?dbName={dbname}&entityIdx={uniqueId}&page={page}", method: "GET" },
    getDatabasesDefinitions: { url: "/api/DatabaseManager/GetDatabasesDefinitions", method: "GET" },
    saveProtocolText: { url: "/api/TextFileDataReader/SaveProtocol?dbName={dbname}", method: "POST" },
    saveProtocolSQL: { url: "/api/SqlDataReader/SaveProtocol?dbName={dbname}", method: "POST" },
    saveProtocolSAP: { url: "/api/SapDataReader/SaveProtocol?dbName={dbname}", method: "POST" },
  },
  "14.3": {
    getAllEntities: { url: "/api/EntitiesManager/GetAllEntities?dbName={dbname}", method: "GET" },
    getAllEntitiesWithSaturation: { url: "/api/EntitiesManager/GetAllEntities?dbName={dbname}", method: "GET" },
    getRelations: { url: "/api/EntitiesManager/GetAllEntities?dbName={dbname}", method: "GET" },
  },
  "14.4": {
    addOrUpdateProcedure: { url: "/api/DatabaseProceduresManager/AddOrUpdateProcedures?path={dbname}", method: "POST" },
    addOrUpdateCapsuleProcedure: { url: "/api/CapsuleProceduresManager/AddOrUpdateProcedures?path={dbname}", method: "POST" },
  },
  "14.5": {},
  "14.6": {},
};

function resolveEndpoint(name, version) {
  const versions = Object.keys(RESOURCES).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
  let idx = versions.indexOf(version);
  if (idx === -1) idx = versions.length - 1;
  for (let i = idx; i >= 0; i--) {
    const resource = RESOURCES[versions[i]]?.[name];
    if (resource) return resource;
  }
  throw new Error(`No endpoint defined for "${name}" at or before version ${version}`);
}

function buildUrl(template, vars) {
  let url = template;
  for (const [key, value] of Object.entries(vars || {})) {
    url = url.replaceAll(`{${key}}`, encodeURIComponent(value));
  }
  return url;
}
