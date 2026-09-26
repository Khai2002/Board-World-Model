const status = document.getElementById("status");
const cubesList = document.getElementById("cubes");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const importInput = document.getElementById("importInput");
const modelSelect = document.getElementById("modelSelect");
const deleteModelButton = document.getElementById("deleteModelButton");
const deleteAllButton = document.getElementById("deleteAllButton");
const cubesTab = document.getElementById("cubesTab");
const proceduresTab = document.getElementById("proceduresTab");
const cubesPanel = document.getElementById("cubesPanel");
const proceduresPanel = document.getElementById("proceduresPanel");
const tabs = document.querySelector(".tabs");
const proceduresList = document.getElementById("procedures");
const cubeStorageSize = document.getElementById("cubeStorageSize");
const procedureStorageSize = document.getElementById("procedureStorageSize");
const cubeSearch = document.getElementById("cubeSearch");
const procedureSearch = document.getElementById("procedureSearch");

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
const detailsOutput = document.createElement("pre");
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
const graphContextMenu = document.createElement("div");
graphContextMenu.className = "graph-context-menu";
graphContextMenu.setAttribute("role", "menu");
graphContextMenu.hidden = true;
const focusGraphNodeButton = document.createElement("button");
focusGraphNodeButton.type = "button";
focusGraphNodeButton.setAttribute("role", "menuitem");
focusGraphNodeButton.textContent = "Focus graph here";
graphContextMenu.appendChild(focusGraphNodeButton);
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
detailsPanel.append(graphHeading, graphDirectionSelect, graphDepthSelect, graphFocusSelect, clearGraphFocusButton, graphOutput, detailsHeading, copyDetailsButton, detailsOutput, graphContextMenu);
document.body.appendChild(detailsPanel);

let cubeGraphNetwork;
let graphRequestId = 0;
let currentGraphCube;
let currentGraphProcedure;
let currentGraphFocusId;
let focusGraphNode;
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
  modelSelect.replaceChildren(new Option("Select a model", ""));
  for (const modelId of modelIds) {
    modelSelect.appendChild(new Option(modelId, modelId));
  }
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
  const json = detailsOutput.textContent || "";
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = json;
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
  detailsHeading.textContent = title;
  detailsOutput.textContent = JSON.stringify(data, null, 2);
  const graphData = data.cube || data.procedure;
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
  cubesTab.setAttribute("aria-selected", "false");
  proceduresTab.setAttribute("aria-selected", "false");
  cubesPanel.hidden = true;
  proceduresPanel.hidden = true;
  detailsPanel.hidden = false;
  graphOutput.hidden = !graphData;
  if (data.cube) renderCubeGraph(data.cube, requestId, viewState);
  if (data.procedure) renderProcedureGraph(data.procedure, requestId, viewState);
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

document.addEventListener("pointerdown", (event) => {
  if (!graphContextMenu.contains(event.target)) graphContextMenu.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") graphContextMenu.hidden = true;
});

function showGraphContextMenu(event, focusAction) {
  event.preventDefault();
  focusGraphNode = focusAction;
  graphContextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 170)}px`;
  graphContextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 44)}px`;
  graphContextMenu.hidden = false;
}

function cubeNodeId(modelId, cubeId) {
  return `${modelId}:${cubeId}`;
}

function cubeLabel(cube) {
  return `${cube.name || "Unnamed cube"}\n(${cube.modelId}:${cube.cubeId})`;
}

function curveReciprocalEdges(edges) {
  const edgeIds = new Set(edges.map(edge => `${edge.from}->${edge.to}`));
  return edges.map(edge => edgeIds.has(`${edge.to}->${edge.from}`)
    ? { ...edge, smooth: { type: "curvedCW", roundness: 0.2 } }
    : edge,
  );
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
      .sort((left, right) => cubeLabel(left).localeCompare(cubeLabel(right)));
    graphFocusSelect.replaceChildren(new Option("Focus on a cube", ""), ...focusOptions.map(cube =>
      new Option(cubeLabel(cube).replace("\n", " "), cubeNodeId(cube.modelId, cube.cubeId))
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
        title: cube ? `${group}\n${JSON.stringify(cube, null, 2)}` : id,
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
    network.on("doubleClick", ({ nodes }) => {
      const [nodeId] = nodes;
      const cube = cubesById.get(nodeId);
      if (cube) selectGraphCube(cube);
    });
    network.on("oncontext", ({ event, pointer }) => {
      const nodeId = network.getNodeAt(pointer.DOM);
      const cube = cubesById.get(nodeId);
      if (!cube) return;
      showGraphContextMenu(event, () => {
        graphFocusSelect.value = nodeId;
        graphFocusSelect.dispatchEvent(new Event("change"));
      });
    });
    network.on("click", ({ edges: selectedEdges }) => {
      const [edgeId] = selectedEdges;
      if (!edgeId) return;
      const edge = cubeEdgesById.get(edgeId);
      if (!edge) return;
      detailsHeading.textContent = `Dataflow edge: ${edge.id}`;
      detailsOutput.textContent = JSON.stringify(edge, null, 2);
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
  return `${procedure.description || "Unnamed procedure"}\n(${procedure.defaultDatabase}:${procedure.name})`;
}

async function renderProcedureGraph(selectedProcedure, requestId, viewState) {
  graphOutput.textContent = "Loading graph...";
  try {
    const db = openProcedureDatabase();
    const [procedures, graph] = await Promise.all([
      db.procedures.toArray(),
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
      .sort((left, right) => procedureLabel(left).localeCompare(procedureLabel(right)));
    graphFocusSelect.replaceChildren(new Option("Focus on a procedure", ""), ...focusOptions.map(procedure =>
      new Option(procedureLabel(procedure).replace("\n", " "), procedureNodeId(procedure.defaultDatabase, procedure.name))
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
        title: procedure ? JSON.stringify(procedure, null, 2) : id,
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
    network.on("doubleClick", ({ nodes }) => {
      const [nodeId] = nodes;
      const procedure = proceduresById.get(nodeId);
      if (procedure) selectGraphProcedure(procedure);
    });
    network.on("oncontext", ({ event, pointer }) => {
      const nodeId = network.getNodeAt(pointer.DOM);
      const procedure = proceduresById.get(nodeId);
      if (!procedure) return;
      showGraphContextMenu(event, () => {
        graphFocusSelect.value = nodeId;
        graphFocusSelect.dispatchEvent(new Event("change"));
      });
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

copyDetailsButton.addEventListener("click", copyDetailsJson);
cubeSearch.addEventListener("input", () => filterList(cubesList, cubeSearch.value));
procedureSearch.addEventListener("input", () => filterList(proceduresList, procedureSearch.value));

async function getBackup() {
  const db = openCubeDatabase();
  return {
    cubes: await db.cubes.toArray(),
    cubeEdges: await db.cubeEdges.toArray(),
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseBackup(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.cubes) || !Array.isArray(value.cubeEdges)) {
    throw new Error("The file is not a cube-model backup.");
  }

  for (const cube of value.cubes) {
    if (!cube || typeof cube !== "object" || typeof cube.id !== "string" ||
        typeof cube.modelId !== "string" || cube.cubeId === undefined || !("data" in cube)) {
      throw new Error("The backup contains an invalid cube row.");
    }
  }

  for (const edge of value.cubeEdges) {
    if (!edge || typeof edge !== "object" ||
        typeof edge.fromModelId !== "string" || edge.fromCubeId === undefined ||
        typeof edge.toModelId !== "string" || edge.toCubeId === undefined) {
      throw new Error("The backup contains an invalid cube relationship.");
    }
  }

  return value;
}

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
    status.textContent = `${cubes.length} cube${cubes.length === 1 ? "" : "s"} stored`;
    for (const cube of cubes) {
      const item = document.createElement("li");
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
    filterList(cubesList, cubeSearch.value);
  } catch (error) {
    status.textContent = `Could not read cube database: ${error.message}`;
  }
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

    proceduresList.replaceChildren();
    procedureStorageSize.textContent = `Estimated stored data: ${formatBytes(estimateBytes([...metadata, ...details]))}`;
    status.textContent = `${metadata.length} procedure${metadata.length === 1 ? "" : "s"} stored · ${details.length} detailed`;
    for (const procedure of metadata.sort((left, right) => left.description.localeCompare(right.description))) {
      const item = document.createElement("li");
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
    filterList(proceduresList, procedureSearch.value);
  } catch (error) {
    status.textContent = `Could not read procedure database: ${error.message}`;
  }
}

function showTab(tab) {
  const showProcedures = tab === "procedures";
  cubesTab.classList.toggle("active", !showProcedures);
  proceduresTab.classList.toggle("active", showProcedures);
  detailsTab.classList.remove("active");
  cubesTab.setAttribute("aria-selected", String(!showProcedures));
  proceduresTab.setAttribute("aria-selected", String(showProcedures));
  detailsTab.setAttribute("aria-selected", "false");
  cubesPanel.hidden = showProcedures;
  proceduresPanel.hidden = !showProcedures;
  detailsPanel.hidden = true;
  if (showProcedures) loadProcedures();
  else loadCubes();
}

async function exportData() {
  try {
    downloadJson(await getBackup(), "cube-model-backup.json");
  } catch (error) {
    status.textContent = `Could not export cube database: ${error.message}`;
  }
}

async function importData(file) {
  try {
    const backup = parseBackup(JSON.parse(await file.text()));
    if (!confirm("Replace all local cube data with this backup? This cannot be undone.")) return;

    const db = openCubeDatabase();
    await db.transaction("rw", db.cubes, db.cubeEdges, async () => {
      await db.cubes.clear();
      await db.cubeEdges.clear();
      await db.cubes.bulkPut(backup.cubes);
      await db.cubeEdges.bulkPut(backup.cubeEdges);
    });
    await loadCubes();
    status.textContent = `Imported ${backup.cubes.length} cube${backup.cubes.length === 1 ? "" : "s"}`;
  } catch (error) {
    status.textContent = `Could not import cube database: ${error.message}`;
  } finally {
    importInput.value = "";
  }
}

async function deleteSelectedModel() {
  const modelId = modelSelect.value;
  if (!modelId) return;
  if (!confirm(`Delete all local cubes and relationships for ${modelId}?`)) return;

  try {
    const db = openCubeDatabase();
    await db.transaction("rw", db.cubes, db.cubeEdges, async () => {
      await db.cubes.where("modelId").equals(modelId).delete();
      await db.cubeEdges
        .where("fromModelId").equals(modelId)
        .or("toModelId").equals(modelId)
        .delete();
    });
    await loadCubes();
  } catch (error) {
    status.textContent = `Could not delete model: ${error.message}`;
  }
}

async function deleteAllData() {
  if (!confirm("Delete all locally stored cubes, relationships, and procedures? This cannot be undone.")) return;

  try {
    await Promise.all([
      openCubeDatabase().delete(),
      openProcedureDatabase().delete(),
    ]);
    await Promise.all([loadCubes(), loadProcedures()]);
  } catch (error) {
    status.textContent = `Could not delete cube database: ${error.message}`;
  }
}

exportButton.addEventListener("click", exportData);
importButton.addEventListener("click", () => importInput.click());
document.getElementById("printTestButton").addEventListener("click", () => {
  window.BoardWorldModel.printTest();
});
importInput.addEventListener("change", () => {
  const [file] = importInput.files;
  if (file) importData(file);
});
deleteModelButton.addEventListener("click", deleteSelectedModel);
deleteAllButton.addEventListener("click", deleteAllData);
cubesTab.addEventListener("click", () => showTab("cubes"));
proceduresTab.addEventListener("click", () => showTab("procedures"));
loadCubes();