const status = document.getElementById("status");
const cubesList = document.getElementById("cubes");
const cubeModelFilter = document.getElementById("cubeModelFilter");
const cubeModelOptions = document.getElementById("cubeModelOptions");
const cubeModelFilterSummary = document.getElementById("cubeModelFilterSummary");
const clearCubeModelFilter = document.getElementById("clearCubeModelFilter");
const procedureModelFilter = document.getElementById("procedureModelFilter");
const procedureModelOptions = document.getElementById("procedureModelOptions");
const procedureModelFilterSummary = document.getElementById("procedureModelFilterSummary");
const clearProcedureModelFilter = document.getElementById("clearProcedureModelFilter");
const deleteAllButton = document.getElementById("deleteAllButton");
const cubesTab = document.getElementById("cubesTab");
const proceduresTab = document.getElementById("proceduresTab");
const capsuleProceduresTab = document.getElementById("capsuleProceduresTab");
const capsulesTab = document.getElementById("capsulesTab");
const cubesPanel = document.getElementById("cubesPanel");
const proceduresPanel = document.getElementById("proceduresPanel");
const capsuleProceduresPanel = document.getElementById("capsuleProceduresPanel");
const capsulesPanel = document.getElementById("capsulesPanel");
const tabs = document.querySelector(".tabs");
const proceduresList = document.getElementById("procedures");
const cubeStorageSize = document.getElementById("cubeStorageSize");
const procedureStorageSize = document.getElementById("procedureStorageSize");
const cubeSearch = document.getElementById("cubeSearch");
const procedureSearch = document.getElementById("procedureSearch");
const capsuleProceduresList = document.getElementById("capsuleProcedures");
const capsuleProcedureStorageSize = document.getElementById("capsuleProcedureStorageSize");
const capsuleProcedureSearch = document.getElementById("capsuleProcedureSearch");
const capsulesList = document.getElementById("capsules");
const screensList = document.getElementById("screens");
const capsuleStorageSize = document.getElementById("capsuleStorageSize");
const screenStorageSize = document.getElementById("screenStorageSize");
const capsuleSearch = document.getElementById("capsuleSearch");
const screenSearch = document.getElementById("screenSearch");

const detailsTab = document.createElement("button");
detailsTab.className = "tab";
detailsTab.id = "detailsTab";
detailsTab.type = "button";
detailsTab.setAttribute("role", "tab");
detailsTab.setAttribute("aria-selected", "false");
detailsTab.setAttribute("aria-disabled", "true");
detailsTab.disabled = true;
detailsTab.textContent = "Details";
detailsTab.hidden = true;
tabs.appendChild(detailsTab);

const detailsPanel = document.createElement("section");
detailsPanel.className = "tab-panel";
detailsPanel.id = "detailsPanel";
detailsPanel.setAttribute("role", "tabpanel");
detailsPanel.hidden = true;
const detailsHeading = document.createElement("h2");
const copyDetailsButton = document.createElement("button");
copyDetailsButton.type = "button";
copyDetailsButton.textContent = "Copy JSON";
copyDetailsButton.style.marginBottom = "8px";
const detailsSummary = document.createElement("div");
detailsSummary.id = "detailsSummary";
const detailsOutput = document.createElement("pre");
detailsOutput.hidden = true;
const graphHeading = document.createElement("h2");
graphHeading.textContent = "Graph";
graphHeading.hidden = true;
const graphDirectionSelect = document.createElement("select");
graphDirectionSelect.setAttribute("aria-label", "Graph connections");
graphDirectionSelect.append(
  new Option("All connections", "all"),
  new Option("Upstream only", "incoming"),
  new Option("Downstream only", "outgoing"),
);
graphDirectionSelect.hidden = true;
const graphDepthSelect = document.createElement("select");
graphDepthSelect.setAttribute("aria-label", "Graph depth");
graphDepthSelect.appendChild(new Option("All levels", "all"));
graphDepthSelect.hidden = true;
const graphFocusSelect = document.createElement("select");
graphFocusSelect.setAttribute("aria-label", "Focus node");
graphFocusSelect.hidden = true;
const clearGraphFocusButton = document.createElement("button");
clearGraphFocusButton.type = "button";
clearGraphFocusButton.textContent = "Clear focus";
clearGraphFocusButton.hidden = true;
const graphOutput = document.createElement("div");
graphOutput.id = "cubeGraph";
graphOutput.hidden = true;
const graphWorkspace = document.createElement("div");
graphWorkspace.id = "graphWorkspace";
const graphSelectionDetails = document.createElement("div");
graphSelectionDetails.id = "graphSelectionDetails";
const graphContextMenu = document.createElement("div");
graphContextMenu.className = "graph-context-menu";
graphContextMenu.setAttribute("role", "menu");
graphContextMenu.hidden = true;
const focusGraphNodeButton = document.createElement("button");
focusGraphNodeButton.type = "button";
focusGraphNodeButton.setAttribute("role", "menuitem");
focusGraphNodeButton.textContent = "Focus on this node";
graphContextMenu.appendChild(focusGraphNodeButton);
const rootGraphNodeButton = document.createElement("button");
rootGraphNodeButton.type = "button";
rootGraphNodeButton.setAttribute("role", "menuitem");
rootGraphNodeButton.textContent = "Make this the root node";
graphContextMenu.appendChild(rootGraphNodeButton);
Object.assign(detailsOutput.style, {
  margin: "0",
  padding: "12px",
  overflow: "auto",
  maxHeight: "65vh",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  background: "#f5f5f5",
  border: "1px solid #ddd",
  borderRadius: "4px",
  fontSize: "12px",
  lineHeight: "1.5",
});
graphWorkspace.append(graphOutput, graphSelectionDetails);
graphSelectionDetails.append(detailsHeading, copyDetailsButton, detailsSummary, detailsOutput);
detailsPanel.append(graphHeading, graphDirectionSelect, graphDepthSelect, graphFocusSelect, clearGraphFocusButton, graphWorkspace, graphContextMenu);
document.body.appendChild(detailsPanel);

let cubeGraphNetwork;
let graphRequestId = 0;
let currentGraphCube;
let currentGraphProcedure;
let currentGraphFocusId;
let focusGraphNode;
let makeRootGraphNode;
let currentDetailsJson = "";
let selectionDetailsRequestId = 0;
const graphGroupColors = [
  { background: "#dbeafe", border: "#2563eb" },
  { background: "#dcfce7", border: "#16a34a" },
  { background: "#fef3c7", border: "#d97706" },
  { background: "#fce7f3", border: "#db2777" },
  { background: "#ede9fe", border: "#7c3aed" },
  { background: "#cffafe", border: "#0891b2" },
  { background: "#ffedd5", border: "#ea580c" },
];
const unassignedGroupColor = { background: "#f1f5f9", border: "#64748b" };
const graphGroupColorByName = new Map();

function openCubeDatabase() {
  return window.BoardWorldModel.openCubeDatabase();
}

function openProcedureDatabase() {
  return window.BoardWorldModel.openProcedureDatabase();
}

function setModelOptions(modelIds) {
  const selectedModelIds = new Set(
    [...cubeModelOptions.querySelectorAll("input:checked")]
      .map(input => input.value),
  );
  cubeModelOptions.replaceChildren();
  for (const modelId of modelIds) {
    const label = document.createElement("label");
    label.className = "model-filter-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = modelId;
    checkbox.checked = selectedModelIds.has(modelId);
    label.append(checkbox, document.createTextNode(modelId));
    cubeModelOptions.appendChild(label);
  }
  updateCubeModelFilterSummary();
}

function setProcedureModelOptions(modelIds) {
  const selectedModelIds = new Set(
    [...procedureModelOptions.querySelectorAll("input:checked")]
      .map(input => input.value),
  );
  procedureModelOptions.replaceChildren();
  for (const modelId of modelIds) {
    const label = document.createElement("label");
    label.className = "model-filter-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = modelId;
    checkbox.checked = selectedModelIds.has(modelId);
    label.append(checkbox, document.createTextNode(modelId));
    procedureModelOptions.appendChild(label);
  }
  updateProcedureModelFilterSummary();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function estimateBytes(records) {
  return new Blob([JSON.stringify(records)]).size;
}

async function copyDetailsJson() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(currentDetailsJson);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = currentDetailsJson;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    copyDetailsButton.textContent = "Copied";
    setTimeout(() => { copyDetailsButton.textContent = "Copy JSON"; }, 1500);
  } catch (error) {
    console.error("Could not copy dashboard JSON:", error);
    copyDetailsButton.textContent = "Copy failed";
    setTimeout(() => { copyDetailsButton.textContent = "Copy JSON"; }, 1500);
  }
}

function showDetails(title, data, viewState) {
  const requestId = ++graphRequestId;
  selectionDetailsRequestId += 1;
  const graphData = data.cube || data.procedure;
  detailsHeading.textContent = title;
  currentDetailsJson = JSON.stringify(data, null, 2);
  detailsSummary.textContent = graphData
    ? "Loading node connections..."
    : "JSON is available using Copy JSON.";
  detailsPanel.classList.toggle("graph-layout", Boolean(graphData));
  graphHeading.hidden = !graphData;
  graphDirectionSelect.hidden = !graphData;
  graphDepthSelect.hidden = !graphData;
  graphFocusSelect.hidden = !graphData;
  clearGraphFocusButton.hidden = !graphData;
  graphDepthSelect.value = "all";
  currentGraphFocusId = undefined;
  graphOutput.hidden = !data.cube;
  currentGraphCube = data.cube;
  currentGraphProcedure = data.procedure;
  if (cubeGraphNetwork) {
    cubeGraphNetwork.destroy();
    cubeGraphNetwork = undefined;
  }
  detailsTab.hidden = false;
  detailsTab.classList.add("active");
  detailsTab.setAttribute("aria-selected", "true");
  cubesTab.classList.remove("active");
  proceduresTab.classList.remove("active");
  capsuleProceduresTab.classList.remove("active");
  capsulesTab.classList.remove("active");
  cubesTab.setAttribute("aria-selected", "false");
  proceduresTab.setAttribute("aria-selected", "false");
  capsuleProceduresTab.setAttribute("aria-selected", "false");
  capsulesTab.setAttribute("aria-selected", "false");
  cubesPanel.hidden = true;
  proceduresPanel.hidden = true;
  capsuleProceduresPanel.hidden = true;
  capsulesPanel.hidden = true;
  detailsPanel.hidden = false;
  graphOutput.hidden = !graphData;
  if (data.cube) {
    renderCubeGraph(data.cube, requestId, viewState);
    void showCubeUsageDetails(data.cube);
  }
  if (data.procedure) {
    renderProcedureGraph(data.procedure, requestId, viewState);
    void showProcedureUsageDetails(data.procedure);
  }
}

graphDirectionSelect.addEventListener("change", () => {
  if (currentGraphCube) renderCubeGraph(currentGraphCube, ++graphRequestId);
  if (currentGraphProcedure) renderProcedureGraph(currentGraphProcedure, ++graphRequestId);
});

graphDepthSelect.addEventListener("change", () => {
  if (currentGraphCube) renderCubeGraph(currentGraphCube, ++graphRequestId);
  if (currentGraphProcedure) renderProcedureGraph(currentGraphProcedure, ++graphRequestId);
});

graphFocusSelect.addEventListener("change", () => {
  currentGraphFocusId = graphFocusSelect.value || undefined;
  if (currentGraphCube) renderCubeGraph(currentGraphCube, ++graphRequestId);
  if (currentGraphProcedure) renderProcedureGraph(currentGraphProcedure, ++graphRequestId);
});

clearGraphFocusButton.addEventListener("click", () => {
  currentGraphFocusId = undefined;
  if (currentGraphCube) renderCubeGraph(currentGraphCube, ++graphRequestId);
  if (currentGraphProcedure) renderProcedureGraph(currentGraphProcedure, ++graphRequestId);
});

focusGraphNodeButton.addEventListener("click", () => {
  graphContextMenu.hidden = true;
  focusGraphNode?.();
});

rootGraphNodeButton.addEventListener("click", () => {
  graphContextMenu.hidden = true;
  makeRootGraphNode?.();
});

document.addEventListener("pointerdown", (event) => {
  if (!graphContextMenu.contains(event.target)) graphContextMenu.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") graphContextMenu.hidden = true;
});

function showGraphContextMenu(event, focusAction, rootAction, focusLabel, rootLabel) {
  event.preventDefault();
  focusGraphNode = focusAction;
  makeRootGraphNode = rootAction;
  focusGraphNodeButton.textContent = focusLabel;
  rootGraphNodeButton.textContent = rootLabel;
  graphContextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 210)}px`;
  graphContextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 88)}px`;
  graphContextMenu.hidden = false;
}

function cubeNodeId(modelId, cubeId) {
  return `${modelId}:${cubeId}`;
}

function cubeLabel(cube) {
  return cube.name || "Unnamed cube";
}

function cubeNodeTitle(cube) {
  return `${cubeLabel(cube)}\nID: ${cubeNodeId(cube.modelId, cube.cubeId)}`;
}

function cubeSelectLabel(cube) {
  return `${cubeLabel(cube)} (${cubeNodeId(cube.modelId, cube.cubeId)})`;
}

function curveReciprocalEdges(edges) {
  const edgeIds = new Set(edges.map(edge => `${edge.from}->${edge.to}`));
  return edges.map(edge => edgeIds.has(`${edge.to}->${edge.from}`)
    ? { ...edge, smooth: { type: "curvedCW", roundness: 0.2 } }
    : edge,
  );
}

function renderUsageCategories(description, categories) {
  detailsSummary.replaceChildren();
  const summary = document.createElement("p");
  summary.textContent = description;
  detailsSummary.appendChild(summary);

  const total = categories.reduce((count, category) => count + category.items.length, 0);
  if (total === 0) {
    const emptyState = document.createElement("p");
    emptyState.textContent = "No recorded procedure-cube relations. Use Generate all edges in the popup to build them.";
    detailsSummary.appendChild(emptyState);
  }

  for (const category of categories) {
    const heading = document.createElement("h3");
    heading.textContent = `${category.label} (${category.items.length})`;
    detailsSummary.appendChild(heading);
    if (category.items.length === 0) continue;

    const list = document.createElement("ul");
    for (const item of category.items) {
      const entry = document.createElement("li");
      entry.textContent = item.label;
      if (item.detail) {
        const detail = document.createElement("small");
        detail.className = "graph-usage-detail";
        detail.textContent = item.detail;
        entry.appendChild(detail);
      }
      list.appendChild(entry);
    }
    detailsSummary.appendChild(list);
  }
}

async function showCubeUsageDetails(cube) {
  const requestId = ++selectionDetailsRequestId;
  const cubeId = cubeNodeId(cube.modelId, cube.cubeId);
  detailsHeading.textContent = `Cube: ${cubeLabel(cube)}`;
  currentDetailsJson = JSON.stringify(cube, null, 2);
  try {
    const procedureDb = openProcedureDatabase();
    const [uses, procedures, metadata] = await Promise.all([
      procedureDb.procedureCubeUses.where("cubeRecordId").equals(cubeId).toArray(),
      procedureDb.procedures.toArray(),
      procedureDb.procedureMetadata.toArray(),
    ]);
    const proceduresById = new Map(procedures.map(procedure => [
      procedure.id,
      procedure,
    ]));
    const metadataById = new Map(metadata.map(procedure => [procedure.id, procedure]));
    const categorized = { read: [], write: [], readwrite: [] };
    for (const use of uses) {
      const procedure = proceduresById.get(use.procedureId);
      const procedureMetadata = metadataById.get(use.procedureId);
      const description = procedure?.description || procedureMetadata?.description || "Unnamed procedure";
      categorized[use.mode]?.push({
        label: description,
        detail: use.procedureDefaultDatabase,
      });
    }

    if (requestId !== selectionDetailsRequestId) return;
    renderUsageCategories("Procedures referencing this cube:", [
      { label: "Read this cube", items: categorized.read },
      { label: "Write this cube", items: categorized.write },
      { label: "Read and write this cube", items: categorized.readwrite },
    ]);
  } catch (error) {
    if (requestId !== selectionDetailsRequestId) return;
    console.error("Could not load cube procedure usage:", error);
    detailsSummary.textContent = `Could not load procedure usage: ${error.message}`;
  }
}

async function showProcedureUsageDetails(procedure) {
  const requestId = ++selectionDetailsRequestId;
  const procedureId = procedureNodeId(procedure.defaultDatabase, procedure.name);
  detailsHeading.textContent = `Procedure: ${procedureLabel(procedure)}`;
  currentDetailsJson = JSON.stringify(procedure, null, 2);
  try {
    const procedureDb = openProcedureDatabase();
    const cubeDb = openCubeDatabase();
    const [uses, cubes] = await Promise.all([
      procedureDb.procedureCubeUses.where("procedureId").equals(procedureId).toArray(),
      cubeDb.cubes.toArray(),
    ]);
    const cubesById = new Map(cubes.map(cube => [cube.id, cube]));
    const categorized = { read: [], write: [], readwrite: [] };
    for (const use of uses) {
      const cube = cubesById.get(use.cubeRecordId);
      categorized[use.mode]?.push({
        label: cube?.name || "Unnamed cube",
        detail: `${use.cubeModelId}:${use.cubeIdx}`,
      });
    }

    if (requestId !== selectionDetailsRequestId) return;
    renderUsageCategories("Cubes used directly by this procedure:", [
      { label: "Cubes read", items: categorized.read },
      { label: "Cubes written", items: categorized.write },
      { label: "Cubes read and written", items: categorized.readwrite },
    ]);
  } catch (error) {
    if (requestId !== selectionDetailsRequestId) return;
    console.error("Could not load procedure cube usage:", error);
    detailsSummary.textContent = `Could not load cube usage: ${error.message}`;
  }
}

async function selectGraphCube(cube) {
  const viewState = cubeGraphNetwork
    ? { scale: cubeGraphNetwork.getScale() }
    : undefined;
  const cubeEdges = await openCubeDatabase().cubeEdges.toArray();
  const relatedEdges = cubeEdges.filter(edge =>
    (edge.fromModelId === cube.modelId && edge.fromCubeId === cube.cubeId) ||
    (edge.toModelId === cube.modelId && edge.toCubeId === cube.cubeId)
  );
  showDetails(`Cube: ${cube.name || "Unnamed cube"}`, { cube, relatedEdges }, viewState);
}

async function selectGraphProcedure(procedure) {
  const viewState = cubeGraphNetwork
    ? { scale: cubeGraphNetwork.getScale() }
    : undefined;
  const procedureEdges = await openProcedureDatabase().procedureEdges.toArray();
  const relatedEdges = procedureEdges.filter(edge =>
    (edge.fromDefaultDatabase === procedure.defaultDatabase && edge.fromName === procedure.name) ||
    (edge.toDefaultDatabase === procedure.defaultDatabase && edge.toName === procedure.name)
  );
  showDetails(`Procedure: ${procedure.description || "Unnamed procedure"}`, {
    procedure,
    relatedEdges,
  }, viewState);
}

function cubeAssignedGroup(cube) {
  if (cube.data && typeof cube.data === "object" && typeof cube.data.assignedGroup === "string") {
    return cube.data.assignedGroup;
  }
  return "Unassigned";
}

function graphColorForGroup(group) {
  if (!graphGroupColorByName.has(group)) {
    const color = graphGroupColors[graphGroupColorByName.size % graphGroupColors.length];
    graphGroupColorByName.set(group, color || unassignedGroupColor);
  }
  return graphGroupColorByName.get(group) || unassignedGroupColor;
}

async function renderCubeGraph(selectedCube, requestId, viewState) {
  graphOutput.textContent = "Loading graph...";
  try {
    const db = openCubeDatabase();
    const [cubes, cubeEdges, graph] = await Promise.all([
      db.cubes.toArray(),
      db.cubeEdges.toArray(),
      window.BoardWorldModel.loadCubeGraphWrapper(),
    ]);
    if (requestId !== graphRequestId) return;

    const cubesById = new Map(cubes.map(cube => [cubeNodeId(cube.modelId, cube.cubeId), cube]));
    const selectedId = cubeNodeId(selectedCube.modelId, selectedCube.cubeId);
    const levels = new Map([[selectedId, 0]]);
    const queue = [selectedId];
    while (queue.length) {
      const currentId = queue.shift();
      const neighbors = graphDirectionSelect.value === "incoming"
        ? graph.predecessors(currentId)
        : graphDirectionSelect.value === "outgoing"
          ? graph.children(currentId)
          : [...graph.children(currentId), ...graph.predecessors(currentId)];
      for (const neighborId of neighbors) {
        if (!levels.has(neighborId)) {
          levels.set(neighborId, levels.get(currentId) + 1);
          queue.push(neighborId);
        }
      }
    }

    const maxLevel = Math.max(...levels.values());
    const previousDepth = graphDepthSelect.value;
    graphDepthSelect.replaceChildren(new Option("All levels", "all"));
    for (let level = 1; level <= maxLevel; level += 1) {
      graphDepthSelect.appendChild(new Option(`Depth ${level}`, String(level)));
    }
    if (previousDepth && previousDepth !== "all" && Number(previousDepth) <= maxLevel) {
      graphDepthSelect.value = previousDepth;
    } else {
      graphDepthSelect.value = "all";
    }

    const selectedDepth = graphDepthSelect.value === "all"
      ? Infinity
      : Number(graphDepthSelect.value);
    const connectedIds = new Set(
      [...levels.entries()]
        .filter(([, level]) => level <= selectedDepth)
        .map(([nodeId]) => nodeId),
    );

    if (currentGraphFocusId === selectedId || !connectedIds.has(currentGraphFocusId)) {
      currentGraphFocusId = undefined;
    }
    const focusOptions = [...connectedIds]
      .filter(id => id !== selectedId)
      .map(id => cubesById.get(id))
      .filter(Boolean)
      .sort((left, right) => cubeSelectLabel(left).localeCompare(cubeSelectLabel(right)));
    graphFocusSelect.replaceChildren(new Option("Focus on a cube", ""), ...focusOptions.map(cube =>
      new Option(cubeSelectLabel(cube), cubeNodeId(cube.modelId, cube.cubeId))
    ));
    graphFocusSelect.value = currentGraphFocusId || "";

    const visibleIds = new Set(connectedIds);
    if (currentGraphFocusId) {
      const focusPath = graphDirectionSelect.value === "incoming"
        ? graph.findPath(currentGraphFocusId, selectedId)
        : graphDirectionSelect.value === "outgoing"
          ? graph.findPath(selectedId, currentGraphFocusId)
          : graph.findPath(selectedId, currentGraphFocusId) ||
            graph.findPath(currentGraphFocusId, selectedId);
      for (const nodeId of focusPath || []) visibleIds.add(nodeId);
      for (const nodeId of [...connectedIds]) {
        if (!focusPath?.includes(nodeId) && nodeId !== selectedId && nodeId !== currentGraphFocusId) {
          visibleIds.delete(nodeId);
        }
      }
    }

    const nodes = [...visibleIds].map(id => {
      const cube = cubesById.get(id);
      const group = cube ? cubeAssignedGroup(cube) : "Unassigned";
      const groupColor = graphColorForGroup(group);
      return {
        id,
        label: cube ? cubeLabel(cube) : id,
        title: cube ? cubeNodeTitle(cube) : id,
        level: levels.get(id) ?? 0,
        shape: id === selectedId ? "ellipse" : "box",
        size: id === selectedId ? 28 : undefined,
        borderWidth: id === selectedId ? 3 : 1,
        color: {
          background: groupColor.background,
          border: id === selectedId ? "#202124" : groupColor.border,
          hover: { background: groupColor.background, border: "#202124" },
          highlight: { background: groupColor.background, border: "#202124" },
        },
      };
    });
    const cubeEdgesById = new Map(cubeEdges.map(edge => [
      `${cubeNodeId(edge.fromModelId, edge.fromCubeId)}->${cubeNodeId(edge.toModelId, edge.toCubeId)}`,
      edge,
    ]));
    const edges = curveReciprocalEdges([...visibleIds].flatMap(from => graph.children(from)
      .filter(to => visibleIds.has(to))
      .map(to => {
        const edgeId = `${from}->${to}`;
        const edge = cubeEdgesById.get(edgeId);
        const procedures = edge?.procedures ?? [];
        return {
          id: edgeId,
          from,
          to,
          arrows: "to",
          title: procedures.length > 0
            ? procedures.map(procedure => `${procedure.description || "Unnamed procedure"} (${procedure.id})`).join("\n")
            : "No procedure provenance recorded",
        };
      })));

    graphOutput.replaceChildren();
    const network = new vis.Network(
      graphOutput,
      { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) },
      {
        interaction: { hover: true, navigationButtons: true, keyboard: true, dragNodes: true },
        layout: { randomSeed: 42 },
        physics: {
          enabled: true,
          stabilization: { iterations: 300 },
          solver: "barnesHut",
          barnesHut: {
            gravitationalConstant: -3000,
            centralGravity: 0.15,
            springLength: 180,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 1,
          },
        },
        nodes: { shape: "box", margin: 12, font: { multi: "html", size: 14 } },
        edges: { color: "#5f6368", smooth: { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.4 } },
      },
    );
    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } });
      if (viewState?.scale) {
        network.moveTo({
          position: network.getPosition(selectedId),
          scale: viewState.scale,
          animation: false,
        });
      }
    });
    network.on("oncontext", ({ event, pointer }) => {
      const nodeId = network.getNodeAt(pointer.DOM);
      const cube = cubesById.get(nodeId);
      if (!cube) return;
      showGraphContextMenu(event, () => {
        graphFocusSelect.value = nodeId;
        graphFocusSelect.dispatchEvent(new Event("change"));
      }, () => selectGraphCube(cube), "Focus on this cube", "Make this the root cube");
    });
    network.on("click", ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const [selectedNodeId] = selectedNodes;
      const selectedNode = cubesById.get(selectedNodeId);
      if (selectedNode) {
        void showCubeUsageDetails(selectedNode);
        return;
      }
      const [edgeId] = selectedEdges;
      if (!edgeId) return;
      const edge = cubeEdgesById.get(edgeId);
      const [fromId, toId] = edgeId.split("->");
      selectionDetailsRequestId += 1;
      detailsHeading.textContent = `Dataflow edge: ${edgeId}`;
      const edgeDetails = edge || {
        from: cubesById.get(fromId) || fromId,
        to: cubesById.get(toId) || toId,
      };
      currentDetailsJson = JSON.stringify(edgeDetails, null, 2);
      detailsSummary.replaceChildren();
      const description = document.createElement("p");
      description.textContent = `${cubesById.get(fromId)?.name || fromId} → ${cubesById.get(toId)?.name || toId}`;
      detailsSummary.appendChild(description);
      const provenance = edge?.procedures ?? [];
      if (provenance.length) {
        const heading = document.createElement("h3");
        heading.textContent = `Procedures (${provenance.length})`;
        const list = document.createElement("ul");
        for (const procedure of provenance) {
          const item = document.createElement("li");
          item.textContent = procedure.description || "Unnamed procedure";
          list.appendChild(item);
        }
        detailsSummary.append(heading, list);
      }
    });
    cubeGraphNetwork = network;
  } catch (error) {
    if (requestId === graphRequestId) {
      graphOutput.textContent = `Could not render cube graph: ${error.message}`;
    }
  }
}

function procedureNodeId(defaultDatabase, name) {
  return `${defaultDatabase}:${name}`;
}

function procedureLabel(procedure) {
  return procedure.description || "Unnamed procedure";
}

function procedureNodeTitle(procedure) {
  return `${procedureLabel(procedure)}\nID: ${procedure.defaultDatabase}:${procedure.name}`;
}

function procedureSelectLabel(procedure) {
  return `${procedureLabel(procedure)} (${procedure.defaultDatabase}:${procedure.name})`;
}

async function renderProcedureGraph(selectedProcedure, requestId, viewState) {
  graphOutput.textContent = "Loading graph...";
  try {
    const db = openProcedureDatabase();
    const [procedures, procedureEdges, graph] = await Promise.all([
      db.procedures.toArray(),
      db.procedureEdges.toArray(),
      window.BoardWorldModel.loadProcedureGraphWrapper(),
    ]);
    if (requestId !== graphRequestId) return;

    const proceduresById = new Map(procedures.map(procedure => [procedureNodeId(procedure.defaultDatabase, procedure.name), procedure]));
    const selectedId = procedureNodeId(selectedProcedure.defaultDatabase, selectedProcedure.name);
    const levels = new Map([[selectedId, 0]]);
    const queue = [selectedId];
    while (queue.length) {
      const currentId = queue.shift();
      const neighbors = graphDirectionSelect.value === "incoming"
        ? graph.predecessors(currentId)
        : graphDirectionSelect.value === "outgoing"
          ? graph.children(currentId)
          : [...graph.children(currentId), ...graph.predecessors(currentId)];
      for (const neighborId of neighbors) {
        if (!levels.has(neighborId)) {
          levels.set(neighborId, levels.get(currentId) + 1);
          queue.push(neighborId);
        }
      }
    }

    const maxLevel = Math.max(...levels.values());
    const previousDepth = graphDepthSelect.value;
    graphDepthSelect.replaceChildren(new Option("All levels", "all"));
    for (let level = 1; level <= maxLevel; level += 1) {
      graphDepthSelect.appendChild(new Option(`Depth ${level}`, String(level)));
    }
    graphDepthSelect.value = previousDepth && previousDepth !== "all" && Number(previousDepth) <= maxLevel
      ? previousDepth
      : "all";

    const selectedDepth = graphDepthSelect.value === "all" ? Infinity : Number(graphDepthSelect.value);
    const connectedIds = new Set([...levels.entries()]
      .filter(([, level]) => level <= selectedDepth)
      .map(([nodeId]) => nodeId));
    if (currentGraphFocusId === selectedId || !connectedIds.has(currentGraphFocusId)) currentGraphFocusId = undefined;

    const focusOptions = [...connectedIds]
      .filter(id => id !== selectedId)
      .map(id => proceduresById.get(id))
      .filter(Boolean)
      .sort((left, right) => procedureSelectLabel(left).localeCompare(procedureSelectLabel(right)));
    graphFocusSelect.replaceChildren(new Option("Focus on a procedure", ""), ...focusOptions.map(procedure =>
      new Option(procedureSelectLabel(procedure), procedureNodeId(procedure.defaultDatabase, procedure.name))
    ));
    graphFocusSelect.value = currentGraphFocusId || "";

    const visibleIds = new Set(connectedIds);
    if (currentGraphFocusId) {
      const focusPath = graphDirectionSelect.value === "incoming"
        ? graph.findPath(currentGraphFocusId, selectedId)
        : graphDirectionSelect.value === "outgoing"
          ? graph.findPath(selectedId, currentGraphFocusId)
          : graph.findPath(selectedId, currentGraphFocusId) || graph.findPath(currentGraphFocusId, selectedId);
      for (const nodeId of focusPath || []) visibleIds.add(nodeId);
      for (const nodeId of [...connectedIds]) {
        if (!focusPath?.includes(nodeId) && nodeId !== selectedId && nodeId !== currentGraphFocusId) visibleIds.delete(nodeId);
      }
    }

    const nodes = [...visibleIds].map(id => {
      const procedure = proceduresById.get(id);
      return {
        id,
        label: procedure ? procedureLabel(procedure) : id,
        title: procedure ? procedureNodeTitle(procedure) : id,
        level: levels.get(id) ?? 0,
        shape: id === selectedId ? "ellipse" : "box",
        size: id === selectedId ? 28 : undefined,
        borderWidth: id === selectedId ? 3 : 1,
        color: {
          background: "#dcfce7",
          border: id === selectedId ? "#202124" : "#16a34a",
          hover: { background: "#dcfce7", border: "#202124" },
          highlight: { background: "#dcfce7", border: "#202124" },
        },
      };
    });
    const procedureEdgesById = new Map(procedureEdges.map(edge => [edge.id, edge]));
    const edges = curveReciprocalEdges([...visibleIds].flatMap(from => graph.children(from)
      .filter(to => visibleIds.has(to))
      .map(to => ({ id: `${from}->${to}`, from, to, arrows: "to" }))));

    graphOutput.replaceChildren();
    const network = new vis.Network(graphOutput, {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges),
    }, {
      layout: { randomSeed: 42 },
      interaction: { hover: true, navigationButtons: true, keyboard: true, dragNodes: true },
      physics: {
        enabled: true,
        stabilization: { iterations: 300 },
        solver: "barnesHut",
        barnesHut: { gravitationalConstant: -3000, centralGravity: 0.15, springLength: 180, springConstant: 0.04, damping: 0.09, avoidOverlap: 1 },
      },
      nodes: { shape: "box", margin: 12, font: { multi: "html", size: 14 } },
      edges: { color: "#5f6368", smooth: { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.4 } },
    });
    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } });
      if (viewState?.scale) network.moveTo({ position: network.getPosition(selectedId), scale: viewState.scale, animation: false });
    });
    network.on("oncontext", ({ event, pointer }) => {
      const nodeId = network.getNodeAt(pointer.DOM);
      const procedure = proceduresById.get(nodeId);
      if (!procedure) return;
      showGraphContextMenu(event, () => {
        graphFocusSelect.value = nodeId;
        graphFocusSelect.dispatchEvent(new Event("change"));
      }, () => selectGraphProcedure(procedure), "Focus on this procedure", "Make this the root procedure");
    });
    network.on("click", ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const [selectedNodeId] = selectedNodes;
      const selectedProcedureNode = proceduresById.get(selectedNodeId);
      if (selectedProcedureNode) {
        void showProcedureUsageDetails(selectedProcedureNode);
        return;
      }
      const [edgeId] = selectedEdges;
      if (!edgeId) return;
      const [fromId, toId] = edgeId.split("->");
      const edge = procedureEdgesById.get(edgeId);
      selectionDetailsRequestId += 1;
      const edgeDetails = edge || {
        from: proceduresById.get(fromId) || fromId,
        to: proceduresById.get(toId) || toId,
      };
      detailsHeading.textContent = "Procedure call edge";
      currentDetailsJson = JSON.stringify(edgeDetails, null, 2);
      detailsSummary.replaceChildren();
      const description = document.createElement("p");
      description.textContent = `${proceduresById.get(fromId)?.description || fromId} → ${proceduresById.get(toId)?.description || toId}`;
      detailsSummary.appendChild(description);
    });
    cubeGraphNetwork = network;
  } catch (error) {
    if (requestId === graphRequestId) graphOutput.textContent = `Could not render procedure graph: ${error.message}`;
  }
}

function makeClickableItem(item, onOpen) {
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.style.cursor = "pointer";
  item.addEventListener("click", onOpen);
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  });
}

function filterList(list, query) {
  const normalizedQuery = query.trim().toLowerCase();
  for (const item of list.children) {
    item.hidden = normalizedQuery !== "" && !item.dataset.search.includes(normalizedQuery);
  }
}

async function selectScreen(screen) {
  const title = `Screen: ${screen.text || "Unnamed screen"}`;
  try {
    const detail = await window.BoardWorldModel.openScreenDatabase()
      .getScreenDetail(screen.capsule, screen.id);
    showDetails(title, detail?.data ?? {
      error: "Screen details are not stored. Scan this capsule from the popup first.",
    });
  } catch (error) {
    status.textContent = `Could not read screen details: ${error.message}`;
  }
}

copyDetailsButton.addEventListener("click", copyDetailsJson);
cubeSearch.addEventListener("input", filterCubes);
cubeModelOptions.addEventListener("change", () => {
  updateCubeModelFilterSummary();
  filterCubes();
});
procedureSearch.addEventListener("input", filterProcedures);
procedureModelOptions.addEventListener("change", () => {
  updateProcedureModelFilterSummary();
  filterProcedures();
});
clearCubeModelFilter.addEventListener("click", () => {
  cubeModelOptions.querySelectorAll("input:checked").forEach(input => {
    input.checked = false;
  });
  updateCubeModelFilterSummary();
  filterCubes();
});
clearProcedureModelFilter.addEventListener("click", () => {
  procedureModelOptions.querySelectorAll("input:checked").forEach(input => {
    input.checked = false;
  });
  updateProcedureModelFilterSummary();
  filterProcedures();
});
document.addEventListener("pointerdown", event => {
  if (!cubeModelFilter.contains(event.target)) {
    cubeModelFilter.open = false;
  }
  if (!procedureModelFilter.contains(event.target)) {
    procedureModelFilter.open = false;
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && cubeModelFilter.open) {
    cubeModelFilter.open = false;
    cubeModelFilter.querySelector("summary").focus();
  }
  if (event.key === "Escape" && procedureModelFilter.open) {
    procedureModelFilter.open = false;
    procedureModelFilter.querySelector("summary").focus();
  }
});
capsuleProcedureSearch.addEventListener("input", () => filterList(capsuleProceduresList, capsuleProcedureSearch.value));
capsuleSearch.addEventListener("input", () => filterList(capsulesList, capsuleSearch.value));
screenSearch.addEventListener("input", () => filterList(screensList, screenSearch.value));

async function loadCubes() {
  try {
    const db = openCubeDatabase();
    const [cubes, cubeEdges] = await Promise.all([
      db.cubes.toArray(),
      db.cubeEdges.toArray(),
    ]);
    const modelIds = [...new Set(cubes.map(cube => cube.modelId))].sort();

    cubesList.replaceChildren();
    setModelOptions(modelIds);
    cubeStorageSize.textContent = `Estimated stored data: ${formatBytes(estimateBytes([...cubes, ...cubeEdges]))}`;
    for (const cube of cubes) {
      const item = document.createElement("li");
      item.dataset.modelId = cube.modelId;
      item.dataset.search = [cube.name, cube.modelId, cube.cubeId, `${cube.modelId}:${cube.cubeId}`]
        .join(" ")
        .toLowerCase();
      item.textContent = `${cube.name || "Unnamed cube"} `;
      const id = document.createElement("code");
      id.textContent = `(${cube.modelId}:${cube.cubeId})`;
      item.appendChild(id);
      const relatedEdges = cubeEdges.filter(edge =>
        (edge.fromModelId === cube.modelId && edge.fromCubeId === cube.cubeId) ||
        (edge.toModelId === cube.modelId && edge.toCubeId === cube.cubeId)
      );
      makeClickableItem(item, () => showDetails(`Cube: ${cube.name || "Unnamed cube"}`, {
        cube,
        relatedEdges,
      }));
      cubesList.appendChild(item);
    }
    filterCubes();
  } catch (error) {
    status.textContent = `Could not read cube database: ${error.message}`;
  }
}

function filterCubes() {
  const selectedModelIds = new Set(
    [...cubeModelOptions.querySelectorAll("input:checked")]
      .map(input => input.value),
  );
  const normalizedQuery = cubeSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  for (const item of cubesList.children) {
    const matchesModel = selectedModelIds.size === 0 ||
      selectedModelIds.has(item.dataset.modelId);
    const matchesSearch = normalizedQuery === "" ||
      item.dataset.search.includes(normalizedQuery);
    item.hidden = !matchesModel || !matchesSearch;
    if (!item.hidden) visibleCount += 1;
  }

  const selectedCount = selectedModelIds.size;
  const modelSummary = selectedCount === 0
    ? "all models"
    : `${selectedCount} model${selectedCount === 1 ? "" : "s"} selected`;
  status.textContent = `${visibleCount} of ${cubesList.children.length} cubes shown · ${modelSummary}`;
}

function updateCubeModelFilterSummary() {
  const selectedModelIds = [...cubeModelOptions.querySelectorAll("input:checked")]
    .map(input => input.value);
  cubeModelFilterSummary.textContent = selectedModelIds.length === 0
    ? "All data models"
    : selectedModelIds.length === 1
      ? selectedModelIds[0]
      : `${selectedModelIds.length} data models selected`;
  clearCubeModelFilter.hidden = selectedModelIds.length === 0;
}

function filterProcedures() {
  const selectedModelIds = new Set(
    [...procedureModelOptions.querySelectorAll("input:checked")]
      .map(input => input.value),
  );
  const normalizedQuery = procedureSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  for (const item of proceduresList.children) {
    const matchesModel = selectedModelIds.size === 0 ||
      selectedModelIds.has(item.dataset.modelId);
    const matchesSearch = normalizedQuery === "" ||
      item.dataset.search.includes(normalizedQuery);
    item.hidden = !matchesModel || !matchesSearch;
    if (!item.hidden) visibleCount += 1;
  }

  const modelSummary = selectedModelIds.size === 0
    ? "all models"
    : `${selectedModelIds.size} model${selectedModelIds.size === 1 ? "" : "s"} selected`;
  status.textContent = `${visibleCount} of ${proceduresList.children.length} procedures shown · ${modelSummary}`;
}

function updateProcedureModelFilterSummary() {
  const selectedModelIds = [...procedureModelOptions.querySelectorAll("input:checked")]
    .map(input => input.value);
  procedureModelFilterSummary.textContent = selectedModelIds.length === 0
    ? "All data models"
    : selectedModelIds.length === 1
      ? selectedModelIds[0]
      : `${selectedModelIds.length} data models selected`;
  clearProcedureModelFilter.hidden = selectedModelIds.length === 0;
}

async function loadProcedures() {
  try {
    const db = openProcedureDatabase();
    const [metadata, details, procedureEdges] = await Promise.all([
      db.procedureMetadata.toArray(),
      db.procedures.toArray(),
      db.procedureEdges.toArray(),
    ]);
    const detailIds = new Set(details.map(procedure => procedure.id));
    const modelIds = [...new Set(metadata.map(procedure => procedure.defaultDatabase))].sort();

    proceduresList.replaceChildren();
    setProcedureModelOptions(modelIds);
    procedureStorageSize.textContent = `Estimated stored data: ${formatBytes(estimateBytes([...metadata, ...details]))}`;
    status.textContent = `${metadata.length} procedure${metadata.length === 1 ? "" : "s"} stored · ${details.length} detailed`;
    for (const procedure of metadata.sort((left, right) => left.description.localeCompare(right.description))) {
      const item = document.createElement("li");
      item.dataset.modelId = procedure.defaultDatabase;
      item.dataset.search = [
        procedure.description,
        procedure.name,
        procedure.defaultDatabase,
        `${procedure.defaultDatabase}:${procedure.name}`,
        procedure.id,
      ]
        .join(" ")
        .toLowerCase();
      item.textContent = `${procedure.description || "Unnamed procedure"} `;
      const id = document.createElement("code");
      id.textContent = `(${procedure.defaultDatabase}:${procedure.name})`;
      item.appendChild(id);
      const detailState = document.createElement("span");
      detailState.textContent = detailIds.has(procedure.id) ? " · details loaded" : " · metadata only";
      item.appendChild(detailState);
      const detail = details.find(candidate => candidate.id === procedure.id);
      makeClickableItem(item, () => showDetails(
        `Procedure: ${procedure.description || "Unnamed procedure"}`,
        {
          metadata: procedure,
          details: detail ?? null,
          procedure: detail ?? procedure,
          relatedEdges: procedureEdges.filter(edge =>
            (edge.fromDefaultDatabase === procedure.defaultDatabase && edge.fromName === procedure.name) ||
            (edge.toDefaultDatabase === procedure.defaultDatabase && edge.toName === procedure.name)
          ),
        },
      ));
      proceduresList.appendChild(item);
    }
    filterProcedures();
  } catch (error) {
    status.textContent = `Could not read procedure database: ${error.message}`;
  }
}

async function loadCapsulesAndScreens() {
  try {
    const db = window.BoardWorldModel.openScreenDatabase();
    const [capsules, screens] = await Promise.all([
      db.capsule.toArray(),
      db.screenMetadata.toArray(),
    ]);
    const actualScreens = screens.filter(screen => screen.is_screen);
    capsules.sort((left, right) => left.path.localeCompare(right.path));
    actualScreens.sort((left, right) => left.text.localeCompare(right.text));

    const screenCounts = new Map();
    for (const screen of actualScreens) {
      screenCounts.set(screen.capsule, (screenCounts.get(screen.capsule) || 0) + 1);
    }

    capsulesList.replaceChildren();
    screensList.replaceChildren();
    capsuleStorageSize.textContent = `${capsules.length} capsule${capsules.length === 1 ? "" : "s"} stored`;
    screenStorageSize.textContent = `${actualScreens.length} screen${actualScreens.length === 1 ? "" : "s"} stored`;
    status.textContent = `${capsules.length} capsules · ${actualScreens.length} screens stored`;

    for (const capsule of capsules) {
      const item = document.createElement("li");
      item.dataset.search = `${capsule.name} ${capsule.path}`.toLowerCase();
      item.textContent = `${capsule.name || "Unnamed capsule"} `;
      const path = document.createElement("code");
      path.textContent = capsule.path;
      const count = document.createElement("span");
      const screenCount = screenCounts.get(capsule.path) || 0;
      count.textContent = ` · ${screenCount} screen entr${screenCount === 1 ? "y" : "ies"}`;
      item.append(path, count);
      capsulesList.appendChild(item);
    }

    for (const screen of actualScreens) {
      const item = document.createElement("li");
      item.dataset.search = `${screen.text} ${screen.capsule} ${screen.id}`.toLowerCase();
      item.textContent = `${screen.text || "Unnamed screen"} `;
      const capsulePath = document.createElement("code");
      capsulePath.textContent = screen.capsule;
      item.appendChild(capsulePath);
      if (screen.is_home) item.append(" · Home");
      if (!screen.is_screen) item.append(" · Folder");
      makeClickableItem(item, () => selectScreen(screen));
      screensList.appendChild(item);
    }

    if (capsules.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No capsules stored";
      empty.dataset.search = "";
      capsulesList.appendChild(empty);
    }
    if (actualScreens.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No screens stored";
      empty.dataset.search = "";
      screensList.appendChild(empty);
    }
    filterList(capsulesList, capsuleSearch.value);
    filterList(screensList, screenSearch.value);
  } catch (error) {
    status.textContent = `Could not read capsule database: ${error.message}`;
  }
}

async function loadCapsuleProcedures() {
  try {
    const db = window.BoardWorldModel.openCapsuleProcedureDatabase();
    const [metadata, details] = await Promise.all([
      db.procedureMetadata.toArray(),
      db.procedures.toArray(),
    ]);
    const detailsById = new Map(details.map(procedure => [procedure.id, procedure]));
    capsuleProceduresList.replaceChildren();
    capsuleProcedureStorageSize.textContent =
      `Estimated stored data: ${formatBytes(estimateBytes([...metadata, ...details]))}`;
    status.textContent =
      `${metadata.length} capsule procedure${metadata.length === 1 ? "" : "s"} stored · ${details.length} detailed`;

    for (const procedure of metadata.sort((left, right) =>
      (left.description || left.name).localeCompare(right.description || right.name))) {
      const item = document.createElement("li");
      item.dataset.search = [
        procedure.description,
        procedure.oldDescription,
        procedure.name,
        procedure.capsulePath,
        procedure.id,
      ].filter(Boolean).join(" ").toLowerCase();
      item.textContent = `${procedure.description || procedure.oldDescription || "Unnamed capsule procedure"} `;
      const id = document.createElement("code");
      id.textContent = `(${procedure.name})`;
      item.appendChild(id);
      const detail = detailsById.get(procedure.id);
      const detailState = document.createElement("span");
      detailState.textContent = detail ? " · details loaded" : " · metadata only";
      item.appendChild(detailState);
      const capsulePath = document.createElement("div");
      capsulePath.textContent = procedure.capsulePath;
      item.appendChild(capsulePath);
      makeClickableItem(item, () => showDetails(
        `Capsule procedure: ${procedure.description || procedure.name}`,
        { metadata: procedure, details: detail ?? null },
      ));
      capsuleProceduresList.appendChild(item);
    }

    if (metadata.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No capsule procedures stored";
      empty.dataset.search = "";
      capsuleProceduresList.appendChild(empty);
    }
    filterList(capsuleProceduresList, capsuleProcedureSearch.value);
  } catch (error) {
    status.textContent = `Could not read capsule procedure database: ${error.message}`;
  }
}

function showTab(tab) {
  const showCubes = tab === "cubes";
  const showProcedures = tab === "procedures";
  const showCapsuleProcedures = tab === "capsuleProcedures";
  const showCapsules = tab === "capsules";
  cubesTab.classList.toggle("active", showCubes);
  proceduresTab.classList.toggle("active", showProcedures);
  capsuleProceduresTab.classList.toggle("active", showCapsuleProcedures);
  capsulesTab.classList.toggle("active", showCapsules);
  detailsTab.classList.remove("active");
  cubesTab.setAttribute("aria-selected", String(showCubes));
  proceduresTab.setAttribute("aria-selected", String(showProcedures));
  capsuleProceduresTab.setAttribute("aria-selected", String(showCapsuleProcedures));
  capsulesTab.setAttribute("aria-selected", String(showCapsules));
  detailsTab.setAttribute("aria-selected", "false");
  cubesPanel.hidden = !showCubes;
  proceduresPanel.hidden = !showProcedures;
  capsuleProceduresPanel.hidden = !showCapsuleProcedures;
  capsulesPanel.hidden = !showCapsules;
  detailsPanel.hidden = true;
  if (showProcedures) loadProcedures();
  else if (showCapsuleProcedures) loadCapsuleProcedures();
  else if (showCapsules) loadCapsulesAndScreens();
  else loadCubes();
}

async function deleteAllData() {
  if (!confirm("Delete all locally stored cubes, relationships, procedures, capsule procedures, capsules, and screens? This cannot be undone.")) return;

  try {
    await Promise.all([
      openCubeDatabase().delete(),
      openProcedureDatabase().delete(),
      window.BoardWorldModel.openCapsuleProcedureDatabase().delete(),
      window.BoardWorldModel.openScreenDatabase().delete(),
    ]);
    await Promise.all([loadCubes(), loadProcedures(), loadCapsuleProcedures(), loadCapsulesAndScreens()]);
  } catch (error) {
    status.textContent = `Could not delete cube database: ${error.message}`;
  }
}

deleteAllButton.addEventListener("click", deleteAllData);
cubesTab.addEventListener("click", () => showTab("cubes"));
proceduresTab.addEventListener("click", () => showTab("procedures"));
capsuleProceduresTab.addEventListener("click", () => showTab("capsuleProcedures"));
capsulesTab.addEventListener("click", () => showTab("capsules"));
loadCubes();