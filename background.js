const STORAGE_KEY = 'taskboard_data';

function now() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function updateBadge() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const state = result[STORAGE_KEY];
  if (!state || !state.columns) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const nowStr = now();
  let overdueCount = 0;

  for (const col of state.columns) {
    for (const task of col.tasks) {
      if (task.due && !task.done && task.due <= nowStr) {
        overdueCount++;
      }
    }
  }

  if (overdueCount > 0) {
    chrome.action.setBadgeText({ text: String(overdueCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#f85149' });
    chrome.action.setBadgeTextColor({ color: '#ffffff' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Check every 30 minutes
chrome.alarms.create('checkOverdue', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkOverdue') {
    updateBadge();
  }
});

// Update on storage changes (when user modifies tasks)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    updateBadge();
  }
});

// Track side panel open state per tab
const panelOpenTabs = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    const tabId = port.sender.tab?.id;
    if (tabId) panelOpenTabs.add(tabId);
    port.onDisconnect.addListener(() => {
      if (tabId) panelOpenTabs.delete(tabId);
    });
  }
});

// Toggle side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (panelOpenTabs.has(tab.id)) {
    await chrome.sidePanel.setOptions({ tabId: tab.id, enabled: false });
    panelOpenTabs.delete(tab.id);
    await chrome.sidePanel.setOptions({ tabId: tab.id, enabled: true });
  } else {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Update on install/startup
chrome.runtime.onInstalled.addListener(() => updateBadge());
chrome.runtime.onStartup.addListener(() => updateBadge());
