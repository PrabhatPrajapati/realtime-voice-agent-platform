/**
 * Apex Voice AI Dashboard Client
 */

let currentTab = 'overview';
let cachedCustomers = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadAllData();
  // Auto refresh stats every 10 seconds
  setInterval(loadStats, 10000);
});

function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  const activePane = document.getElementById(`tab-${tabId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');

  const titles = {
    overview: { title: 'Operational Overview', subtitle: 'Real-time status of voice AI dialing, customer issues, and CSR handoffs' },
    campaigns: { title: 'Outbound Campaigns', subtitle: 'Bulk voice dialing with BullMQ concurrency & rate limiting' },
    calls: { title: 'Call Logs & Transcripts', subtitle: 'Inspect every AI voice interaction and structured outcome' },
    issues: { title: 'Issues & CSR Handoffs', subtitle: 'Structured issue tickets extracted by OpenAI Realtime Voice Agent' },
    customers: { title: 'Customer Directory', subtitle: 'Audience management, assigned CSRs, and Do-Not-Call compliance' },
  };

  if (titles[tabId]) {
    document.getElementById('page-title').innerText = titles[tabId].title;
    document.getElementById('page-subtitle').innerText = titles[tabId].subtitle;
  }

  refreshCurrentTab();
}

function refreshCurrentTab() {
  loadStats();
  if (currentTab === 'overview') {
    loadRecentCalls();
    loadRecentIssues();
  } else if (currentTab === 'campaigns') {
    loadCampaigns();
  } else if (currentTab === 'calls') {
    loadAllCalls();
  } else if (currentTab === 'issues') {
    loadAllIssues();
  } else if (currentTab === 'customers') {
    loadAllCustomers();
  }
}

function loadAllData() {
  loadStats();
  loadRecentCalls();
  loadRecentIssues();
}

// API Calls
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success) {
      const d = json.data;
      document.getElementById('stat-total-customers').innerText = d.totalCustomers;
      document.getElementById('stat-calls-today').innerText = d.callsToday;
      document.getElementById('stat-no-issue').innerText = d.noIssueCalls;
      document.getElementById('stat-issues-found').innerText = d.issuesFound;
      document.getElementById('stat-transfers').innerText = d.humanTransfers;
      document.getElementById('stat-callbacks').innerText = d.callbacks;
      document.getElementById('open-issues-count').innerText = d.openIssues;
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

async function loadRecentCalls() {
  try {
    const res = await fetch('/api/calls?limit=5');
    const json = await res.json();
    const tbody = document.querySelector('#recent-calls-table tbody');
    if (!json.success || json.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center">No recent calls recorded</td></tr>';
      return;
    }

    tbody.innerHTML = json.items
      .map(
        (c) => `
      <tr onclick="viewCallTranscript('${c.id}')" style="cursor: pointer;">
        <td><strong>${c.customer?.name || 'Unknown'}</strong></td>
        <td>${c.customer?.phone || '-'}</td>
        <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
        <td><span class="badge ${getOutcomeBadgeClass(c.outcome)}">${c.outcome}</span></td>
        <td class="text-muted">${formatDate(c.createdAt)}</td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load recent calls', err);
  }
}

async function loadRecentIssues() {
  try {
    const res = await fetch('/api/issues?limit=5');
    const json = await res.json();
    const tbody = document.querySelector('#recent-issues-table tbody');
    if (!json.success || json.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center">No issues detected</td></tr>';
      return;
    }

    tbody.innerHTML = json.items
      .map(
        (i) => `
      <tr>
        <td><strong>${i.customer?.name || 'Customer'}</strong></td>
        <td><span class="badge badge-info">${i.category}</span></td>
        <td><span class="badge ${getPriorityBadgeClass(i.priority)}">${i.priority}</span></td>
        <td style="max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${i.summary}</td>
        <td>
          ${
            i.status === 'OPEN'
              ? `<button class="btn btn-sm btn-secondary" onclick="resolveIssue('${i.id}')">Resolve</button>`
              : `<span class="badge badge-success">RESOLVED</span>`
          }
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load recent issues', err);
  }
}

async function loadAllCalls() {
  try {
    const res = await fetch('/api/calls?limit=50');
    const json = await res.json();
    const tbody = document.getElementById('all-calls-body');
    if (!json.success || json.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-muted text-center">No calls recorded yet. Click "Launch Call" to place a test call.</td></tr>';
      return;
    }

    tbody.innerHTML = json.items
      .map(
        (c) => `
      <tr>
        <td><code>${c.id.substring(0, 8)}...</code></td>
        <td><strong>${c.customer?.name || 'Unknown'}</strong></td>
        <td>${c.customer?.phone || '-'}</td>
        <td><small class="text-muted">${c.twilioCallSid || 'MOCK'}</small></td>
        <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
        <td><span class="badge ${getOutcomeBadgeClass(c.outcome)}">${c.outcome}</span></td>
        <td>${c.duration ? c.duration + 's' : '-'}</td>
        <td class="text-muted">${formatDate(c.createdAt)}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="viewCallTranscript('${c.id}')">View Transcript</button></td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load all calls', err);
  }
}

async function loadAllIssues() {
  try {
    const res = await fetch('/api/issues?limit=50');
    const json = await res.json();
    const tbody = document.getElementById('all-issues-body');
    if (!json.success || json.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-muted text-center">No issue tickets created yet</td></tr>';
      return;
    }

    tbody.innerHTML = json.items
      .map(
        (i) => `
      <tr>
        <td><strong>${i.customer?.name || 'Customer'}</strong><br><small class="text-muted">${i.customer?.phone || ''}</small></td>
        <td><span class="badge badge-info">${i.category}</span></td>
        <td><span class="badge ${getPriorityBadgeClass(i.priority)}">${i.priority}</span></td>
        <td>${i.summary}</td>
        <td><code>${i.assignedCsrId || 'CSR-001'}</code></td>
        <td><span class="badge ${i.status === 'OPEN' ? 'badge-warning' : 'badge-success'}">${i.status}</span></td>
        <td class="text-muted">${formatDate(i.createdAt)}</td>
        <td>
          ${
            i.status === 'OPEN'
              ? `<button class="btn btn-sm btn-primary" onclick="resolveIssue('${i.id}')">Mark Resolved</button>`
              : `<span class="badge badge-success">✓ Done</span>`
          }
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load all issues', err);
  }
}

async function loadWeeklyStatus() {
  try {
    const res = await fetch('/api/campaigns/weekly-status');
    const json = await res.json();
    if (json.success && json.data) {
      const d = json.data;
      const badge = document.getElementById('weekly-status-badge');
      const dayText = document.getElementById('weekly-day-text');
      const timeText = document.getElementById('weekly-time-text');
      const audCount = document.getElementById('weekly-audience-count');

      if (badge) {
        badge.className = `badge ${d.enabled ? 'badge-success' : 'badge-secondary'}`;
        badge.innerText = d.enabled ? 'Active' : 'Disabled';
      }
      if (dayText) dayText.innerText = d.scheduledDay || 'MONDAY';
      if (timeText) timeText.innerText = `${d.scheduledTime || '10:00'} AM`;
      if (audCount) audCount.innerText = `👥 ${d.activeCustomersCount || 0} Active Customers`;
    }
  } catch (err) {
    console.error('Failed to load weekly status', err);
  }
}

async function triggerWeeklyCheckinNow() {
  const btn = document.getElementById('btn-trigger-weekly');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Launching...';
  }

  try {
    const res = await fetch('/api/campaigns/trigger-weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();

    if (json.success && json.data) {
      alert(`🚀 ${json.data.message}`);
      loadCampaigns();
      loadStats();
    } else {
      alert(json.data?.message || json.message || 'Failed to trigger weekly check-in');
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '⚡ Run Weekly Check-in Now';
    }
  }
}

async function loadCampaigns() {
  try {
    loadWeeklyStatus();
    const res = await fetch('/api/campaigns');
    const json = await res.json();
    const container = document.getElementById('campaigns-list');
    if (!json.success || json.items.length === 0) {
      container.innerHTML = '<div class="card text-center text-muted" style="grid-column: 1/-1;">No campaigns created yet. Click "+ Create Campaign" above.</div>';
      return;
    }

    container.innerHTML = json.items
      .map(
        (c) => `
      <div class="campaign-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h4>${c.name}</h4>
          <span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span>
        </div>
        <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">${c.description || 'No description'}</p>
        
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted);">
          <span>Progress: ${c.completedCalls} / ${c.totalCustomers} calls</span>
          <span><strong>${c.progressPercent}%</strong></span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${c.progressPercent}%;"></div>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 1rem;">
          ${
            c.status === 'DRAFT' || c.status === 'PAUSED'
              ? `<button class="btn btn-sm btn-primary" onclick="startCampaign('${c.id}')">▶ Start Dialing</button>`
              : c.status === 'RUNNING'
              ? `<button class="btn btn-sm btn-secondary" onclick="pauseCampaign('${c.id}')">⏸ Pause</button>`
              : ''
          }
          ${
            c.status !== 'CANCELLED' && c.status !== 'COMPLETED'
              ? `<button class="btn btn-sm btn-secondary" onclick="cancelCampaign('${c.id}')">Cancel</button>`
              : ''
          }
        </div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load campaigns', err);
  }
}

async function loadAllCustomers() {
  try {
    const res = await fetch('/api/customers?limit=100');
    const json = await res.json();
    cachedCustomers = json.items || [];
    const tbody = document.getElementById('all-customers-body');
    if (!json.success || json.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center">No customers in database. Click "+ Add Customer".</td></tr>';
      return;
    }

    tbody.innerHTML = json.items
      .map(
        (cust) => `
      <tr>
        <td><strong>${cust.name}</strong></td>
        <td>${cust.phone}</td>
        <td>${cust.email || '-'}</td>
        <td><code>${cust.assignedCsrId || 'CSR-001'}</code></td>
        <td><span class="badge ${cust.status === 'ACTIVE' ? 'badge-success' : cust.status === 'DO_NOT_CALL' ? 'badge-danger' : 'badge-secondary'}">${cust.status}</span></td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="triggerDirectCall('${cust.id}', '${cust.name}', '${cust.phone}')">📞 Call</button>
          ${
            cust.status !== 'DO_NOT_CALL'
              ? `<button class="btn btn-sm btn-secondary" onclick="toggleDNC('${cust.id}')">Mark DNC</button>`
              : ''
          }
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load customers', err);
  }
}

// Call Transcripts Viewer
async function viewCallTranscript(callId) {
  try {
    const res = await fetch(`/api/calls/${callId}`);
    const json = await res.json();
    if (!json.success || !json.data) return;

    const call = json.data;
    const strip = document.getElementById('transcript-summary-strip');
    strip.innerHTML = `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
        <div><strong>Customer:</strong> ${call.customer?.name || 'Unknown'} (${call.customer?.phone || '-'})</div>
        <div><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(call.status)}">${call.status}</span></div>
        <div><strong>Outcome:</strong> <span class="badge ${getOutcomeBadgeClass(call.outcome)}">${call.outcome}</span></div>
        ${call.issue ? `<div><strong>Issue Category:</strong> <span class="badge badge-warning">${call.issue.category}</span></div>` : ''}
      </div>
    `;

    const chatBox = document.getElementById('transcript-chat-box');
    if (!call.messages || call.messages.length === 0) {
      chatBox.innerHTML = '<div class="text-muted text-center" style="padding: 2rem;">No transcript messages recorded for this call session yet.</div>';
    } else {
      chatBox.innerHTML = call.messages
        .map(
          (m) => `
        <div class="msg-bubble ${m.speaker.toLowerCase()}">
          <div class="msg-speaker">${m.speaker}</div>
          <div>${m.text}</div>
          <small class="text-muted" style="font-size: 0.7rem; display: block; margin-top: 4px;">${new Date(m.timestamp).toLocaleTimeString()}</small>
        </div>
      `
        )
        .join('');
    }

    openModal('modal-transcript');
  } catch (err) {
    console.error('Failed to view transcript', err);
  }
}

// Test Call Actions
function openTestCallModal() {
  openModal('modal-test-call');
}

async function submitTestCall(event) {
  event.preventDefault();
  const name = document.getElementById('tc-name').value;
  const phone = document.getElementById('tc-phone').value;
  const btn = document.getElementById('btn-submit-call');

  btn.innerText = 'Dialing...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/calls/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, phone }),
    });

    const json = await res.json();
    if (json.success) {
      closeModal('modal-test-call');
      refreshCurrentTab();
      alert(`Call initiated successfully! Call ID: ${json.data.id}`);
    } else {
      alert(`Failed to place call: ${json.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btn.innerText = 'Dial Now';
    btn.disabled = false;
  }
}

async function triggerDirectCall(customerId, name, phone) {
  if (confirm(`Do you want to place an outbound AI call to ${name} (${phone})?`)) {
    try {
      const res = await fetch('/api/calls/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Call placed to ${name}!`);
        refreshCurrentTab();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }
}

// Customer Actions
function openCreateCustomerModal() {
  openModal('modal-customer');
}

async function submitCreateCustomer(event) {
  event.preventDefault();
  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const email = document.getElementById('cust-email').value;
  const assignedCsrId = document.getElementById('cust-csr').value;

  try {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email: email || undefined, assignedCsrId }),
    });
    const json = await res.json();
    if (json.success) {
      closeModal('modal-customer');
      refreshCurrentTab();
    } else {
      alert(`Error: ${json.error}`);
    }
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
}

async function toggleDNC(customerId) {
  if (confirm('Mark this customer as DO_NOT_CALL (Opt-Out)?')) {
    try {
      await fetch(`/api/customers/${customerId}/do-not-call`, { method: 'POST' });
      refreshCurrentTab();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }
}

// Campaign Actions
async function openCreateCampaignModal() {
  await loadAllCustomers();
  const list = document.getElementById('camp-customers-selection');
  if (cachedCustomers.length === 0) {
    list.innerHTML = '<span class="text-muted">No customers found. Add customers first.</span>';
  } else {
    list.innerHTML = cachedCustomers
      .filter((c) => c.status !== 'DO_NOT_CALL')
      .map(
        (c) => `
      <label style="display: flex; gap: 0.5rem; align-items: center; cursor: pointer;">
        <input type="checkbox" name="camp_cust" value="${c.id}" checked>
        <span>${c.name} (${c.phone})</span>
      </label>
    `
      )
      .join('');
  }
  openModal('modal-campaign');
}

async function submitCreateCampaign(event) {
  event.preventDefault();
  const name = document.getElementById('camp-name').value;
  const description = document.getElementById('camp-desc').value;
  const concurrency = parseInt(document.getElementById('camp-concurrency').value, 10);
  const checked = Array.from(document.querySelectorAll('input[name="camp_cust"]:checked')).map(
    (el) => el.value
  );

  if (checked.length === 0) {
    alert('Please select at least 1 customer to call.');
    return;
  }

  try {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, concurrency, customerIds: checked }),
    });
    const json = await res.json();
    if (json.success) {
      closeModal('modal-campaign');
      refreshCurrentTab();
    } else {
      alert(`Error: ${json.error}`);
    }
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
}

async function startCampaign(id) {
  try {
    await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
    refreshCurrentTab();
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
}

async function pauseCampaign(id) {
  try {
    await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' });
    refreshCurrentTab();
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
}

async function cancelCampaign(id) {
  if (confirm('Are you sure you want to cancel this campaign?')) {
    try {
      await fetch(`/api/campaigns/${id}/cancel`, { method: 'POST' });
      refreshCurrentTab();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }
}

// Issue Actions
async function resolveIssue(issueId) {
  try {
    await fetch(`/api/issues/${issueId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Resolved by CSR' }),
    });
    refreshCurrentTab();
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Format Helpers
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'COMPLETED':
    case 'ANSWERED':
    case 'ACTIVE':
    case 'RUNNING':
      return 'badge-success';
    case 'DIALING':
    case 'RINGING':
    case 'AI_CONNECTED':
    case 'IN_PROGRESS':
    case 'CALLING':
      return 'badge-info';
    case 'QUEUED':
    case 'PENDING':
    case 'DRAFT':
    case 'PAUSED':
      return 'badge-warning';
    case 'FAILED':
    case 'CANCELLED':
    case 'DO_NOT_CALL':
      return 'badge-danger';
    default:
      return 'badge-secondary';
  }
}

function getOutcomeBadgeClass(outcome) {
  switch (outcome) {
    case 'NO_ISSUE':
      return 'badge-success';
    case 'ISSUE_FOUND':
    case 'HUMAN_REQUESTED':
      return 'badge-danger';
    case 'CALLBACK':
      return 'badge-info';
    case 'VOICEMAIL':
    case 'NO_ANSWER':
      return 'badge-warning';
    default:
      return 'badge-secondary';
  }
}

function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'URGENT':
    case 'HIGH':
      return 'badge-danger';
    case 'MEDIUM':
      return 'badge-warning';
    case 'LOW':
      return 'badge-info';
    default:
      return 'badge-secondary';
  }
}
