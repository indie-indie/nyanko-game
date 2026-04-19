// home.js — Screen manager, persistent save, deck builder, upgrade, stage select

// 【バグ修正】selectedStage を明示的に宣言
var selectedStage;

var INITIAL_UNLOCKED = ['nyanko', 'wanko', 'bolt', 'soldier', 'archer'];

// ── Persistent Save ───────────────────────────────────
var SAVE = {
  gold: 0,
  levels: {},
  baseLevels: { regen:0, maxGold:0, hp:0, atk:0, cdReduction:0 },
  deck: null,
  unlocked: [],
  clearTimes: {}   // 【新機能】ステージクリア最短タイム記録
};

function loadSave() {
  try {
    SAVE.gold         = parseInt(localStorage.getItem('nrts_gold') || '0', 10);
    SAVE.levels       = JSON.parse(localStorage.getItem('nrts_levels')      || '{}');
    var savedBase     = JSON.parse(localStorage.getItem('nrts_base_levels') || '{}');
    // 【バグ修正】cdReduction:0 を追加したデフォルト値にマージ
    SAVE.baseLevels   = Object.assign({ regen:0, maxGold:0, hp:0, atk:0, cdReduction:0 }, savedBase);
    SAVE.deck         = JSON.parse(localStorage.getItem('nrts_deck')        || 'null');
    var savedUnlocked = JSON.parse(localStorage.getItem('nrts_unlocked')    || 'null');
    SAVE.unlocked     = Array.isArray(savedUnlocked) ? savedUnlocked : INITIAL_UNLOCKED.slice();
    SAVE.clearTimes   = JSON.parse(localStorage.getItem('nrts_clear_times') || '{}');
  } catch(e) {
    console.error('Save load error:', e);
    SAVE = { gold:0, levels:{}, baseLevels:{ regen:0, maxGold:0, hp:0, atk:0, cdReduction:0 },
             deck:null, unlocked: INITIAL_UNLOCKED.slice(), clearTimes:{} };
  }

  if (!Array.isArray(SAVE.deck) || SAVE.deck.length === 0) {
    SAVE.deck = INITIAL_UNLOCKED.slice();
  }
  SAVE.deck = SAVE.deck.filter(function(id) {
    return SAVE.unlocked.indexOf(id) >= 0 && PLAYER_UNITS[id];
  });
  // 【バグ修正】フォールバック時も unlock チェックを通過したものだけ使う
  if (SAVE.deck.length === 0) {
    SAVE.deck = INITIAL_UNLOCKED.filter(function(id) {
      return SAVE.unlocked.indexOf(id) >= 0 && PLAYER_UNITS[id];
    });
    if (SAVE.deck.length === 0) SAVE.deck = INITIAL_UNLOCKED.slice();
  }

  PLAYER_DECK   = SAVE.deck.slice();
  selectedStage = STAGES_CONFIG[0];
}

function persistSave() {
  localStorage.setItem('nrts_gold',        String(SAVE.gold));
  localStorage.setItem('nrts_levels',      JSON.stringify(SAVE.levels));
  localStorage.setItem('nrts_base_levels', JSON.stringify(SAVE.baseLevels));
  localStorage.setItem('nrts_deck',        JSON.stringify(SAVE.deck));
  localStorage.setItem('nrts_unlocked',    JSON.stringify(SAVE.unlocked));
  localStorage.setItem('nrts_clear_times', JSON.stringify(SAVE.clearTimes || {}));
}

function isUnlocked(id) { return SAVE.unlocked.indexOf(id) >= 0; }
function getMultiplier(id) { return 1.0 + (SAVE.levels[id] || 0) * 0.1; }
function getUpgradeCost(id) { return ((SAVE.levels[id] || 0) + 1) * 50; }

// 【新機能】クリアタイム記録（main.js の endGame から呼び出し）
function recordStageClear(stageId, time) {
  if (!SAVE.clearTimes) SAVE.clearTimes = {};
  var prev = SAVE.clearTimes[stageId];
  if (!prev || time < prev) {
    SAVE.clearTimes[stageId] = time;
    persistSave();
  }
}

function formatTime(t) {
  var mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
}

// ── Screen Manager ────────────────────────────────────
var SCREEN_IDS = ['home','deck','upgrade','stage','battle','base-up'];

function showScreen(name) {
  SCREEN_IDS.forEach(function(id) {
    var el = document.getElementById('screen-' + id);
    if (el) el.style.display = (id === name) ? 'flex' : 'none';
  });
}

// ── Home Screen ───────────────────────────────────────
function initHome() {
  loadSave();
  showScreen('home');
  refreshHomeGold();
}

function refreshHomeGold() {
  var el = document.getElementById('home-gold');
  if (el) el.textContent = '💰 ' + SAVE.gold + ' G';
}

function goHome() {
  showScreen('home');
  refreshHomeGold();
}

// ── Deck Builder ──────────────────────────────────────
var deckSel = [];

function openDeck() {
  deckSel = SAVE.deck.slice();
  renderDeckBuilder();
  showScreen('deck');
}

function renderDeckBuilder() {
  var el  = document.getElementById('deck-grid');
  var cnt = document.getElementById('deck-count');
  if (!el) return;
  el.innerHTML = '';
  if (cnt) cnt.textContent = deckSel.length + ' / 10';

  Object.keys(PLAYER_UNITS).forEach(function(id) {
    if (!isUnlocked(id)) return;
    var d   = PLAYER_UNITS[id];
    var sel = deckSel.indexOf(id) >= 0;
    var lv  = SAVE.levels[id] || 0;
    var fs  = Math.min(Math.round(22 * (d.size || 1)), 30);
    var typeTag = d.type === 'spell' ? '✨スペル' : d.type === 'air' ? '✈飛行' : '⚔地上';
    var zoneTag = (d.type === 'spell' || d.zone === 'all') ? '全域' : '自陣';

    var card = document.createElement('div');
    card.className = 'dbcard' + (sel ? ' dbsel' : '');
    card.innerHTML =
      '<span class="db-ico" style="font-size:' + fs + 'px">' + d.e + '</span>' +
      '<div class="db-body">' +
        '<div class="db-nm">' + d.n +
          ' <span class="db-type">' + typeTag + '</span>' +
          ' <span class="db-type" style="color:#a78bfa;background:#1a0a2e">' + zoneTag + '</span>' +
          ' <span class="db-lv">Lv.' + lv + '</span>' +
        '</div>' +
      '</div>' +
      '<button class="stat-btn" title="ステータス確認">📊</button>' +
      '<span class="db-chk" style="visibility:' + (sel ? 'visible' : 'hidden') + '">✓</span>';

    // 詳細ボタン（カード選択と干渉しないよう stopPropagation）
    card.querySelector('.stat-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      showUnitStats(id);
    });

    card.addEventListener('click', function() { toggleDeckCard(id); });
    el.appendChild(card);
  });
}

function toggleDeckCard(id) {
  var idx = deckSel.indexOf(id);
  if (idx >= 0) {
    deckSel.splice(idx, 1);
  } else {
    if (deckSel.length >= 10) { flashMsg('デッキは最大10体まで'); return; }
    deckSel.push(id);
  }
  renderDeckBuilder();
}

function saveDeck() {
  if (deckSel.length < 1) { flashMsg('最低1体必要です'); return; }
  SAVE.deck   = deckSel.slice();
  PLAYER_DECK = SAVE.deck.slice();
  persistSave();
  flashMsg('デッキを保存しました！');
  setTimeout(function() { showScreen('home'); refreshHomeGold(); }, 700);
}

// ── Unit Upgrade & Unlock ─────────────────────────────
function openUpgrade() {
  renderUpgrade();
  showScreen('upgrade');
}

function renderUpgrade() {
  var el  = document.getElementById('upgrade-list');
  var gel = document.getElementById('upgrade-gold');
  if (!el) return;
  el.innerHTML = '';
  if (gel) gel.textContent = '💰 ' + SAVE.gold + ' G';

  Object.keys(PLAYER_UNITS).forEach(function(id) {
    var d        = PLAYER_UNITS[id];
    var unlocked = isUnlocked(id);
    var lv       = SAVE.levels[id] || 0;
    var row      = document.createElement('div');
    row.className = 'up-row';

    if (!unlocked) {
      var ucost     = d.unlockCost || 0;
      var canUnlock = SAVE.gold >= ucost;
      row.innerHTML =
        '<div class="up-ico">' + d.e + '</div>' +
        '<div class="up-mid">' +
          '<div class="up-nm">' + d.n +
            ' <span class="up-lv" style="color:#ef4444">🔒 未解放</span>' +
          '</div>' +
        '</div>' +
        '<button class="stat-btn" title="ステータス確認">📊</button>' +
        '<button class="up-btn' + (canUnlock ? ' up-btn-ok' : '') + '"' +
          (canUnlock ? '' : ' disabled') + '>解放 G' + ucost + '</button>';
      row.querySelector('.stat-btn').addEventListener('click', function(e) {
        e.stopPropagation(); showUnitStats(id);
      });
      row.querySelector('.up-btn').addEventListener('click', function() { doUnlock(id); });
    } else {
      var cost  = getUpgradeCost(id);
      var maxed = lv >= 10;
      var canBuy = !maxed && SAVE.gold >= cost;
      // 【修正】ステータスの上昇表記を削除し、レベルのみ表示
      row.innerHTML =
        '<div class="up-ico">' + d.e + '</div>' +
        '<div class="up-mid">' +
          '<div class="up-nm">' + d.n +
            ' <span class="up-lv' + (maxed ? ' up-maxed-lbl' : '') + '">Lv.' + lv + '/10</span>' +
          '</div>' +
          '<div class="up-track"><div class="up-prog" style="width:' + (lv * 10) + '%"></div></div>' +
        '</div>' +
        '<button class="stat-btn" title="ステータス確認">📊</button>' +
        '<button class="up-btn' +
          (maxed ? ' up-btn-max' : canBuy ? ' up-btn-ok' : '') + '"' +
          (maxed || !canBuy ? ' disabled' : '') +
          '>' + (maxed ? 'MAX' : 'G' + cost) + '</button>';
      row.querySelector('.stat-btn').addEventListener('click', function(e) {
        e.stopPropagation(); showUnitStats(id);
      });
      row.querySelector('.up-btn').addEventListener('click', function() { doUpgrade(id); });
    }
    el.appendChild(row);
  });
}

function doUpgrade(id) {
  var lv = SAVE.levels[id] || 0;
  if (lv >= 10) return;
  var cost = getUpgradeCost(id);
  if (SAVE.gold < cost) { flashMsg('ゴールドが足りません'); return; }
  SAVE.gold -= cost;
  SAVE.levels[id] = lv + 1;
  persistSave();
  renderUpgrade();
}

function doUnlock(id) {
  var d = PLAYER_UNITS[id];
  if (!d || isUnlocked(id)) return;
  var cost = d.unlockCost || 0;
  if (SAVE.gold < cost) { flashMsg('ゴールドが足りません'); return; }
  SAVE.gold -= cost;
  SAVE.unlocked.push(id);
  persistSave();
  renderUpgrade();
  flashMsg(d.n + ' をアンロックしました！');
}

// ── ステータスポップアップ ────────────────────────────
function showUnitStats(id) {
  var d  = PLAYER_UNITS[id];
  var lv = SAVE.levels[id] || 0;
  var m  = getMultiplier(id);
  var popup = document.getElementById('stat-popup');
  var icon  = document.getElementById('stat-popup-icon');
  var name  = document.getElementById('stat-popup-name');
  var rows  = document.getElementById('stat-popup-rows');
  if (!popup) return;

  icon.textContent = d.e;
  name.textContent = d.n + '　Lv.' + lv;

  var html = '';
  if (d.type === 'spell') {
    html +=
      statRow('💰', 'コスト',       d.cost + ' G') +
      statRow('💥', 'ダメージ',      Math.round(d.dmg * m)) +
      statRow('🎯', '効果範囲',      d.area) +
      statRow('⏱', 'クールタイム',  d.cd + ' s');
  } else {
    html +=
      statRow('💰', 'コスト',      d.cost + ' G') +
      statRow('❤️', 'HP',          Math.round(d.hp  * m)) +
      statRow('⚔', 'ATK',         Math.round(d.dmg * m)) +
      statRow('🎯', '攻撃範囲',    d.rng) +
      statRow('💨', '移動速度',    d.spd);
  }
  rows.innerHTML = html;
  popup.classList.add('show');
}

function statRow(ico, label, val) {
  return '<div class="stat-row"><span class="stat-row-ico">' + ico + '</span>' +
         '<span class="stat-row-lbl">' + label + '</span>' +
         '<span class="stat-row-val">' + val + '</span></div>';
}

function closeStatPopup() {
  var popup = document.getElementById('stat-popup');
  if (popup) popup.classList.remove('show');
}

// ── Base Upgrade ──────────────────────────────────────
var BASE_UPGRADES = {
  regen:       { n:'ゴールド回復',   e:'⏳', max:10, base:5,    step:0.5  },
  maxGold:     { n:'ゴールド上限',   e:'💰', max:10, base:100,  step:20   },
  hp:          { n:'拠点HP',         e:'🏯', max:10, base:1000, step:200  },
  atk:         { n:'拠点攻撃力',     e:'🏹', max:10, base:20,   step:8    },
  // 【新機能】配置クールタイム短縮（1Lv=5%短縮、最大50%）
  cdReduction: { n:'配置CD短縮',     e:'⚡', max:10, base:0,    step:5, suffix:'%' }
};

function openBaseUpgrade() {
  renderBaseUpgrade();
  showScreen('base-up');
}

function renderBaseUpgrade() {
  var el  = document.getElementById('base-upgrade-list');
  var gel = document.getElementById('base-upgrade-gold');
  if (!el) return;
  el.innerHTML = '';
  if (gel) gel.textContent = '💰 ' + SAVE.gold + ' G';

  Object.keys(BASE_UPGRADES).forEach(function(key) {
    var d    = BASE_UPGRADES[key];
    var lv   = SAVE.baseLevels[key] || 0;
    var cost = (lv + 1) * 100;
    var maxed   = lv >= d.max;
    var canBuy  = !maxed && SAVE.gold >= cost;
    var curVal  = d.base + lv * d.step;
    var nextVal = d.base + (lv + 1) * d.step;
    var sfx     = d.suffix || '';

    var row = document.createElement('div');
    row.className = 'up-row';
    row.innerHTML =
      '<div class="up-ico">' + d.e + '</div>' +
      '<div class="up-mid">' +
        '<div class="up-nm">' + d.n +
          ' <span class="up-lv' + (maxed ? ' up-maxed-lbl' : '') + '">Lv.' + lv + '/' + d.max + '</span>' +
        '</div>' +
        '<div class="up-stat">現在 <b>' + curVal + sfx + '</b>' +
          (maxed ? '' : ' → <b>' + nextVal + sfx + '</b>') + '</div>' +
        '<div class="up-track"><div class="up-prog" style="width:' + (lv * (100/d.max)) + '%"></div></div>' +
      '</div>' +
      '<button class="up-btn' +
        (maxed ? ' up-btn-max' : canBuy ? ' up-btn-ok' : '') + '"' +
        (maxed || !canBuy ? ' disabled' : '') +
        '>' + (maxed ? 'MAX' : 'G' + cost) + '</button>';
    row.querySelector('.up-btn').addEventListener('click', function() {
      doBaseUpgrade(key, cost, d.max);
    });
    el.appendChild(row);
  });
}

function doBaseUpgrade(key, cost, max) {
  var lv = SAVE.baseLevels[key] || 0;
  if (lv >= max) return;
  if (SAVE.gold < cost) { flashMsg('ゴールドが足りません'); return; }
  SAVE.gold -= cost;
  SAVE.baseLevels[key] = lv + 1;
  persistSave();
  renderBaseUpgrade();
}

// ── Stage Selection ───────────────────────────────────
function openStage() {
  renderStageSelect();
  showScreen('stage');
}

function renderStageSelect() {
  var el = document.getElementById('stage-list');
  if (!el) return;
  el.innerHTML = '';
  STAGES_CONFIG.forEach(function(s) {
    var active = selectedStage && selectedStage.id === s.id;

    // 【新機能】クリア済みバッジ & ベストタイム
    var ct = SAVE.clearTimes && SAVE.clearTimes[s.id];
    var clearBadge = ct
      ? '<div class="st-cleared">✅ クリア済み　ベスト: ' + formatTime(ct) + '</div>'
      : '';

    var card = document.createElement('div');
    card.className = 'st-card' + (active ? ' st-active' : '');
    card.innerHTML =
      '<div class="st-hd">' +
        '<span class="st-ico">' + s.icon + '</span>' +
        '<div>' +
          '<div class="st-nm">' + s.name + '</div>' +
          '<div class="st-sub">' + s.sub + '</div>' +
        '</div>' +
      '</div>' +
      clearBadge +
      '<div class="st-det">' +
        '<span>敵強化 ×' + s.enemyMult.toFixed(1) + '</span>' +
        '<span>拠点HP ' + s.enemyBaseHP + '</span>' +
        '<span>基礎報酬 💰' + s.baseReward + 'G</span>' +
      '</div>';
    card.addEventListener('click', function() { selectedStage = s; renderStageSelect(); });
    el.appendChild(card);
  });
}

function startBattle() {
  if (!selectedStage) { flashMsg('ステージを選んでください'); return; }
  PLAYER_DECK = SAVE.deck.slice();
  showScreen('battle');
  startGame(selectedStage);
}

// ── Battle End Reward ─────────────────────────────────
function awardBattleGold(win, leftoverGold) {
  // 【バグ修正】STAGES → STAGES_CONFIG
  var stg   = selectedStage || STAGES_CONFIG[0];
  var base  = win ? stg.baseReward : 0;
  var bonus = win ? Math.floor(leftoverGold) : 0;
  SAVE.gold += base + bonus;
  persistSave();
  return { base: base, bonus: bonus, total: base + bonus };
}

// ── Flash Message ─────────────────────────────────────
function flashMsg(msg) {
  var el = document.getElementById('flash-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(flashMsg._t);
  flashMsg._t = setTimeout(function() { el.style.opacity = '0'; }, 2000);
}

window.addEventListener('load', initHome);
