// Entity custom tab.

const entityTabOptions = {
  overlaySelector: '.board-click-logger-overlay',
  buttonSelector: '.board-click-logger-tab-toggle',
  textClass: 'board-click-logger-text-wrap',
};

function normalizeCubeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cubes)) return data.cubes;
  return [];
}

async function populateEntityOverlay(panelEl, overlay) {
  const cubePanel = panelEl.querySelector('brd-cubes-panel');
  const cubeName = cubePanel
    ?.querySelector('brd-panel-toolbar .title .board-click-logger-text-wrap')
    ?.textContent.trim();
  const nameFieldValue = cubePanel
    ?.querySelector('input[formcontrolname="name"]')
    ?.value;
  const selectedCubeName = cubeName || nameFieldValue?.trim();

  overlay.innerHTML = '<div>Loading cube impact analysis...</div>';

  const modelPath = window.location.pathname.match(/\/data-models\/([^/]+)\/cubes(?:\/|$)/)?.[1];
  if (!modelPath || !selectedCubeName) {
    overlay.textContent = 'Unable to identify the selected Cube.';
    return;
  }

  try {
    const { data } = await callBoardAPI('getAllCubes', { dbname: modelPath });
    const cubes = normalizeCubeList(data);
    const cube = cubes.find((item) => item.extended?.trim?.() === selectedCubeName);
    const cubeIdx = cube?.idx;

    if (!cube || cubeIdx === undefined || cubeIdx === null) {
      overlay.textContent = `No Cube was found for "${selectedCubeName}".`;
      return;
    }

    const { data: impactAnalysis } = await callBoardAPI(
      'getCubeImpact',
      { dbname: modelPath, uniqueId: cubeIdx },
    );
    const impactJson = JSON.stringify(impactAnalysis, null, 2) ?? 'undefined';

    overlay.innerHTML = '';

    const info = document.createElement('div');
    info.style.fontSize = '13px';
    info.style.lineHeight = '1.6';
    info.innerHTML = `
      <div><strong>Cube:</strong> ${selectedCubeName}</div>
      <div><strong>Cube ID:</strong> ${cubeIdx}</div>
      <div><strong>Data model:</strong> ${modelPath}</div>
    `;

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'cube-copy-button';
    copyButton.textContent = 'Copy JSON';
    Object.assign(copyButton.style, {
      alignSelf: 'flex-start',
      width: 'max-content',
      marginTop: '16px',
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
          await navigator.clipboard.writeText(impactJson);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = impactJson;
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
        console.error('[Board Click Logger] Could not copy cube impact JSON:', error);
        copyButton.textContent = 'Copy failed';
        setTimeout(() => { copyButton.textContent = 'Copy JSON'; }, 1500);
      }
    });

    const jsonLabel = document.createElement('h4');
    jsonLabel.textContent = 'Cube impact analysis JSON';
    jsonLabel.style.margin = '20px 0 8px 0';

    const jsonOutput = document.createElement('pre');
    jsonOutput.textContent = impactJson;
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

    overlay.appendChild(info);
    overlay.appendChild(copyButton);
    overlay.appendChild(jsonLabel);
    overlay.appendChild(jsonOutput);
  } catch (error) {
    console.error('[Board Click Logger] Could not load Cube impact analysis:', error);
    overlay.textContent = `Could not load Cube impact analysis: ${error.message}`;
  }
}

function injectEntityTab(panelEl) {
  if (panelEl.querySelector(entityTabOptions.buttonSelector)) return;

  const cubePanel = panelEl.querySelector('brd-cubes-panel');
  if (!cubePanel) return;

  const titleEl = cubePanel.querySelector('brd-panel-toolbar .title');
  const bodyWrapper = cubePanel.querySelector('.mat-mdc-tab-body-wrapper');
  if (!titleEl || !bodyWrapper) return;

  const overlay = createCustomTabOverlay(entityTabOptions.overlaySelector.slice(1));
  wrapCustomTabTitle(titleEl, entityTabOptions.textClass);

  const button = createCustomTabToggle({
    panelEl,
    overlay,
    buttonClass: entityTabOptions.buttonSelector.slice(1),
    ariaLabel: 'Toggle custom info tab',
    title: 'Custom info',
    onToggle: (currentPanel, currentOverlay, visible) => {
      setCustomTabVisible({
        panelEl: currentPanel,
        overlay: currentOverlay,
        button,
        visible,
        populate: populateEntityOverlay,
      });
    },
  });

  titleEl.appendChild(button);
  bodyWrapper.appendChild(overlay);
  console.log('[Board Click Logger] Custom entity tab injected into panel.');
}

closeCustomTabOnRows({
  rowSelector: 'brd-cubes .dx-data-row',
  overlaySelector: entityTabOptions.overlaySelector,
  buttonSelector: entityTabOptions.buttonSelector,
  getPanel: (element) => element.closest('brd-cubes-panel')?.closest('.panel')
    ?? element.closest('.panel'),
});

closeCustomTabOnRealTabs({
  overlaySelector: entityTabOptions.overlaySelector,
  buttonSelector: entityTabOptions.buttonSelector,
  getPanel: (element) => element.closest('brd-cubes-panel')?.closest('.panel')
    ?? element.closest('.panel'),
});

const entityPanelObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const panelEl = node.matches?.('.panel') ? node : node.querySelector?.('.panel');
      if (panelEl) injectEntityTab(panelEl);
    }
  }
});

entityPanelObserver.observe(document.body, { childList: true, subtree: true });
