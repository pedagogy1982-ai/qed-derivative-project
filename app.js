(function () {
  'use strict';

  var LS_KEY = 'qed-derivative-project-draft-v1';

  var DEFAULTS = {
    version: 0,
    updatedAt: null,
    updatedBy: null,
    roles: [
      { role: '총괄 · 진행', task: '전체 일정 관리, 두 실험 촬영·측정 총괄' },
      { role: '영상 분석', task: '프레임별 마커 통과 시각 추출 (실험 A, B)' },
      { role: '데이터 · 그래프', task: '표 정리, x–t / v–t 그래프 작성' },
      { role: '계산 · 이론 검토', task: '평균변화율·순간변화율 계산, 오차 검토' },
      { role: '포스터 디자인', task: '전지 8섹터 레이아웃 제작, 발표 자료 정리' }
    ],
    reflections: ['', '', '', '', ''],
    tableA: {
      runners: [
        { name: '', interval: 1, values: new Array(11).fill(null) },
        { name: '', interval: 1, values: new Array(11).fill(null) },
        { name: '', interval: 1, values: new Array(11).fill(null) },
        { name: '', interval: 1, values: new Array(11).fill(null) }
      ]
    },
    tableB: {
      types: [
        { ballType: '', angle: null, rows: defaultBallRows() },
        { ballType: '', angle: null, rows: defaultBallRows() },
        { ballType: '', angle: null, rows: defaultBallRows() }
      ]
    }
  };

  function defaultBallRows() {
    return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(function (d) {
      return { d: d, t: null };
    });
  }

  // Editing is always on — the video-analysis crew shouldn't have to wait for
  // Firebase setup to start typing measurements. `cloudSynced` (not this flag)
  // gates whether edits also go to Firestore.
  var writable = true;
  var cloudSynced = false;
  var saveTimer = null;
  var db = null;
  var docRef = null;
  var unsubscribe = null;

  /* ---------- Banners ---------- */
  function setBanner(text, kind) {
    var el = document.getElementById('syncBanner');
    if (!el) return;
    el.textContent = text;
    el.className = 'notice-banner show ' + (kind || 'info');
  }
  function hideBanner() {
    var el = document.getElementById('syncBanner');
    if (el) el.classList.remove('show');
  }
  function showSetupBanner(text) {
    var el = document.getElementById('setupBanner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
  }

  /* ---------- Panel builders (Table A: 4 runners) ---------- */
  function buildRunnerPanelHTML() {
    var rows = '';
    for (var s = 0; s <= 10; s++) {
      if (s === 0) {
        rows +=
          '<tr data-step="0"><td class="num out-time">0</td>' +
          '<td class="num"><input class="data-input dist-input locked-input" type="number" step="0.01" min="0" max="50" value="0.00" disabled></td>' +
          '<td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>';
      } else {
        rows +=
          '<tr data-step="' + s + '"><td class="num out-time">' + s + '</td>' +
          '<td class="num"><input class="data-input dist-input" type="number" step="0.01" min="0" max="50" placeholder="m"></td>' +
          '<td class="num out-dx">—</td><td class="num out-dt">—</td><td class="num out-v">—</td></tr>';
      }
    }
    return (
      '<div class="panel-meta-row">' +
        '<label>이름</label><input class="data-input name-input runner-name" type="text" placeholder="주자 이름">' +
        '<label>시간 간격</label><input class="data-input interval-input" type="number" step="0.1" min="0.1" value="1"><span>초마다 기록</span>' +
      '</div>' +
      '<div class="table-scroll"><table class="data-table">' +
        '<thead><tr><th class="num">시간 (s)</th><th class="num">이동 거리 (m)</th><th class="num">구간 Δx (m)</th><th class="num">구간 Δt (s)</th><th class="num">평균속도 (m/s)</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr class="summary-row"><td class="num" colspan="2">전체 구간 (0→마지막 기록 시간)</td>' +
        '<td class="num out-dx-total">—</td><td class="num out-dt-total">—</td><td class="num out-v-total">—</td></tr></tfoot>' +
      '</table></div>'
    );
  }

  function buildPanelsA() {
    var tabs = document.getElementById('tabsA');
    var panels = document.getElementById('panelsA');
    tabs.innerHTML = '';
    panels.innerHTML = '';
    for (var i = 0; i < 4; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn a' + (i === 0 ? ' active' : '');
      btn.textContent = '주자 ' + (i + 1);
      btn.dataset.tabTarget = 'panelA-' + i;
      tabs.appendChild(btn);

      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'panelA-' + i;
      if (i !== 0) panel.hidden = true;
      panel.innerHTML = buildRunnerPanelHTML();
      panels.appendChild(panel);
    }
    wireTabs(tabs, panels);
  }

  function calcRunnerPanel(panel) {
    var interval = parseFloat(panel.querySelector('.interval-input').value);
    if (!interval || interval <= 0) interval = 1;
    var rows = panel.querySelectorAll('tbody tr');
    var dist = [];
    rows.forEach(function (tr) {
      var v = parseFloat(tr.querySelector('.dist-input').value);
      dist.push(isNaN(v) ? null : v);
    });
    rows.forEach(function (tr, i) {
      var timeCell = tr.querySelector('.out-time');
      if (timeCell) {
        var t = i * interval;
        timeCell.textContent = (Math.round(t * 100) / 100).toString();
      }
      if (i === 0) return;
      var dxCell = tr.querySelector('.out-dx'), dtCell = tr.querySelector('.out-dt'), vCell = tr.querySelector('.out-v');
      var x0 = dist[i - 1], x1 = dist[i];
      if (x0 !== null && x1 !== null) {
        var dx = x1 - x0;
        dxCell.textContent = dx.toFixed(2);
        dtCell.textContent = interval.toFixed(2);
        vCell.textContent = (dx / interval).toFixed(2);
      } else {
        dxCell.textContent = '—'; dtCell.textContent = '—'; vCell.textContent = '—';
      }
    });
    var lastIdx = -1;
    for (var i = dist.length - 1; i >= 0; i--) { if (dist[i] !== null) { lastIdx = i; break; } }
    var totalDx = panel.querySelector('.out-dx-total'), totalDt = panel.querySelector('.out-dt-total'), totalV = panel.querySelector('.out-v-total');
    if (lastIdx > 0 && dist[0] !== null) {
      var dxT = dist[lastIdx] - dist[0], dtT = lastIdx * interval;
      totalDx.textContent = dxT.toFixed(2);
      totalDt.textContent = dtT.toFixed(2);
      totalV.textContent = (dxT / dtT).toFixed(2);
    } else {
      totalDx.textContent = '—'; totalDt.textContent = '—'; totalV.textContent = '—';
    }
  }

  /* ---------- Panel builders (Table B: 3 ball types) ---------- */
  function buildBallRow(d, t) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="num"><input class="data-input dist-input" type="number" step="0.1" placeholder="cm"></td>' +
      '<td class="num"><input class="data-input time-input" type="number" step="0.01" placeholder="s"></td>' +
      '<td class="num out-dx">—</td><td class="num out-dt">—</td><td class="num out-v">—</td>' +
      '<td class="row-actions"><button type="button" class="remove-row-btn" aria-label="이 지점 삭제">×</button></td>';
    if (d !== undefined && d !== null) tr.querySelector('.dist-input').value = d;
    if (t !== undefined && t !== null) tr.querySelector('.time-input').value = t;
    return tr;
  }

  function buildPanelsB() {
    var tabs = document.getElementById('tabsB');
    var panels = document.getElementById('panelsB');
    tabs.innerHTML = '';
    panels.innerHTML = '';
    var labels = ['종류 A', '종류 B', '종류 C'];
    for (var i = 0; i < 3; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn b' + (i === 0 ? ' active' : '');
      btn.textContent = labels[i];
      btn.dataset.tabTarget = 'panelB-' + i;
      tabs.appendChild(btn);

      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'panelB-' + i;
      if (i !== 0) panel.hidden = true;
      panel.innerHTML =
        '<div class="panel-meta-row">' +
          '<label>공 종류</label><input class="data-input name-input ball-type" type="text" placeholder="예: 구슬">' +
          '<label>경사각</label><input class="data-input ball-angle" type="number" step="1" placeholder="°"><span>°</span>' +
        '</div>' +
        '<div class="table-scroll"><table class="data-table">' +
          '<thead><tr><th class="num">지점 (cm)</th><th class="num">통과 시각 (s)</th><th class="num">구간 Δx (cm)</th><th class="num">구간 Δt (s)</th><th class="num">평균속도 (cm/s)</th><th></th></tr></thead>' +
          '<tbody class="ballBody"></tbody>' +
          '<tfoot><tr class="summary-row"><td class="num" colspan="2">전체 구간 (처음→마지막 지점)</td>' +
          '<td class="num out-dx-total">—</td><td class="num out-dt-total">—</td><td class="num out-v-total">—</td><td></td></tr></tfoot>' +
        '</table></div>' +
        '<button type="button" class="add-row-btn">+ 지점 추가</button>';
      var body = panel.querySelector('.ballBody');
      defaultBallRows().forEach(function (r) { body.appendChild(buildBallRow(r.d, r.t)); });
      panels.appendChild(panel);
    }
    wireTabs(tabs, panels);
  }

  function calcBallPanel(panel) {
    var rows = Array.from(panel.querySelectorAll('.ballBody tr'));
    var data = rows.map(function (tr) {
      var d = parseFloat(tr.querySelector('.dist-input').value);
      var t = parseFloat(tr.querySelector('.time-input').value);
      return { d: isNaN(d) ? null : d, t: isNaN(t) ? null : t };
    });
    rows.forEach(function (tr, i) {
      var dxCell = tr.querySelector('.out-dx'), dtCell = tr.querySelector('.out-dt'), vCell = tr.querySelector('.out-v');
      if (i === 0) { dxCell.textContent = '—'; dtCell.textContent = '—'; vCell.textContent = '—'; return; }
      var prev = data[i - 1], cur = data[i];
      if (prev.d !== null && cur.d !== null && prev.t !== null && cur.t !== null && cur.t > prev.t) {
        var dx = cur.d - prev.d, dt = cur.t - prev.t;
        dxCell.textContent = dx.toFixed(1);
        dtCell.textContent = dt.toFixed(2);
        vCell.textContent = (dx / dt).toFixed(2);
      } else {
        dxCell.textContent = '—'; dtCell.textContent = '—'; vCell.textContent = '—';
      }
    });
    var first = data.find(function (r) { return r.d !== null && r.t !== null; });
    var last = null;
    for (var i = data.length - 1; i >= 0; i--) { if (data[i].d !== null && data[i].t !== null) { last = data[i]; break; } }
    var totalDx = panel.querySelector('.out-dx-total'), totalDt = panel.querySelector('.out-dt-total'), totalV = panel.querySelector('.out-v-total');
    if (first && last && last.t > first.t) {
      var dx = last.d - first.d, dt = last.t - first.t;
      totalDx.textContent = dx.toFixed(1);
      totalDt.textContent = dt.toFixed(2);
      totalV.textContent = (dx / dt).toFixed(2);
    } else {
      totalDx.textContent = '—'; totalDt.textContent = '—'; totalV.textContent = '—';
    }
  }

  function wireTabs(tabsEl, panelsEl) {
    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      tabsEl.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      panelsEl.querySelectorAll('.tab-panel').forEach(function (p) { p.hidden = (p.id !== btn.dataset.tabTarget); });
    });
  }

  /* ---------- Read / apply state ---------- */
  function readState() {
    var s = { roles: [], reflections: [], tableA: { runners: [] }, tableB: { types: [] } };
    document.querySelectorAll('.editable-cell').forEach(function (el) {
      var idx = +el.dataset.roleIdx, field = el.dataset.roleField;
      if (!s.roles[idx]) s.roles[idx] = { role: '', task: '' };
      s.roles[idx][field] = el.textContent.trim();
    });
    document.querySelectorAll('.reflect-text').forEach(function (el) {
      s.reflections[+el.dataset.reflectIdx] = el.value;
    });
    for (var i = 0; i < 4; i++) {
      var panel = document.getElementById('panelA-' + i);
      var values = Array.from(panel.querySelectorAll('.dist-input')).map(function (inp) {
        var v = parseFloat(inp.value); return isNaN(v) ? null : v;
      });
      s.tableA.runners.push({
        name: panel.querySelector('.runner-name').value,
        interval: parseFloat(panel.querySelector('.interval-input').value) || 1,
        values: values
      });
    }
    for (var i = 0; i < 3; i++) {
      var panel = document.getElementById('panelB-' + i);
      var angleRaw = parseFloat(panel.querySelector('.ball-angle').value);
      var rows = Array.from(panel.querySelectorAll('.ballBody tr')).map(function (tr) {
        var d = parseFloat(tr.querySelector('.dist-input').value);
        var t = parseFloat(tr.querySelector('.time-input').value);
        return { d: isNaN(d) ? null : d, t: isNaN(t) ? null : t };
      });
      s.tableB.types.push({
        ballType: panel.querySelector('.ball-type').value,
        angle: isNaN(angleRaw) ? null : angleRaw,
        rows: rows
      });
    }
    return s;
  }

  function applyState(data) {
    if (!data) return;
    (data.roles || []).forEach(function (r, idx) {
      ['role', 'task'].forEach(function (f) {
        var el = document.querySelector('[data-role-idx="' + idx + '"][data-role-field="' + f + '"]');
        if (el && document.activeElement !== el && r[f] !== undefined && el.textContent !== r[f]) el.textContent = r[f];
      });
    });
    (data.reflections || []).forEach(function (text, idx) {
      var el = document.querySelector('.reflect-text[data-reflect-idx="' + idx + '"]');
      if (el && document.activeElement !== el && text !== undefined && el.value !== text) el.value = text;
    });
    if (data.tableA && data.tableA.runners) {
      data.tableA.runners.forEach(function (r, i) {
        var panel = document.getElementById('panelA-' + i);
        if (!panel) return;
        var nameEl = panel.querySelector('.runner-name');
        if (document.activeElement !== nameEl && r.name !== undefined && nameEl.value !== r.name) nameEl.value = r.name;
        var intervalEl = panel.querySelector('.interval-input');
        if (document.activeElement !== intervalEl && r.interval && +intervalEl.value !== r.interval) intervalEl.value = r.interval;
        var inputs = panel.querySelectorAll('.dist-input');
        (r.values || []).forEach(function (v, si) {
          var el = inputs[si];
          if (el && document.activeElement !== el) {
            var display = (v === null || v === undefined) ? (si === 0 ? '0.00' : '') : v;
            if (String(el.value) !== String(display)) el.value = display;
          }
        });
        calcRunnerPanel(panel);
      });
    }
    if (data.tableB && data.tableB.types) {
      data.tableB.types.forEach(function (t, i) {
        var panel = document.getElementById('panelB-' + i);
        if (!panel) return;
        var typeEl = panel.querySelector('.ball-type');
        if (document.activeElement !== typeEl && t.ballType !== undefined && typeEl.value !== t.ballType) typeEl.value = t.ballType;
        var angleEl = panel.querySelector('.ball-angle');
        var angleDisplay = (t.angle === null || t.angle === undefined) ? '' : t.angle;
        if (document.activeElement !== angleEl && String(angleEl.value) !== String(angleDisplay)) angleEl.value = angleDisplay;

        var tbody = panel.querySelector('.ballBody');
        var active = document.activeElement;
        var focusedInfo = null;
        if (active && tbody.contains(active)) {
          var tr = active.closest('tr');
          focusedInfo = { idx: Array.from(tbody.children).indexOf(tr), field: active.classList.contains('dist-input') ? 'd' : 't' };
        }
        if (!focusedInfo) {
          tbody.innerHTML = '';
          (t.rows && t.rows.length ? t.rows : defaultBallRows()).forEach(function (row) { tbody.appendChild(buildBallRow(row.d, row.t)); });
        }
        calcBallPanel(panel);
        if (focusedInfo && tbody.children[focusedInfo.idx]) {
          var sel = focusedInfo.field === 'd' ? '.dist-input' : '.time-input';
          var el = tbody.children[focusedInfo.idx].querySelector(sel);
          if (el) el.focus();
        }
      });
    }
  }

  /* ---------- Version tag ---------- */
  function timeAgo(date) {
    var sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return '방금 전';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + '분 전';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + '시간 전';
    return Math.floor(hr / 24) + '일 전';
  }
  function updateVersionTag(data) {
    var tag = document.getElementById('versionTag');
    if (!tag) return;
    if (!cloudSynced) { tag.textContent = '로컬 저장 모드'; return; }
    var v = (data && data.version) || 0;
    var parts = ['v' + v];
    if (data && data.updatedAt && typeof data.updatedAt.toDate === 'function') parts.push(timeAgo(data.updatedAt.toDate()));
    tag.textContent = parts.join(' · ');
  }
  function updateSyncStatus() {
    var el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = cloudSynced ? '공유 편집 켜짐 — 모두에게 실시간 반영' : '로컬 저장 모드';
    el.classList.toggle('on', cloudSynced);
  }

  /* ---------- Local persistence (always on) ---------- */
  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(readState())); } catch (e) {}
  }
  function loadLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ---------- Save (local always, cloud whenever Firestore is configured) ---------- */
  function scheduleSave() {
    clearTimeout(saveTimer);
    setBanner(cloudSynced ? '저장 중…' : '이 브라우저에 저장 중…', 'info');
    saveTimer = setTimeout(save, 900);
  }
  function save() {
    saveLocal();
    if (!cloudSynced || !docRef) {
      setBanner('이 브라우저에 저장됨 (Firebase 설정 후 모두와 공유됩니다)', 'info');
      setTimeout(hideBanner, 1800);
      return;
    }
    var data = readState();
    data.version = firebase.firestore.FieldValue.increment(1);
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    docRef.set(data, { merge: true }).then(function () {
      setBanner('모두에게 저장됨', 'ok');
      setTimeout(hideBanner, 1600);
    }).catch(function (err) {
      console.error(err);
      setBanner('공유 저장 실패 — 이 브라우저에는 저장되어 있어요', 'warn');
    });
  }

  /* ---------- Event wiring ---------- */
  function wireEvents() {
    document.addEventListener('input', function (e) {
      if (e.target.classList.contains('editable-cell')) { scheduleSave(); return; }
      if (e.target.classList.contains('reflect-text')) { scheduleSave(); return; }
      var panelA = e.target.closest('#panelsA .tab-panel');
      if (panelA) { calcRunnerPanel(panelA); scheduleSave(); return; }
      var panelB = e.target.closest('#panelsB .tab-panel');
      if (panelB) { calcBallPanel(panelB); scheduleSave(); return; }
    });

    document.addEventListener('click', function (e) {
      if (e.target.classList.contains('remove-row-btn')) {
        var tbody = e.target.closest('.ballBody');
        if (tbody && tbody.children.length > 2) {
          var panel = e.target.closest('.tab-panel');
          e.target.closest('tr').remove();
          calcBallPanel(panel);
          scheduleSave();
        }
        return;
      }
      if (e.target.classList.contains('add-row-btn')) {
        var panel = e.target.closest('.tab-panel');
        var tbody = panel.querySelector('.ballBody');
        tbody.appendChild(buildBallRow(null, null));
        calcBallPanel(panel);
        scheduleSave();
      }
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    buildPanelsA();
    buildPanelsB();
    wireEvents();

    var draft = loadLocal();
    if (draft) applyState(draft);
    else { calcAllPanels(); }
    updateVersionTag(null);
    updateSyncStatus();

    var cfg = window.FIREBASE_CONFIG;
    var isPlaceholder = !cfg || cfg.apiKey === 'YOUR_API_KEY';
    if (isPlaceholder) {
      showSetupBanner('Firebase 설정이 아직 안 되어 있어요 — 지금도 입력·계산은 되지만 이 브라우저에만 저장됩니다. 여러 명과 실시간 공유하려면 firebase-config.js를 채워주세요 (README.md 참고).');
      return;
    }

    firebase.initializeApp(cfg);
    db = firebase.firestore();
    docRef = db.collection('shared').doc('project');
    cloudSynced = true;
    updateSyncStatus();

    unsubscribe = docRef.onSnapshot(function (snap) {
      if (snap.exists) {
        applyState(snap.data());
        updateVersionTag(snap.data());
      } else {
        // Nobody has saved to the shared document yet — seed it from
        // whatever is already in this browser's local draft (or blank).
        var seed = loadLocal() || DEFAULTS;
        docRef.set(seed).catch(function (err) { console.error(err); });
      }
    }, function (err) {
      console.error(err);
      cloudSynced = false;
      updateSyncStatus();
      showSetupBanner('공유 데이터를 불러오지 못했어요 — Firestore 보안 규칙을 확인해주세요. (지금은 이 브라우저에만 저장됩니다)');
    });
  }

  function calcAllPanels() {
    document.querySelectorAll('#panelsA .tab-panel').forEach(calcRunnerPanel);
    document.querySelectorAll('#panelsB .tab-panel').forEach(calcBallPanel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
