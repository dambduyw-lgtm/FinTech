/**
 * BNPL Safeguard — Background Service Worker (Manifest V3)
 * Handles extension lifecycle and badge updates.
 */

const API = 'http://localhost:3001';

// Update the extension badge with the current traffic light colour
async function updateBadge() {
  try {
    const res = await fetch(`${API}/api/bnpl/burden`, { credentials: 'include' });
    if (!res.ok) return;

    const data = await res.json();
    const colours = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };
    const colour = colours[data.trafficLight] || '#94a3b8';

    chrome.action.setBadgeBackgroundColor({ color: colour });
    chrome.action.setBadgeText({ text: data.trafficLight === 'red' ? '!' : '' });
  } catch {
    // Backend not running or user not connected — silent fail
  }
}

// Refresh badge when extension is installed or browser starts
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
