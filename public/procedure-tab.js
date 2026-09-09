// Procedure custom tab.

const procedureTabOptions = {
  overlaySelector: '.procedure-click-logger-overlay',
  buttonSelector: '.procedure-click-logger-tab-toggle',
  textClass: 'procedure-click-logger-text-wrap',
};

const procedureListStyleId = 'board-world-model-procedure-list-styles';

function ensureProcedureListStyles() {
  if (document.getElementById(procedureListStyleId)) return;

  const style = document.createElement('style');
  style.id = procedureListStyleId;
  style.textContent = `
    .procedure-list {
      margin: 0;
      padding-left: 0;
      list-style: none;
    }

    .procedure-item {
      margin-bottom: 16px;
    }

    .procedure-summary {
      padding: 4px 6px;
      border-radius: 3px;
      color: #202124;
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
      transition: background-color 120ms ease;
    }

    .procedure-summary:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .procedure-child-list {
      margin: 8px 0 0 20px;
      padding-left: 18px;
      list-style: none;
    }

    .procedure-written {
      margin-top: 7px;
      color: #6b7280;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.5;
    }

    .procedure-cube {
      color: #4b5563;
      font-weight: 500;
    }

    .procedure-cube-list {
      margin: 4px 0 0 16px;
      padding-left: 16px;
    }

    .procedure-cube-item {
      padding-left: 2px;
    }

    .procedure-copy-button {
      align-self: flex-start;
      width: max-content;
      margin-top: 16px;
      cursor: pointer;
      border: 1px solid #bbb;
      border-radius: 4px;
      background: #fff;
      padding: 6px 10px;
    }

    .procedure-link {
      margin-left: 6px;
      color: #6b7280;
      font-size: 12px;
      text-decoration: none;
    }

    .procedure-link:hover {
      color: #202124;
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
}

function normalizeProcedureResponse(data) {
  const procedure = Array.isArray(data) ? data[0] : data;
  if (!procedure || typeof procedure !== 'object') {
    throw new Error('The procedure response is empty.');
  }
  return procedure;
}

async function getProcedureFull(dbName, uniqueId) {
  const { data } = await callBoardAPI(
    'getProcedures',
    { dbname: dbName },
    [uniqueId],
  );
  const procedure = normalizeProcedureResponse(data);

  const procedureGroups = await Promise.all(
    (procedure.procedureGroups ?? []).map(async (group) => ({
      ...group,
      steps: await Promise.all(
        (group.steps ?? []).map(async (step) => {
          if (!Array.isArray(step.configuredLayoutIds) || step.configuredLayoutIds.length === 0) {
            return step;
          }

          const { data: layouts } = await callBoardAPI(
            'layoutEditorProcedureGetBlockLayout',
            {
              dbname: dbName,
              procedureId: uniqueId,
              actionId: step.id,
              isNotSaved: false,
            },
          );

          return { ...step, layouts };
        }),
      ),
    })),
  );

  return { ...procedure, procedureGroups };
}

async function populateProcedureOverlay(panelEl, overlay) {
  ensureProcedureListStyles();

  const procedurePanel = panelEl.querySelector('brd-procedures-panel');
  const procedureName = procedurePanel
    ?.querySelector('brd-panel-toolbar .title .procedure-click-logger-text-wrap')
    ?.textContent.trim();

  overlay.innerHTML = '<div>Loading procedure information...</div>';

  const modelPath = window.location.pathname.match(/\/data-models\/([^/]+)\/procedures(?:\/|$)/)?.[1];
  if (!modelPath || !procedureName) {
    overlay.textContent = 'Unable to identify the selected Procedure.';
    return;
  }

  try {
    const { data: procedures } = await callBoardAPI('getCoreProcedures', {
      dbname: modelPath,
    });
    const proceduresWithUrls = procedures.map((item) => ({
      ...item,
      url: `${window.location.origin}/data-models/${encodeURIComponent(modelPath)}/procedures/${encodeURIComponent(item.uniqueId ?? item.name)}`,
    }));
    const procedure = proceduresWithUrls.find((item) => item.description === procedureName);
    if (!procedure) {
      overlay.textContent = `No Procedure was found for "${procedureName}".`;
      return;
    }

    const procedureDetails = await getProcedureFull(modelPath, procedure.name);
    const procedureJson = JSON.stringify(procedureDetails, null, 2) ?? 'undefined';
    const recursiveModel = await window.BoardWorldModel.createRecursiveProcedureModel(
      procedures,
      procedureDetails,
      async (identifier) => {
        return getProcedureFull(modelPath, identifier.name);
      },
    );
    const { procedure: parsedProcedure, proceduresToExecute } = recursiveModel;
    const proceduresToDisplay = [
      { procedure: parsedProcedure, depth: 0 },
      ...proceduresToExecute,
    ];
    const writtenDataflowBlocks = window.BoardWorldModel.getWrittenDataflowBlocks(
      proceduresToDisplay.map(({ procedure: listedProcedure }) => listedProcedure),
    );
    const writtenDataflowBlocksWithUrls = writtenDataflowBlocks.map((item) => ({
      ...item,
      url: `${window.location.origin}/data-models/${encodeURIComponent(modelPath)}/cubes/${encodeURIComponent(item.block.cubeIdx)}`,
    }));
    console.log('[Board Click Logger] Written dataflow blocks:', writtenDataflowBlocks);
    const writtenBlocksByProcedure = new Map();
    writtenDataflowBlocksWithUrls.forEach(({ procedureKey, detail, block, url }) => {
      const blocks = writtenBlocksByProcedure.get(procedureKey) ?? [];
      if (blocks.some((writtenBlock) => writtenBlock.block.cubeIdx === block.cubeIdx)) return;

      blocks.push({ detail, block, url });
      writtenBlocksByProcedure.set(procedureKey, blocks);
    });


    overlay.innerHTML = '';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'procedure-copy-button';
    copyButton.textContent = 'Copy JSON';
    copyButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(procedureJson);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = procedureJson;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        copyButton.textContent = 'Copied';
        setTimeout(() => { copyButton.textContent = 'Copy JSON'; }, 1500);
      } catch (error) {
        console.error('[Board Click Logger] Could not copy procedure JSON:', error);
        copyButton.textContent = 'Copy failed';
        setTimeout(() => { copyButton.textContent = 'Copy JSON'; }, 1500);
      }
    });

    const info = document.createElement('div');
    info.style.fontSize = '13px';
    info.style.lineHeight = '1.6';
    info.innerHTML = `
      <div><strong>Procedure:</strong> ${parsedProcedure.description ?? ''}</div>
      <div><strong>Procedure ID:</strong> ${parsedProcedure.name ?? ''}</div>
      <div><strong>Data model:</strong> ${parsedProcedure.defaultDatabase ?? modelPath}</div>
    `;

    const jsonLabel = document.createElement('h4');
    jsonLabel.textContent = 'Procedure JSON';
    jsonLabel.style.margin = '20px 0 8px 0';

    const calledLabel = document.createElement('h3');
    calledLabel.textContent = 'Procedures to execute';
    calledLabel.style.margin = '0 0 8px 0';

    const calledList = document.createElement('ul');
    calledList.className = 'procedure-list';
    {
      const listStack = [{ depth: -1, list: calledList }];

      proceduresToDisplay.forEach(({ procedure: calledProcedure, depth }, index) => {
        while (listStack.at(-1).depth >= depth) listStack.pop();

        const item = document.createElement('li');
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        const childList = document.createElement('ul');
        const procedureUrl = calledProcedure.url
          ?? `${window.location.origin}/data-models/${encodeURIComponent(modelPath)}/procedures/${encodeURIComponent(calledProcedure.uniqueId ?? calledProcedure.name)}`;
        const writtenBlocks = writtenBlocksByProcedure.get(
          `${calledProcedure.defaultDatabase}:${calledProcedure.name}`,
        ) ?? [];

        summary.textContent = `${index + 1}. ${calledProcedure.description}${depth === 0 ? ' (root)' : ''}`;
        summary.className = 'procedure-summary';
        const procedureLink = document.createElement('a');
        procedureLink.className = 'procedure-link';
        procedureLink.href = procedureUrl;
        procedureLink.target = '_blank';
        procedureLink.rel = 'noopener noreferrer';
        procedureLink.textContent = '[open]';
        procedureLink.title = `Open ${calledProcedure.description}`;
        procedureLink.addEventListener('click', (event) => event.stopPropagation());
        summary.appendChild(procedureLink);
        details.open = true;
        details.appendChild(summary);
        item.className = 'procedure-item';
        childList.className = 'procedure-child-list';

        if (writtenBlocks.length > 0) {
          const writtenItem = document.createElement('li');
          writtenItem.className = 'procedure-written';
          writtenItem.textContent = 'Writes to: ';
          const cubeList = document.createElement('ul');
          cubeList.className = 'procedure-cube-list';
          writtenBlocks.forEach(({ detail, block, url }) => {
            const cubeItem = document.createElement('li');
            cubeItem.className = 'procedure-cube-item';
            const cube = document.createElement('span');
            cube.className = 'procedure-cube';
            cube.textContent = `${block.cubeIdx}: ${detail.split('=')[0]}`;
            cube.title = detail;
            cubeItem.appendChild(cube);
            const cubeLink = document.createElement('a');
            cubeLink.className = 'procedure-link';
            cubeLink.href = url;
            cubeLink.target = '_blank';
            cubeLink.rel = 'noopener noreferrer';
            cubeLink.textContent = '[open]';
            cubeLink.title = `Open cube ${block.cubeIdx}`;
            cubeItem.appendChild(cubeLink);
            cubeList.appendChild(cubeItem);
          });
          writtenItem.appendChild(cubeList);
          childList.appendChild(writtenItem);
        }

        details.appendChild(childList);
        item.appendChild(details);
        listStack.at(-1).list.appendChild(item);
        listStack.push({ depth, list: childList });
      });
    }

    const jsonOutput = document.createElement('pre');
    jsonOutput.textContent = procedureJson;
    Object.assign(jsonOutput.style, {
      margin: '0',
      padding: '12px',
      overflow: 'auto',
      maxHeight: '50vh',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      background: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px',
      lineHeight: '1.5',
    });

    // overlay.appendChild(info);
    overlay.appendChild(calledLabel);
    overlay.appendChild(calledList);
    overlay.appendChild(copyButton);
    // overlay.appendChild(jsonLabel);
    // overlay.appendChild(jsonOutput);
  } catch (error) {
    console.error('[Board Click Logger] Could not load Procedure information:', error);
    overlay.textContent = `Could not load Procedure information: ${error.message}`;
  }
}

function injectProcedureTab(panelEl) {
  const procedurePanel = panelEl.querySelector('brd-procedures-panel');
  if (!procedurePanel) return;

  const bodyWrapper = procedurePanel.querySelector('.mat-mdc-tab-body-wrapper');
  if (!bodyWrapper) return;
  if (panelEl.querySelector(procedureTabOptions.buttonSelector)) return;

  const titleEl = procedurePanel.querySelector('brd-panel-toolbar .title');
  if (!titleEl) return;

  const overlay = createCustomTabOverlay(procedureTabOptions.overlaySelector.slice(1));
  wrapCustomTabTitle(titleEl, procedureTabOptions.textClass);

  const button = createCustomTabToggle({
    panelEl,
    overlay,
    buttonClass: procedureTabOptions.buttonSelector.slice(1),
    ariaLabel: 'Toggle procedure info tab',
    title: 'Procedure info',
    onToggle: (currentPanel, currentOverlay, visible) => {
      setCustomTabVisible({
        panelEl: currentPanel,
        overlay: currentOverlay,
        button,
        visible,
        populate: populateProcedureOverlay,
      });
    },
  });

  titleEl.appendChild(button);
  bodyWrapper.appendChild(overlay);
  console.log('[Board Click Logger] Custom procedure tab injected into panel.');
}

closeCustomTabOnRows({
  rowSelector: 'brd-procedures .dx-data-row',
  overlaySelector: procedureTabOptions.overlaySelector,
  buttonSelector: procedureTabOptions.buttonSelector,
  getPanel: (element) => element.closest('brd-procedures-panel')?.closest('.panel')
    ?? element.closest('.panel'),
});

closeCustomTabOnRealTabs({
  overlaySelector: procedureTabOptions.overlaySelector,
  buttonSelector: procedureTabOptions.buttonSelector,
  getPanel: (element) => element.closest('brd-procedures-panel')?.closest('.panel')
    ?? element.closest('.panel'),
});

const procedurePanelObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const procedurePanel = node.matches?.('brd-procedures-panel')
        ? node
        : node.querySelector?.('brd-procedures-panel')
          ?? node.closest?.('brd-procedures-panel');
      const panelEl = procedurePanel?.closest('.panel');
      if (panelEl) injectProcedureTab(panelEl);
    }
  }
});

procedurePanelObserver.observe(document.body, { childList: true, subtree: true });

document.querySelectorAll('brd-procedures-panel').forEach((procedurePanel) => {
  const panelEl = procedurePanel.closest('.panel');
  if (panelEl) injectProcedureTab(panelEl);
});
