window.onerror = function(msg, url, line, col, error) {
  document.body.innerHTML += "<div style='color:red; font-size: 30px; position:absolute; z-index:9999; top:0; left:0; background:white; border: 5px solid red; padding: 20px;'>ERROR: " + msg + "<br>Line: " + line + "</div>";
};

// State
const state = {
  activePage: 'dashboard',
  timer: {
    mode: 'pomodoro', // pomodoro, short, long
    timeLeft: 25 * 60,
    isRunning: false,
    interval: null,
    sessionsCompleted: 0,
    focusTimeToday: 0
  },
  notes: [],
  subjects: [],
  subjectFilter: 'all',
  sessions: [],
  profile: { id: 1, name: 'Student', email: '', institution: '', bio: '', level: 'Beginner', goal: 'Learn and grow', avatar_color: '#7c3aed' },
  allProfiles: [],
  streak: 5
};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

// Timer Elements
const timerDisplay = document.getElementById('timerDisplay');
const timerStartStop = document.getElementById('timerStartStop');
const timerIcon = document.getElementById('timerIcon');
const timerReset = document.getElementById('timerReset');
const timerSkip = document.getElementById('timerSkip');
const timerRingCircle = document.getElementById('timerRingCircle');
const timerTabs = document.querySelectorAll('.timer-tab');
const timerLabel = document.getElementById('timerLabel');

// Initialization
function init() {
  setupNavigation();
  updateDashboardStats();
  setupTimer();
  setupPlanner();
  setupNotes();
  setupModals();
  renderBars();
  setupTutor();
  fetchInsight();
  setupSubjects();
  setupSchedule();
  setupSearch();
  setupNotifications();
  setupProfile();
}

// Navigation
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.getAttribute('data-page');
      navigateTo(pageId);
    });
  });
}

function navigateTo(pageId) {
  // Update nav state
  navItems.forEach(nav => nav.classList.remove('active'));
  document.getElementById(`nav-${pageId}`).classList.add('active');

  // Update page visibility
  pages.forEach(page => page.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');

  // Update Topbar titles
  const titles = {
    'dashboard': { title: 'Dashboard', sub: 'Your AI-powered study command center' },
    'ai-planner': { title: 'AI Planner', sub: 'Generate personalized study paths' },
    'subjects': { title: 'Subjects', sub: 'Manage your curriculum' },
    'schedule': { title: 'Schedule', sub: 'Your timeline for success' },
    'timer': { title: 'Focus Timer', sub: 'Stay in the zone with Pomodoro' },
    'analytics': { title: 'Analytics', sub: 'Track your progress and insights' },
    'notes': { title: 'Notes', sub: 'Capture and organize your thoughts' },
    'ai-tutor': { title: 'AI Tutor', sub: 'Your personal 24/7 learning assistant' },
  };

  pageTitle.textContent = titles[pageId].title;
  pageSubtitle.textContent = titles[pageId].sub;
  state.activePage = pageId;
  
  if (pageId === 'analytics') {
    renderAnalytics();
  }
}

// Global navigate function for inline onclick
window.navigateTo = navigateTo;

// Timer Logic
function setupTimer() {
  timerStartStop.addEventListener('click', toggleTimer);
  timerReset.addEventListener('click', resetTimer);
  timerSkip.addEventListener('click', skipTimer);

  timerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      timerTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      setTimerMode(tab.getAttribute('data-mode'));
    });
  });
  
  updateTimerDisplay();
  renderPomodoroDots();
}

function populateTimerSubjects() {
  const select = document.getElementById('timerSubject');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select subject...</option>';
  state.subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    if (String(s.id) === String(current)) opt.selected = true;
    select.appendChild(opt);
  });
}

function setTimerMode(mode) {
  state.timer.mode = mode;
  state.timer.isRunning = false;
  clearInterval(state.timer.interval);
  
  if (mode === 'pomodoro') {
    state.timer.timeLeft = 25 * 60;
    timerLabel.textContent = 'Focus Time';
  } else if (mode === 'short') {
    state.timer.timeLeft = 5 * 60;
    timerLabel.textContent = 'Short Break';
  } else if (mode === 'long') {
    state.timer.timeLeft = 15 * 60;
    timerLabel.textContent = 'Long Break';
  }
  
  updateTimerDisplay();
  updatePlayButton(false);
}

function toggleTimer() {
  if (state.timer.isRunning) {
    clearInterval(state.timer.interval);
    state.timer.isRunning = false;
    updatePlayButton(false);
  } else {
    state.timer.isRunning = true;
    updatePlayButton(true);
    state.timer.interval = setInterval(() => {
      state.timer.timeLeft--;
      if (state.timer.timeLeft < 0) {
        completeTimerSession();
      } else {
        updateTimerDisplay();
      }
    }, 1000);
  }
}

function resetTimer() {
  setTimerMode(state.timer.mode);
}

function skipTimer() {
  completeTimerSession();
}

function completeTimerSession() {
  clearInterval(state.timer.interval);
  state.timer.isRunning = false;
  updatePlayButton(false);
  
  if (state.timer.mode === 'pomodoro') {
    state.timer.sessionsCompleted++;
    state.timer.focusTimeToday += 25;
    document.getElementById('ssCompleted').textContent = state.timer.sessionsCompleted;
    document.getElementById('ssFocusTime').textContent = state.timer.focusTimeToday + 'm';
    renderPomodoroDots();
    showToast('Focus session completed! Great job.', 'success');
    
    // Auto switch to short break
    document.getElementById('tab-short').click();
  } else {
    showToast('Break is over. Back to focus!', 'info');
    document.getElementById('tab-pomodoro').click();
  }
}

function updateTimerDisplay() {
  const m = Math.floor(state.timer.timeLeft / 60);
  const s = state.timer.timeLeft % 60;
  timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  
  // Update Ring
  const total = state.timer.mode === 'pomodoro' ? 25*60 : (state.timer.mode === 'short' ? 5*60 : 15*60);
  const progress = state.timer.timeLeft / total;
  const dashoffset = 753.98 * (1 - progress);
  timerRingCircle.style.strokeDashoffset = dashoffset;
}

function updatePlayButton(isPlaying) {
  if (isPlaying) {
    timerIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; // Pause icon
  } else {
    timerIcon.innerHTML = `<path d="M8 5v14l11-7L8 5z"/>`; // Play icon
  }
}

function renderPomodoroDots() {
  const container = document.getElementById('pomodoroDots');
  container.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = `dot ${i < (state.timer.sessionsCompleted % 4) ? 'filled' : ''}`;
    container.appendChild(dot);
  }
}

// AI Planner Logic
function setupPlanner() {
  const form = document.getElementById('plannerForm');
  const levelBtns = document.querySelectorAll('.level-btn');
  const dayBtns = document.querySelectorAll('.day-btn');
  const hoursSlider = document.getElementById('dailyHours');
  const hoursValue = document.getElementById('hoursValue');
  
  hoursSlider.addEventListener('input', (e) => {
    hoursValue.textContent = `${e.target.value} hrs`;
  });

  levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateStudyPlan();
  });
}

function generateStudyPlan() {
  const btn = document.getElementById('generateBtn');
  const btnText = document.getElementById('generateBtnText');
  const topic = document.getElementById('studyTopic').value || 'General Studies';
  const startDate = document.getElementById('startDate').value;
  const goalDate = document.getElementById('goalDate').value;
  const hours = document.getElementById('dailyHours').value;
  const level = document.querySelector('.level-btn.active')?.dataset.level || 'beginner';
  const objectives = document.getElementById('objectives').value;
  
  btnText.textContent = 'AI is thinking...';
  btn.style.opacity = '0.8';
  btn.disabled = true;

  fetch('/api/generate_plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, start_date: startDate, goal_date: goalDate, hours, level, objectives })
  })
  .then(res => res.json())
  .then(data => {
    btnText.textContent = 'Generate My Study Plan';
    btn.style.opacity = '1';
    btn.disabled = false;
    
    document.getElementById('plannerOutput').style.display = 'block';
    
    const output = document.getElementById('planContent');
    if (data.error) {
      output.innerHTML = `<div class="plan-item" style="border-left-color: #ef4444;"><h4>Error</h4><p>${data.error}</p></div>`;
      showToast('Failed to generate plan', 'error');
    } else {
      output.innerHTML = data.plan;
      showToast('Plan generated and fully configured by AI Agent!', 'success');
      
      // Autonomous System: Refresh all data affected by the AI Agent
      fetch('/api/subjects').then(r => r.json()).then(d => { state.subjects = d; if(typeof renderSubjectsList === 'function') renderSubjectsList(); });
      fetch('/api/sessions').then(r => r.json()).then(d => { state.sessions = d; if(typeof renderSchedule === 'function') renderSchedule(); });
      fetch('/api/notes').then(r => r.json()).then(d => { state.notes = d; if(typeof renderNotesList === 'function') renderNotesList(); });
    }
    document.getElementById('plannerOutput').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(err => {
    btnText.textContent = 'Generate My Study Plan';
    btn.style.opacity = '1';
    btn.disabled = false;
    showToast('An error occurred', 'error');
  });
}

// Notes Logic
function setupNotes() {
  const newNoteBtn = document.getElementById('newNoteBtn');
  newNoteBtn.addEventListener('click', createNewNote);

  const autoGenBtn = document.getElementById('autoGenerateNoteBtn');
  if (autoGenBtn) {
    autoGenBtn.addEventListener('click', autoGenerateNote);
  }
  
  fetch('/api/notes')
    .then(res => res.json())
    .then(data => {
      state.notes = data;
      renderNotesList();
    });
}

function createNewNote() {
  const newNote = { title: 'Untitled Note', body: '' };
  
  fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newNote)
  })
  .then(res => res.json())
  .then(data => {
    state.notes.unshift(data);
    renderNotesList();
    openNote(data.id);
  });
}

function renderNotesList() {
  const list = document.getElementById('notesList');
  list.innerHTML = '';
  
  state.notes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <h4>${note.title || 'Untitled'}</h4>
      <p>${(note.body || '').substring(0, 30) || 'No additional text...'}</p>
    `;
    item.addEventListener('click', () => {
      document.querySelectorAll('.note-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      openNote(note.id);
    });
    list.appendChild(item);
  });
  
  updateDashboardStats();
}

function openNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  const editorArea = document.getElementById('notesEditorArea');
  
  editorArea.innerHTML = `
    <div class="note-editor">
      <input type="text" class="note-title-input" value="${note.title}" placeholder="Note Title">
      <textarea class="note-body-input" placeholder="Start typing your notes here...">${note.body || ''}</textarea>
    </div>
  `;
  
  const titleInput = editorArea.querySelector('.note-title-input');
  const bodyInput = editorArea.querySelector('.note-body-input');
  
  let timeoutId;
  const saveNote = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: note.title, body: note.body })
      });
    }, 1000);
  };

  titleInput.addEventListener('input', (e) => {
    note.title = e.target.value;
    renderNotesList();
    saveNote();
  });
  
  bodyInput.addEventListener('input', (e) => {
    note.body = e.target.value;
    renderNotesList();
    saveNote();
  });
}

function autoGenerateNote() {
  const topic = prompt("Enter a topic to generate study notes for:");
  if (!topic) return;
  
  showToast('AI is generating notes...', 'info');
  
  fetch('/api/generate_notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast(data.error, 'error');
      return;
    }
    
    const newNote = { title: `${topic} (AI Generated)`, body: data.notes };
    
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    })
    .then(res => res.json())
    .then(savedNote => {
      state.notes.unshift(savedNote);
      renderNotesList();
      openNote(savedNote.id);
      showToast('Notes generated successfully!', 'success');
    });
  })
  .catch(err => {
    showToast('Failed to generate notes', 'error');
  });
}

// UI Utilities
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    if(container.contains(toast)) container.removeChild(toast);
  }, 3500);
}

function setupModals() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if(e.target === document.getElementById('modalOverlay')) closeModal();
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function updateDashboardStats() {
  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = state.streak;
  
  // Subjects
  const completedCount = state.subjects.filter(s => s.status === 'completed').length;
  const totalSubjects = state.subjects.length;
  const statSubjEl = document.getElementById('statSubjects');
  if (statSubjEl) statSubjEl.textContent = totalSubjects;
  
  const completionPct = totalSubjects === 0 ? 0 : Math.round((completedCount / totalSubjects) * 100);
  const statCompEl = document.getElementById('statCompleted');
  if (statCompEl) statCompEl.textContent = `${completionPct}%`;
  
  // Hours (from sessions)
  const totalMinutes = state.sessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);
  const statHoursEl = document.getElementById('statHours');
  if (statHoursEl) statHoursEl.textContent = `${totalHours}h`;
  
  // Set progress rings
  const ring1 = document.getElementById('ring1');
  if (ring1) {
    const goalPct = Math.min(100, (totalSubjects * 10) + 10);
    ring1.style.strokeDashoffset = 251 * (1 - (goalPct/100));
    document.getElementById('ring1pct').textContent = `${goalPct}%`;
  }
  
  const ring2 = document.getElementById('ring2');
  if (ring2) {
    const focusPct = Math.min(100, (totalHours * 5) + 15);
    ring2.style.strokeDashoffset = 251 * (1 - (focusPct/100));
    document.getElementById('ring2pct').textContent = `${focusPct}%`;
  }
  
  const ring3 = document.getElementById('ring3');
  if (ring3) {
    ring3.style.strokeDashoffset = 251 * (1 - (completionPct/100));
    document.getElementById('ring3pct').textContent = `${completionPct}%`;
  }
  
  // Recent Activity
  const act = document.getElementById('activityList');
  if (act) {
    if (state.sessions.length === 0 && state.notes.length === 0 && state.subjects.length === 0) {
      act.innerHTML = '<div class="empty-state small"><p>No activity yet. Start studying!</p></div>';
    } else {
      let html = '';
      const recent = [...state.sessions.map(s => ({...s, type: 'session'})), ...state.notes.map(n => ({...n, type: 'note'})), ...state.subjects.map(s => ({...s, type: 'subject'}))].slice(0, 4);
      recent.forEach(item => {
        let action = item.type === 'session' ? 'Scheduled session:' : (item.type === 'note' ? 'Created note:' : 'Added subject:');
        let title = item.title || item.name;
        html += `
          <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.95em;">${action} <b>${title}</b></span> 
            <span style="color:var(--text-muted); font-size: 0.8em; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">Recent</span>
          </div>
        `;
      });
      act.innerHTML = html;
    }
  }
  renderBars();
}

// Analytics Logic
function renderAnalytics() {
  renderAnalyticsSummary();
  renderWeeklyBarChart();
  renderSubjectDistribution();
  renderPerformanceTrends();
  renderStudyHeatmap();
}

function renderAnalyticsSummary() {
  const container = document.getElementById('analyticsSummary');
  if (!container) return;

  const totalMinutes = state.sessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
  const avgSession = state.sessions.length > 0 ? Math.round(totalMinutes / state.sessions.length) : 0;
  const totalSubjects = state.subjects.length;
  const totalSessions = state.sessions.length;

  container.innerHTML = `
    <div class="stat-card" style="--accent:#7c3aed">
      <div class="stat-icon">⏱️</div>
      <div class="stat-body">
        <div class="stat-value">${Math.round(totalMinutes / 60)}h</div>
        <div class="stat-label">Total Time</div>
      </div>
    </div>
    <div class="stat-card" style="--accent:#0891b2">
      <div class="stat-icon">📈</div>
      <div class="stat-body">
        <div class="stat-value">${avgSession}m</div>
        <div class="stat-label">Avg Session</div>
      </div>
    </div>
    <div class="stat-card" style="--accent:#059669">
      <div class="stat-icon">📅</div>
      <div class="stat-body">
        <div class="stat-value">${totalSessions}</div>
        <div class="stat-label">Sessions</div>
      </div>
    </div>
    <div class="stat-card" style="--accent:#dc2626">
      <div class="stat-icon">📚</div>
      <div class="stat-body">
        <div class="stat-value">${totalSubjects}</div>
        <div class="stat-label">Subjects</div>
      </div>
    </div>
  `;
}

function getRecentStudyData() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySessions = state.sessions.filter(s => s.date === dateStr);
    const totalMin = daySessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
    days.push({ date: dateStr, minutes: totalMin, label: d.toLocaleDateString('en-US', { weekday: 'short' }) });
  }
  return days;
}

function renderWeeklyBarChart() {
  const chart = document.getElementById('weeklyBarChart');
  if(!chart) return;
  
  const data = getRecentStudyData();
  const maxMin = Math.max(...data.map(d => d.minutes), 60); // Min 60 for scale
  
  chart.innerHTML = '';
  data.forEach(d => {
    const height = (d.minutes / maxMin) * 100;
    const barWrap = document.createElement('div');
    barWrap.style = "display:flex; flex-direction:column; align-items:center; flex:1; gap:8px; height:100%; justify-content:flex-end;";
    
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(5, height)}%`;
    bar.setAttribute('data-value', `${d.minutes}m`);
    
    const label = document.createElement('span');
    label.style = "font-size: 10px; color: var(--text-muted);";
    label.textContent = d.label;
    
    barWrap.appendChild(bar);
    barWrap.appendChild(label);
    chart.appendChild(barWrap);
  });
}

function renderSubjectDistribution() {
  const container = document.getElementById('donutChart');
  if (!container) return;

  const subData = {};
  state.sessions.forEach(s => {
    // Attempt to match session title with subject name or use "General"
    const sub = state.subjects.find(sub => s.title.toLowerCase().includes(sub.name.toLowerCase())) || { name: 'Other', color: '#64748b' };
    subData[sub.name] = (subData[sub.name] || 0) + (parseInt(s.duration) || 0);
  });

  const total = Object.values(subData).reduce((a, b) => a + b, 0);
  if (total === 0) {
    container.innerHTML = '<p class="text-muted">No data available</p>';
    return;
  }

  let html = '<div class="donut-chart-container"><svg viewBox="0 0 100 100" class="donut-chart-svg">';
  let offset = 0;
  const colors = ['#7c3aed', '#0891b2', '#059669', '#ec4899', '#f59e0b'];
  
  Object.entries(subData).forEach(([name, val], i) => {
    const pct = (val / total) * 100;
    const dash = `${pct} ${100 - pct}`;
    html += `<circle class="donut-segment" cx="50" cy="50" r="40" stroke="${colors[i % colors.length]}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}"></circle>`;
    offset += pct;
  });

  html += `</svg><div class="donut-center-text"><div class="donut-val">${total > 60 ? Math.round(total/60)+'h' : total+'m'}</div><div class="donut-lbl">Total</div></div></div>`;
  
  // Legend
  html += '<div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
  Object.entries(subData).forEach(([name, val], i) => {
    html += `<div style="display:flex; align-items:center; gap:8px; font-size:0.8rem;">
      <div style="width:10px; height:10px; border-radius:2px; background:${colors[i % colors.length]}"></div>
      <span style="color:var(--text-muted)">${name} (${Math.round((val/total)*100)}%)</span>
    </div>`;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

function renderPerformanceTrends() {
  const container = document.getElementById('lineChart');
  if (!container) return;

  const data = getRecentStudyData();
  const max = Math.max(...data.map(d => d.minutes), 60);
  const width = 300;
  const height = 150;
  
  let points = "";
  data.forEach((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.minutes / max) * height;
    points += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="line-chart-svg">
      <path class="line-path" d="${points}"></path>
      ${data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (d.minutes / max) * height;
        return `<circle class="line-point" cx="${x}" cy="${y}" r="4"></circle>`;
      }).join('')}
    </svg>
  `;
}

function renderStudyHeatmap() {
  const container = document.getElementById('heatmap');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let html = '<div style="width:100%"><div class="heatmap-grid">';
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = d.toISOString().split('T')[0];
    const sessions = state.sessions.filter(s => s.date === dateStr);
    const count = sessions.length;
    let level = 0;
    if (count > 0) level = 1;
    if (count > 2) level = 2;
    if (count > 4) level = 3;
    if (count > 6) level = 4;
    
    html += `<div class="heatmap-day level-${level}" data-date="${dateStr}" title="${count} sessions"></div>`;
  }
  html += '</div>';
  
  // Legend
  html += `
    <div class="analytics-legend">
      <span>Less</span>
      <div class="legend-item"><div class="legend-color level-0"></div></div>
      <div class="legend-item"><div class="legend-color level-1"></div></div>
      <div class="legend-item"><div class="legend-color level-2"></div></div>
      <div class="legend-item"><div class="legend-color level-3"></div></div>
      <div class="legend-item"><div class="legend-color level-4"></div></div>
      <span>More</span>
    </div>
  </div>`;
  
  container.innerHTML = html;
}

function renderBars() {
  // Replaced by renderWeeklyBarChart, but keeping for dashboard compatibility if needed
  renderWeeklyBarChart();
}

// AI Features

function fetchInsight() {
  const refreshBtn = document.getElementById('refreshInsightBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadNewInsight);
  loadNewInsight();
}

function loadNewInsight() {
  const textEl = document.getElementById('insightText');
  const dotsEl = document.getElementById('insightDots');
  
  textEl.textContent = "Analyzing your study patterns...";
  if(dotsEl) dotsEl.style.display = 'inline-block';
  
  fetch('/api/ai_insights')
    .then(res => res.json())
    .then(data => {
      textEl.innerHTML = `<strong>Insight:</strong> ${data.insight}`;
      if(dotsEl) dotsEl.style.display = 'none';
    })
    .catch(err => {
      textEl.textContent = "Keep up the great work today!";
      if(dotsEl) dotsEl.style.display = 'none';
    });
}

function setupTutor() {
  const sendBtn = document.getElementById('tutorSendBtn');
  const inputEl = document.getElementById('tutorInput');
  
  if(!sendBtn || !inputEl) return;
  
  const sendMessage = () => {
    const question = inputEl.value.trim();
    if (!question) return;
    
    appendChatMessage('user', question);
    inputEl.value = '';
    
    // Add loading message
    const loadingId = 'loading-' + Date.now();
    appendChatMessage('bot', '<div class="typing-dots"><span></span><span></span><span></span></div>', loadingId);
    
    fetch('/api/ai_tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, context: "General Studies" })
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById(loadingId)?.remove();
      if (data.error) {
        appendChatMessage('bot', "Sorry, I ran into an error: " + data.error);
      } else {
        appendChatMessage('bot', data.answer.replace(/\n/g, '<br>'));
      }
    })
    .catch(err => {
      document.getElementById(loadingId)?.remove();
      appendChatMessage('bot', "Connection error. Please try again later.");
    });
  };
  
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function appendChatMessage(role, htmlContent, id = null) {
  const chatArea = document.getElementById('tutorChatArea');
  if (!chatArea) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role}`;
  if (id) msgDiv.id = id;
  
  if (role === 'user') {
    msgDiv.style = "background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 12px; align-self: flex-end; max-width: 80%; text-align: right;";
    msgDiv.innerHTML = `<strong>You:</strong> ${htmlContent}`;
  } else {
    msgDiv.style = "background: rgba(124, 58, 237, 0.1); padding: 15px; border-radius: 12px; border-left: 4px solid var(--primary); align-self: flex-start; max-width: 80%;";
    msgDiv.innerHTML = `<strong>AI Tutor:</strong> <br> ${htmlContent}`;
  }
  
  chatArea.appendChild(msgDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Subjects Logic
function setupSubjects() {
  const btn1 = document.getElementById('addSubjectBtn');
  const btn2 = document.getElementById('addSubjectBtn2');
  
  const addSubject = () => {
    const name = prompt("Enter subject name:");
    if (!name) return;
    
    const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, color: color })
    })
    .then(res => res.json())
    .then(data => {
      state.subjects.unshift(data);
      renderSubjectsList();
      populateTimerSubjects();
      showToast('Subject added successfully!', 'success');
    });
  };

  if (btn1) btn1.addEventListener('click', addSubject);
  if (btn2) btn2.addEventListener('click', addSubject);
  
  const filterBtns = document.querySelectorAll('.subject-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.subjectFilter = btn.getAttribute('data-filter');
      renderSubjectsList();
    });
  });
  
  fetch('/api/subjects')
    .then(res => res.json())
    .then(data => {
      state.subjects = data;
      renderSubjectsList();
      populateTimerSubjects();
    });
}

function renderSubjectsList() {
  const grid = document.getElementById('subjectsGrid');
  if (!grid) return;
  
  if (state.subjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state large">
        <div class="empty-icon">📚</div>
        <h3>No subjects yet</h3>
        <p>Add your first subject to get started</p>
        <button class="btn-primary" onclick="document.getElementById('addSubjectBtn').click()">+ Add Subject</button>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = '';
  
  const filteredSubjects = state.subjects.filter(s => {
    if (state.subjectFilter === 'all') return true;
    if (state.subjectFilter === 'active') return s.status === 'active';
    if (state.subjectFilter === 'completed') return s.status === 'completed';
    return true;
  });
  
  if (filteredSubjects.length === 0 && state.subjects.length > 0) {
    grid.innerHTML = `<div class="empty-state large" style="grid-column: 1 / -1;"><p>No ${state.subjectFilter} subjects found.</p></div>`;
    return;
  }
  
  filteredSubjects.forEach(subject => {
    const isCompleted = subject.status === 'completed';
    const card = document.createElement('div');
    card.className = 'card subject-card';
    card.style = `border-top: 4px solid ${subject.color || '#7c3aed'}; opacity: ${isCompleted ? '0.7' : '1'};`;
    card.innerHTML = `
      <div class="card-header" style="justify-content: space-between;">
        <h3 style="margin: 0;">${subject.name}</h3>
        <button class="btn-icon" onclick="deleteSubject(${subject.id})" title="Delete" style="color: var(--text-muted);">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4h8M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">
        <p style="color: var(--text-muted); font-size: 0.9em; margin: 0;">Status: <strong>${subject.status || 'active'}</strong></p>
        <button class="btn-outline btn-sm" onclick="toggleSubjectStatus(${subject.id}, '${isCompleted ? 'active' : 'completed'}')">
          ${isCompleted ? 'Mark Active' : 'Mark Completed'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  updateDashboardStats();
}

window.deleteSubject = function(id) {
  if (!confirm("Are you sure you want to delete this subject?")) return;
  
  fetch(`/api/subjects/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        state.subjects = state.subjects.filter(s => s.id !== id);
        renderSubjectsList();
        populateTimerSubjects();
        showToast('Subject deleted', 'info');
      }
    });
};

window.toggleSubjectStatus = function(id, newStatus) {
  fetch(`/api/subjects/${id}/toggle`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const subject = state.subjects.find(s => s.id === id);
      if (subject) {
        subject.status = newStatus;
        renderSubjectsList();
        showToast(`Subject marked as ${newStatus}`, 'success');
      }
    }
  });
};

// Schedule Logic
function setupSchedule() {
  const btn = document.getElementById('addSessionBtn');
  
  const openAddSessionModal = () => {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalOverlay = document.getElementById('modalOverlay');
    
    modalTitle.textContent = "Schedule New Session";
    
    const subjectOptions = state.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    
    modalBody.innerHTML = `
      <div class="form-group" style="margin-bottom: 15px;">
        <label>Subject / Title</label>
        <select id="sessSubject" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: white;">
          <option value="">Select a subject...</option>
          ${subjectOptions}
          <option value="General Study">General Study</option>
        </select>
      </div>
      <div class="form-row" style="display:flex; gap:10px; margin-bottom: 15px;">
        <div class="form-group" style="flex:1;">
          <label>Date</label>
          <input type="date" id="sessDate" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: white;">
        </div>
        <div class="form-group" style="flex:1;">
          <label>Time</label>
          <input type="time" id="sessTime" value="14:00" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: white;">
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 20px;">
        <label>Duration (minutes)</label>
        <input type="number" id="sessDuration" value="60" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: white;">
      </div>
      <button class="btn-primary" id="saveSessionBtn" style="width: 100%;">Add to Schedule</button>
    `;
    
    modalOverlay.classList.add('active');
    
    document.getElementById('saveSessionBtn').onclick = () => {
      const title = document.getElementById('sessSubject').value || "Study Session";
      const date = document.getElementById('sessDate').value;
      const time = document.getElementById('sessTime').value;
      const duration = document.getElementById('sessDuration').value;
      
      if (!date || !time) return showToast("Please fill all fields", "error");

      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, duration: parseInt(duration) || 60 })
      })
      .then(res => res.json())
      .then(data => {
        state.sessions.push(data);
        renderSchedule();
        closeModal();
        showToast('Session scheduled!', 'success');
      });
    };
  };

  if (btn) btn.addEventListener('click', openAddSessionModal);
  
  fetch('/api/sessions')
    .then(res => res.json())
    .then(data => {
      state.sessions = data;
      renderSchedule();
    });
}

function renderSchedule() {
  const grid = document.getElementById('weekGrid');
  if (!grid) return;
  
  if (state.sessions.length === 0) {
    grid.innerHTML = `
      <div class="empty-state large" style="grid-column: 1 / -1;">
        <div class="empty-icon">📅</div>
        <h3>No sessions scheduled</h3>
        <p>Add your first study session</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = '';
  // Group by date
  const grouped = {};
  state.sessions.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });
  
  // Create a column for each date
  Object.keys(grouped).sort().forEach(date => {
    const col = document.createElement('div');
    col.className = 'day-column';
    col.innerHTML = `<h3 style="text-align:center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">${date}</h3>`;
    
    grouped[date].forEach(session => {
      const subject = state.subjects.find(sub => session.title.includes(sub.name));
      const color = subject ? subject.color : 'var(--primary)';
      
      const card = document.createElement('div');
      card.className = 'card';
      card.style = `margin-top: 10px; border-left: 4px solid ${color}; padding: 15px; position: relative; background: rgba(255,255,255,0.02);`;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <h4 style="margin: 0 0 5px 0;">${session.title}</h4>
          <span style="font-size:0.7em; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${session.duration}m</span>
        </div>
        <p style="margin: 0; color: var(--text-muted); font-size: 0.9em;">
          🕒 ${session.time}
        </p>
        <button class="btn-icon" onclick="deleteSession(${session.id})" style="position: absolute; bottom: 10px; right: 10px; color: var(--text-muted);" title="Delete">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 4h8M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      `;
      col.appendChild(card);
    });
    grid.appendChild(col);
  });
  
  // Render today's schedule on dashboard
  const todayContainer = document.getElementById('todaySchedule');
  if (todayContainer) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = grouped[todayStr] || [];
    if (todaySessions.length === 0) {
      todayContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>No sessions scheduled for today</p>
          <button class="btn-primary btn-sm" onclick="navigateTo('ai-planner')">Generate with AI</button>
        </div>
      `;
    } else {
      let thtml = '';
      todaySessions.forEach(s => {
        thtml += `
          <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="display:block;">${s.title}</strong>
              <span style="color:var(--text-muted); font-size:0.85em;">${s.duration} min</span>
            </div>
            <div style="background:var(--primary); color:white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em;">
              ${s.time}
            </div>
          </div>
        `;
      });
      todayContainer.innerHTML = thtml;
    }
  }
  
  updateDashboardStats();
}

window.deleteSession = function(id) {
  if (!confirm("Are you sure you want to delete this session?")) return;
  
  fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        state.sessions = state.sessions.filter(s => s.id !== id);
        renderSchedule();
        showToast('Session deleted', 'info');
      }
    });
};

// Search Logic
function setupSearch() {
  const searchInput = document.getElementById('globalSearch');
  const resultsDiv = document.getElementById('searchResults');
  
  if (!searchInput || !resultsDiv) return;
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
      resultsDiv.style.display = 'none';
      return;
    }
    
    let resultsHtml = '';
    
    // Search Notes
    const matchedNotes = state.notes.filter(n => (n.title && n.title.toLowerCase().includes(query)) || (n.body && n.body.toLowerCase().includes(query)));
    matchedNotes.forEach(n => {
      resultsHtml += `<div style="padding:10px; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="navigateTo('notes'); openNote(${n.id}); document.getElementById('searchResults').style.display='none';">
        <span style="font-size:0.8em; color:var(--primary); text-transform:uppercase;">Note</span>
        <h5 style="margin:2px 0;">${n.title}</h5>
      </div>`;
    });
    
    // Search Subjects
    const matchedSubjects = state.subjects.filter(s => s.name.toLowerCase().includes(query));
    matchedSubjects.forEach(s => {
      resultsHtml += `<div style="padding:10px; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="navigateTo('subjects'); document.getElementById('searchResults').style.display='none';">
        <span style="font-size:0.8em; color:var(--primary); text-transform:uppercase;">Subject</span>
        <h5 style="margin:2px 0;">${s.name}</h5>
      </div>`;
    });
    
    // Search Sessions
    const matchedSessions = state.sessions.filter(s => s.title.toLowerCase().includes(query));
    matchedSessions.forEach(s => {
      resultsHtml += `<div style="padding:10px; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="navigateTo('schedule'); document.getElementById('searchResults').style.display='none';">
        <span style="font-size:0.8em; color:var(--primary); text-transform:uppercase;">Session</span>
        <h5 style="margin:2px 0;">${s.title} (${s.date})</h5>
      </div>`;
    });
    
    if (resultsHtml) {
      resultsDiv.innerHTML = resultsHtml;
      resultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted);">No results found</div>';
      resultsDiv.style.display = 'block';
    }
  });
  
  // Hide on outside click
  document.addEventListener('click', (e) => {
    if (e.target !== searchInput && !resultsDiv.contains(e.target)) {
      resultsDiv.style.display = 'none';
    }
  });
}

// Notifications Logic
function setupNotifications() {
  const notifBtn = document.getElementById('notifBtn');
  const dropdown = document.getElementById('notifDropdown');
  const dot = document.getElementById('notifDot');
  const list = document.getElementById('notifList');
  const markReadBtn = document.getElementById('markReadBtn');
  
  if (!notifBtn || !dropdown) return;
  
  notifBtn.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });
  
  document.addEventListener('click', (e) => {
    if (e.target !== notifBtn && !notifBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
  
  markReadBtn.addEventListener('click', () => {
    fetch('/api/notifications/read', { method: 'POST' })
      .then(() => fetchNotifications());
  });
  
  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          dot.style.display = 'block';
          list.innerHTML = '';
          data.forEach(n => {
            list.innerHTML += `
              <div style="padding:10px; border-bottom:1px solid var(--border-color); background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 5px;">
                <p style="margin:0; font-size:0.95em;">${n.message}</p>
                <span style="font-size:0.75em; color:var(--text-muted);">${new Date(n.created_at).toLocaleTimeString()}</span>
              </div>
            `;
          });
        } else {
          dot.style.display = 'none';
          list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.9em; margin:10px 0;">No new notifications</p>';
        }
      });
  };
  
  fetchNotifications();
  setInterval(fetchNotifications, 5000); 
  setInterval(checkScheduledNotifications, 30000); // Check every 30 seconds
}

const notifiedSessions = new Set();
function checkScheduledNotifications() {
  const now = new Date();
  // Get local date string YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Get local time string HH:MM
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${mins}`;

  state.sessions.forEach(s => {
    if (s.date === dateStr && s.time === timeStr && !notifiedSessions.has(s.id)) {
      pushNotification(`Focus time! Your "${s.title}" session is starting now.`);
      notifiedSessions.add(s.id);
    }
  });
}

function pushNotification(message) {
  // In-app notification via API
  fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message })
  });
  
  // UI Feedback
  showToast(message, 'info');
  
  // Browser Native Notification
  if (window.Notification && Notification.permission === "granted") {
    new Notification("StudyMind AI", { 
      body: message,
      icon: "/static/logo.png" 
    });
  } else if (window.Notification && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

// Profile Logic
function setupProfile() {
  const avatar = document.getElementById('userAvatar');
  if (!avatar) return;
  
  avatar.style.cursor = 'pointer';
  avatar.title = "View Profile";
  
  let activeProfileId = localStorage.getItem('activeProfileId') || 1;
  
  const loadProfiles = () => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        state.allProfiles = data;
        const current = data.find(p => p.id == activeProfileId) || data[0];
        if (current) {
          state.profile = current;
          activeProfileId = current.id;
          localStorage.setItem('activeProfileId', activeProfileId);
          avatar.textContent = current.name.charAt(0).toUpperCase();
          avatar.style.background = current.avatar_color || 'var(--primary)';
        }
      });
  };
  
  window.switchProfile = (id) => {
    localStorage.setItem('activeProfileId', id);
    activeProfileId = id;
    loadProfiles();
    closeModal();
    showToast('Switched profile successfully!', 'success');
  };
  
  window.addNewProfile = () => {
    const name = prompt("Enter new student name:");
    if (!name) return;
    const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, avatar_color: color })
    })
    .then(res => res.json())
    .then(data => {
      switchProfile(data.id);
    });
  };
  
  avatar.addEventListener('click', () => {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalOverlay = document.getElementById('modalOverlay');
    
    modalTitle.textContent = "Profile Hub";
    
    let otherProfilesHtml = state.allProfiles.filter(p => p.id != activeProfileId).map(p => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 5px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width:30px; height:30px; border-radius:50%; background:${p.avatar_color || '#7c3aed'}; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${p.name.charAt(0).toUpperCase()}</div>
          <span>${p.name}</span>
        </div>
        <button class="btn-outline btn-sm" onclick="switchProfile(${p.id})">Switch</button>
      </div>
    `).join('');
    
    if(!otherProfilesHtml) otherProfilesHtml = '<p style="color:var(--text-muted); font-size:0.9em;">No other profiles found.</p>';
    
    modalBody.innerHTML = `
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <!-- Left: Edit Form -->
        <div style="flex: 1; min-width: 250px; border-right: 1px solid var(--border-color); padding-right: 20px;">
          <h4 style="margin-top: 0; color: var(--primary);">Edit Current Profile</h4>
          <div class="form-group" style="margin-bottom: 15px;">
            <label>Full Name</label>
            <input type="text" id="profName" value="${state.profile.name || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white;">
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label>Email Address</label>
            <input type="email" id="profEmail" value="${state.profile.email || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white;">
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label>Institution / School</label>
            <input type="text" id="profInst" value="${state.profile.institution || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white;">
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label>Short Bio</label>
            <textarea id="profBio" rows="2" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white;">${state.profile.bio || ''}</textarea>
          </div>
          <div class="form-row" style="display:flex; gap:10px; margin-bottom: 20px;">
            <div class="form-group" style="flex:1;">
              <label>Level</label>
              <select id="profLevel" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--card-bg); color: white;">
                <option value="Beginner" ${state.profile.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                <option value="Intermediate" ${state.profile.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="Advanced" ${state.profile.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
              </select>
            </div>
            <div class="form-group" style="flex:2;">
              <label>Primary Goal</label>
              <input type="text" id="profGoal" value="${state.profile.goal || ''}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: white;">
            </div>
          </div>
          <button class="btn-primary" id="saveProfileBtn" style="width: 100%;">Save Details</button>
        </div>
        
        <!-- Right: Profile Switcher -->
        <div style="flex: 1; min-width: 250px;">
          <h4 style="margin-top: 0; color: var(--primary);">Current Profile</h4>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
             <div style="width:50px; height:50px; border-radius:50%; background:${state.profile.avatar_color || '#7c3aed'}; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:20px;">${state.profile.name.charAt(0).toUpperCase()}</div>
             <div>
                <strong style="display:block; font-size:1.1em;">${state.profile.name}</strong>
                <span style="color:var(--text-muted); font-size:0.85em;">${state.profile.email || 'No email set'}</span>
             </div>
          </div>
          
          <h4 style="color: var(--primary);">Switch Profiles</h4>
          <div style="max-height: 150px; overflow-y: auto; margin-bottom: 15px;">
            ${otherProfilesHtml}
          </div>
          <button class="btn-outline" style="width: 100%; border-style: dashed;" onclick="addNewProfile()">+ Add Another Profile</button>
        </div>
      </div>
    `;
    
    modalOverlay.classList.add('active');
    
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
      const newName = document.getElementById('profName').value;
      const newEmail = document.getElementById('profEmail').value;
      const newInst = document.getElementById('profInst').value;
      const newBio = document.getElementById('profBio').value;
      const newLevel = document.getElementById('profLevel').value;
      const newGoal = document.getElementById('profGoal').value;
      
      fetch(`/api/profiles/${activeProfileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, institution: newInst, bio: newBio, level: newLevel, goal: newGoal })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          loadProfiles();
          closeModal();
          showToast('Profile updated!', 'success');
        }
      });
    });
  });
  
  loadProfiles();
}

// Run
console.log("Setting up StudyMind AI...");
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
console.log("Setup complete. Nav items found:", navItems.length);
