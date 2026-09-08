// Procedure custom tab.

const procedureTabOptions = {
  overlaySelector: '.procedure-click-logger-overlay',
  buttonSelector: '.procedure-click-logger-tab-toggle',
  textClass: 'procedure-click-logger-text-wrap',
};

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
    const procedure = procedures.find((item) => item.description === procedureName);
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


    overlay.innerHTML = '';
    const headingRow = document.createElement('div');
    Object.assign(headingRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '12px',
    });

    const heading = document.createElement('h3');
    heading.textContent = 'Procedure Information';
    heading.style.margin = '0';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy JSON';
    Object.assign(copyButton.style, {
      cursor: 'pointer',
      border: '1px solid #bbb',
      borderRadius: '4px',
      background: '#fff',
      padding: '6px 10px',
    });
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
    calledLabel.style.margin = '20px 0 8px 0';

    const calledList = document.createElement('ul');
    calledList.style.margin = '0';
    calledList.style.paddingLeft = '0';
    calledList.style.listStyleType = 'none';
    if (proceduresToExecute.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = 'This procedure does not call another procedure.';
      calledList.appendChild(emptyItem);
    } else {
      const listStack = [{ depth: 0, list: calledList }];

      proceduresToExecute.forEach(({ procedure: calledProcedure, depth }, index) => {
        while (listStack.at(-1).depth >= depth) listStack.pop();

        const item = document.createElement('li');
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        const childList = document.createElement('ul');

        summary.textContent = `${index + 1}. ${calledProcedure.description}`;
        summary.style.cursor = 'pointer';
        summary.style.fontWeight = '600';
        details.open = true;
        details.appendChild(summary);
        item.style.marginBottom = '10px';
        childList.style.margin = '8px 0 0 8px';
        childList.style.paddingLeft = '16px';
        childList.style.listStyleType = 'none';
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

    headingRow.appendChild(heading);
    headingRow.appendChild(copyButton);
    overlay.appendChild(headingRow);
    overlay.appendChild(info);
    overlay.appendChild(calledLabel);
    overlay.appendChild(calledList);
    overlay.appendChild(jsonLabel);
    overlay.appendChild(jsonOutput);
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
