const customTabButtonStyles = {
  marginLeft: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  minWidth: '26px',
  flexShrink: '0',
  borderRadius: '50%',
  border: 'none',
  background: '#32bef0',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '700',
  fontFamily: 'Georgia, serif',
  fontStyle: 'italic',
  lineHeight: '1',
  cursor: 'pointer',
  padding: '0',
  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  transition: 'background 120ms ease, box-shadow 120ms ease',
};

function createCustomTabToggle({ panelEl, overlay, buttonClass, ariaLabel, title, onToggle }) {
  const btn = document.createElement('button');
  btn.className = buttonClass;
  btn.type = 'button';
  btn.setAttribute('aria-label', ariaLabel);
  btn.title = title;
  Object.assign(btn.style, customTabButtonStyles);
  btn.textContent = 'i';

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#1a8fc4';
  });
  btn.addEventListener('mouseleave', () => {
    if (!btn.dataset.active) btn.style.background = '#32bef0';
  });
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle(panelEl, overlay, overlay.style.display === 'none');
  });

  return btn;
}

function setCustomTabVisible({ panelEl, overlay, button, visible, populate }) {
  if (!overlay || !button) return;

  if (visible) {
    overlay.style.display = 'flex';
    button.dataset.active = 'true';
    button.style.background = '#1a8fc4';
    button.style.boxShadow = '0 0 0 3px rgba(50,190,240,0.35)';
    populate(panelEl, overlay);
  } else {
    overlay.style.display = 'none';
    delete button.dataset.active;
    button.style.background = '#32bef0';
    button.style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)';
  }
}

function createCustomTabOverlay(className) {
  const overlay = document.createElement('div');
  overlay.className = className;
  Object.assign(overlay.style, {
    display: 'none',
    flexDirection: 'column',
    position: 'absolute',
    inset: '0',
    zIndex: '5',
    background: '#fff',
    padding: '2.4rem',
    boxSizing: 'border-box',
    overflow: 'auto',
  });
  return overlay;
}

function wrapCustomTabTitle(titleEl, textClass) {
  if (!titleEl || titleEl.querySelector(`.${textClass}`)) return;

  const textSpan = document.createElement('span');
  textSpan.className = textClass;
  Object.assign(textSpan.style, {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '0',
  });
  while (titleEl.firstChild) textSpan.appendChild(titleEl.firstChild);
  titleEl.appendChild(textSpan);
  titleEl.style.overflow = 'visible';
  titleEl.style.display = 'flex';
  titleEl.style.alignItems = 'center';
}

function closeCustomTabOnRows({ rowSelector, overlaySelector, buttonSelector, getPanel }) {
  document.body.addEventListener('click', (event) => {
    if (!event.target.closest(rowSelector)) return;

    document.querySelectorAll(overlaySelector).forEach((overlay) => {
      const panelEl = getPanel(overlay);
      if (panelEl) {
        const button = panelEl.querySelector(buttonSelector);
        setCustomTabVisible({
          panelEl,
          overlay,
          button,
          visible: false,
          populate: () => {},
        });
      }
    });
  });
}

function closeCustomTabOnRealTabs({ overlaySelector, buttonSelector, getPanel }) {
  document.body.addEventListener('click', (event) => {
    const realTab = event.target.closest('[role="tab"]');
    if (!realTab) return;

    const panelEl = getPanel(realTab);
    if (!panelEl) return;

    const overlay = panelEl.querySelector(overlaySelector);
    const button = panelEl.querySelector(buttonSelector);
    setCustomTabVisible({
      panelEl,
      overlay,
      button,
      visible: false,
      populate: () => {},
    });
  });
}