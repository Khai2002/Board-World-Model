// Entity custom tab.

const entityTabOptions = {
  overlaySelector: '.board-click-logger-overlay',
  buttonSelector: '.board-click-logger-tab-toggle',
  textClass: 'board-click-logger-text-wrap',
};

function populateEntityOverlay(panelEl, overlay) {
  const cubePanel = panelEl.querySelector('brd-cubes-panel');
  const cubeName = cubePanel
    ?.querySelector('brd-panel-toolbar .title .board-click-logger-text-wrap')
    ?.textContent.trim();
  const nameFieldValue = cubePanel
    ?.querySelector('input[formcontrolname="name"]')
    ?.value;

  console.log('[Board Click Logger] Custom tab opened for cube:', cubeName);

  overlay.innerHTML = '';

  const heading = document.createElement('h3');
  heading.textContent = 'Custom Tab';
  heading.style.margin = '0 0 12px 0';

  const info = document.createElement('div');
  info.style.fontSize = '13px';
  info.style.lineHeight = '1.6';
  info.innerHTML = `
    <div><strong>Cube (panel title):</strong> ${cubeName ?? ''}</div>
    <div><strong>Cube (name field):</strong> ${nameFieldValue ?? ''}</div>
  `;

  overlay.appendChild(heading);
  overlay.appendChild(info);
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
