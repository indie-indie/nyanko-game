// home.js — Screen manager, persistent save, deck builder, upgrade, stage select

var selectedStage;

var INITIAL_UNLOCKED = ['nyanko', 'wanko', 'bolt', 'soldier', 'archer'];

// ── Persistent Save ───────────────────────────────────
var SAVE = {
  gold: 0,
  levels: {},
  baseLevels: { regen:0, maxGold:0, hp:0, atk:0, cdReduction:0 },
  deck: null,
  unlocked: [],
  clearTimes: {}
};

function loadSave() {
  try {
    SAVE.gold         = parseInt(localStorage.getItem('nrts_gold') || '0', 10);
    SAVE.levels       = JSON.parse(localStorage.getItem('nrts_levels')      || '{}');
    var savedBase     = JSON.parse(localStorage.getItem('nrts_base_levels') || '{}');
    SAVE.baseLevels   = Object.assign({ regen:0, maxGold:0, hp:0, atk:0, cdReduction:0 }, savedBase);
    var rawDeck       = JSON.parse(localStorage.getItem('nrts_deck')        || 'null');
    var savedUnlocked = JSON.parse(localStorage.getItem('nrts_unlocked')    || 'null');
    SAVE.unlocked     = Array.isArray(savedUnlocked) ? savedUnlocked : INITIAL_UNLOCKED.slice();
    SAVE.clearTimes   = JSON.parse(localStorage.getItem('nrts_clear_times') || '{}');

    // デッキを 10 スロット形式に正規化（旧形式からの移行対応）
    SAVE.deck = normalizeDeck(rawDeck);
  } catch(e) {
    console.error('Save load error:', e);
    SAVE = { gold:0, levels:{}, baseLevels:{ regen:0, maxGold:0, hp:0, atk:0, cdReduction:0 },
             deck:null, unlocked: INITIAL_UNLOCKED.slice(), clearTimes:{} };
    SAVE.deck = normalizeDeck(null);
  }

  PLAYER_DECK   = SAVE.deck.slice();
  selectedStage = STAGES_CONFIG[0];
}

// デッキを常に 10 スロット配列に正規化
function normalizeDeck(raw) {
  var result = new Array(10).fill(null);
  if (!Array.isArray(raw)) {
    // デフォルト配置
    var def = INITIAL_UNLOCKED.filter(function(id) { return PLAYER_UNITS[id]; });
    for (var i = 0; i < Math.min(def.length, 10); i++) result[i] = def[i];
    return result;
  }
  // 10 スロット済みの新形式
  if (raw.length === 10) {
    for (var i = 0; i < 10; i++) {
      var id = raw[i];
      if (id && PLAYER_UNITS[id]) result[i] = id;
    }
    return result;
  }
  // 旧形式（文字列配列）→先頭から順に詰める
  for (var i = 0; i < Math.min(raw.length, 10); i++) {
    var id = raw[i];
    if (id && PLAYER_UNITS[id]) result[i] = id;
  }
  return result;
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
// レベル上限なし — コストは単調増加
function getUpgradeCost(id) { return ((SAVE.levels[id] || 0) + 1) * 50; }

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

// ── 汎用：ユニットアイコン HTML（画像 or 絵文字）────────
function unitIconHtmlHome(d, size) {
  if (d.img) {
    return '<img src="' + d.img + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;vertical-align:middle;">';
  }
  return '<span style="font-size:' + size + 'px">' + d.e + '</span>';
}

// ── Deck Builder ──────────────────────────────────────
// deckSlots  : 作業用 10スロット配列
// deckSelSlot: 現在選択中のスロット番号（-1 = 未選択）

var deckSlots    = new Array(10).fill(null);
var deckSelSlot  = -1;

function openDeck() {
  deckSlots   = SAVE.deck.slice();
  deckSelSlot = -1;
  renderDeckBuilder();
  showScreen('deck');
}

function renderDeckBuilder() {
  var poolEl  = document.getElementById('deck-grid');
  var slotsEl = document.getElementById('deck-slots');
  var cnt     = document.getElementById('deck-count');
  if (!poolEl || !slotsEl) return;

  var filled = deckSlots.filter(function(id) { return id !== null; }).length;
  if (cnt) cnt.textContent = filled + ' / 10';

  // ── スロットグリッド（デッキプレビュー）──────────────
  slotsEl.innerHTML = '';
  for (var i = 0; i < 10; i++) {
    (function(idx) {
      var id  = deckSlots[idx];
      var d   = id ? PLAYER_UNITS[id] : null;
      var sel = deckSelSlot === idx;

      var slot = document.createElement('div');
      slot.className = 'ds-slot' +
        (sel   ? ' ds-selected' : '') +
        (d     ? ' ds-filled'   : '');

      if (d) {
        var fs = Math.min(Math.round(18 * (d.size || 1)), 23);
        var isSpell = d.type === 'spell';
        if (isSpell) slot.classList.add('ds-spell');
        slot.innerHTML =
          '<div class="ds-num">' + (idx + 1) + '</div>' +
          '<div class="ds-ico">' + unitIconHtmlHome(d, fs) + '</div>' +
          '<div class="ds-nm">' + d.n + '</div>' +
          '<div class="ds-cost">G' + d.cost + '</div>';

        // × ボタン（stopPropagation でスロット選択を防ぐ）
        var delBtn = document.createElement('button');
        delBtn.className = 'ds-del';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          clearDeckSlot(idx);
        });
        slot.appendChild(delBtn);
      } else {
        slot.innerHTML =
          '<div class="ds-num">' + (idx + 1) + '</div>' +
          '<div class="ds-ico-empty">' + (sel ? '▼' : '＋') + '</div>';
      }

      slot.addEventListener('click', function() { tapDeckSlot(idx); });
      slotsEl.appendChild(slot);
    })(i);
  }

  // ── ユニットプール ────────────────────────────────
  poolEl.innerHTML = '';
  // スロット選択中はヒント表示
  var hintEl = document.getElementById('deck-slot-hint');
  if (hintEl) {
    hintEl.textContent = deckSelSlot >= 0
      ? 'スロット ' + (deckSelSlot + 1) + ' を選択中 — ユニットをタップして配置'
      : 'スロットをタップして選択 → ユニットをタップして配置';
  }

  Object.keys(PLAYER_UNITS).forEach(function(id) {
    if (!isUnlocked(id)) return;
    var d       = PLAYER_UNITS[id];
    var lv      = SAVE.levels[id] || 0;
    var slotIdx = deckSlots.indexOf(id);
    var inDeck  = slotIdx >= 0;
    var fs      = Math.min(Math.round(22 * (d.size || 1)), 30);
    var typeTag = d.type === 'spell' ? '✨スペル' : d.type === 'air' ? '✈飛行' : '⚔地上';
    var zoneTag = (d.type === 'spell' || d.zone === 'all') ? '全域' : '自陣';
    var slotBadge = inDeck
      ? '<span class="db-slot-badge">' + (slotIdx + 1) + '</span>' : '';

    var card = document.createElement('div');
    card.className = 'dbcard' + (inDeck ? ' dbsel' : '');
    card.innerHTML =
      '<span class="db-ico">' + unitIconHtmlHome(d, fs) + '</span>' +
      '<div class="db-body">' +
        '<div class="db-nm">' + d.n +
          ' <span class="db-type">' + typeTag + '</span>' +
          ' <span class="db-type" style="color:#a78bfa;background:#1a0a2e">' + zoneTag + '</span>' +
          ' <span class="db-lv">Lv.' + lv + '</span>' +
          slotBadge +
        '</div>' +
      '</div>' +
      '<button class="stat-btn" title="ステータス確認">📊</button>' +
      '<span class="db-chk" style="visibility:' + (inDeck ? 'visible' : 'hidden') + '">✓</span>';

    card.querySelector('.stat-btn').addEventListener('click', function(e) {
      e.stopPropagation(); showUnitStats(id);
    });
    card.addEventListener('click', function() { tapDeckUnit(id); });
    poolEl.appendChild(card);
  });
}

// スロットをタップ（選択 or 解除）
function tapDeckSlot(idx) {
  deckSelSlot = (deckSelSlot === idx) ? -1 : idx;
  renderDeckBuilder();
}

// ユニットをタップ
function tapDeckUnit(id) {
  var existingSlot = deckSlots.indexOf(id);

  if (deckSelSlot >= 0) {
    // スロット選択中：そのスロットに割り当て
    if (existingSlot >= 0 && existingSlot !== deckSelSlot) {
      deckSlots[existingSlot] = null;   // 旧スロットをクリア
    }
    if (deckSlots[deckSelSlot] === id) {
      // 同じユニットをもう一度タップ → 解除
      deckSlots[deckSelSlot] = null;
    } else {
      deckSlots[deckSelSlot] = id;
    }
    deckSelSlot = -1;
  } else {
    // スロット未選択
    if (existingSlot >= 0) {
      // デッキ内にいれば取り出す
      deckSlots[existingSlot] = null;
    } else {
      // 空き先頭スロットに追加
      var emptyIdx = deckSlots.indexOf(null);
      if (emptyIdx >= 0) {
        deckSlots[emptyIdx] = id;
      } else {
        flashMsg('全スロットが埋まっています（×で解除）');
        return;
      }
    }
  }
  renderDeckBuilder();
}

// スロットをクリア
function clearDeckSlot(idx) {
  deckSlots[idx] = null;
  if (deckSelSlot === idx) deckSelSlot = -1;
  renderDeckBuilder();
}

function saveDeck() {
  var cnt = deckSlots.filter(function(id) { return id !== null; }).length;
  if (cnt < 1) { flashMsg('最低1体配置してください'); return; }
  SAVE.deck   = deckSlots.slice();
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
    var fs       = Math.min(Math.round(22 * (d.size || 1)), 30);
    var row      = document.createElement('div');
    row.className = 'up-row';

    if (!unlocked) {
      var ucost     = d.unlockCost || 0;
      var canUnlock = SAVE.gold >= ucost;
      row.innerHTML =
        '<div class="up-ico">' + unitIconHtmlHome(d, 26) + '</div>' +
        '<div class="up-mid">' +
          '<div class="up-nm">' + d.n +
            ' <span class="up-lv" style="color:#ef4444">🔒 未解放</span>' +
          '</div>' +
        '</div>' +
        '<button class="stat-btn">📊</button>' +
        '<button class="up-btn' + (canUnlock ? ' up-btn-ok' : '') + '"' +
          (canUnlock ? '' : ' disabled') + '>解放 G' + ucost + '</button>';
      row.querySelector('.stat-btn').addEventListener('click', function(e) { e.stopPropagation(); showUnitStats(id); });
      row.querySelector('.up-btn').addEventListener('click', function() { doUnlock(id); });
    } else {
      var cost   = getUpgradeCost(id);
      var canBuy = SAVE.gold >= cost;
      // レベル上限なし：MAX 表示不要、コストボタンのみ
      row.innerHTML =
        '<div class="up-ico">' + unitIconHtmlHome(d, 26) + '</div>' +
        '<div class="up-mid">' +
          '<div class="up-nm">' + d.n +
            ' <span class="up-lv">Lv.' + lv + '</span>' +
          '</div>' +
        '</div>' +
        '<button class="stat-btn">📊</button>' +
        '<button class="up-btn' + (canBuy ? ' up-btn-ok' : '') + '"' +
          (canBuy ? '' : ' disabled') + '>G' + cost + '</button>';
      row.querySelector('.stat-btn').addEventListener('click', function(e) { e.stopPropagation(); showUnitStats(id); });
      row.querySelector('.up-btn').addEventListener('click', function() { doUpgrade(id); });
    }
    el.appendChild(row);
  });
}

function doUpgrade(id) {
  // レベル上限なし
  var cost = getUpgradeCost(id);
  if (SAVE.gold < cost) { flashMsg('ゴールドが足りません'); return; }
  SAVE.gold -= cost;
  SAVE.levels[id] = (SAVE.levels[id] || 0) + 1;
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
// スキル表示用マップ
var SKILL_DISPLAY = {
  thunder: { ico:'⚡', label:'サンダー', desc:'命中時：タゲリセット＋0.2秒スタン' },
  slow:    { ico:'🐢', label:'スロウ',   desc:'命中時：移動速度ダウン（最大4スタック）' },
  poison:  { ico:'☠',  label:'毒',       desc:'命中時：3秒間継続ダメージ' },
  heal:    { ico:'💚', label:'ヒール',   desc:'攻撃時：周囲の味方を回復' },
  split:   { ico:'✂',  label:'分裂',     desc:'死亡時：2体に分裂して再生' },
  freeze:  { ico:'🧊', label:'凍結',     desc:'命中時：一定時間行動不能' },
  pierce:  { ico:'➡',  label:'貫通',     desc:'弾が射程全体を貫通してヒット' }
};

// 属性の日本語ラベル
var ATTR_LABEL = {
  beast:    '🐾 獣系',
  humanoid: '👤 人間系',
  machine:  '⚙ 機械系',
  undead:   '💀 不死系',
  magic:    '🔮 魔法系',
  construct:'🛡 構造物系'
};

function showUnitStats(id) {
  var d  = PLAYER_UNITS[id];
  var lv = SAVE.levels[id] || 0;
  var m  = getMultiplier(id);
  var popup = document.getElementById('stat-popup');
  var icon  = document.getElementById('stat-popup-icon');
  var name  = document.getElementById('stat-popup-name');
  var rows  = document.getElementById('stat-popup-rows');
  if (!popup) return;

  // ポップアップアイコン（画像 or 絵文字）
  icon.innerHTML = unitIconHtmlHome(d, 28);
  name.textContent = d.n + '　Lv.' + lv;

  var html = '';
  if (d.type === 'spell') {
    html +=
      statRow('💰', 'コスト',        d.cost + ' G') +
      statRow('💥', 'ダメージ',       Math.round(d.dmg * m)) +
      statRow('🎯', '効果範囲',       d.area) +
      statRow('⏰', 'クールタイム',   d.cd + ' s');
  } else {
    var targLabel = { ground:'地上のみ', air:'飛行のみ', both:'両方', base:'拠点のみ' }[d.targets] || d.targets;
    html +=
      statRow('💰', 'コスト',        d.cost + ' G') +
      statRow('❤️', 'HP',            Math.round(d.hp  * m)) +
      statRow('🗡️', 'ATK',           Math.round(d.dmg * m)) +
      statRow('🎯', '攻撃範囲',      d.rng) +
      statRow('⌛', '攻撃間隔',      d.ar) +
      statRow('💨', '移動速度',      d.spd) +
      statRow('🏹', 'ターゲット',    targLabel) +
      (d.isBase ? statRow('🏯', '拠点認識', 'あり') : '');

    // 属性・特攻表示
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1a2a4a;"></div>';
    html += statRow('🏷', '属性', d.attr ? (ATTR_LABEL[d.attr] || d.attr) : '—');
    if (d.affinity) {
      var afLabel = ATTR_LABEL[d.affinity] || d.affinity;
      var bonus   = typeof AFFINITY_BONUS !== 'undefined' ? Math.round(AFFINITY_BONUS * 100) + '%' : '150%';
      html += statRow('⚔', '特攻対象', afLabel + ' <span style="color:#fbbf24;font-size:10px">×' + bonus + '</span>');
    } else {
      html += statRow('⚔', '特攻対象', '—');
    }
  }

  // スキル表示
  if (d.skills && d.skills.length > 0) {
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1a2a4a;"></div>';
    for (var si = 0; si < d.skills.length; si++) {
      var sk  = d.skills[si];
      var sd  = SKILL_DISPLAY[sk.effect];
      var ico = sd ? sd.ico  : '✨';
      var dsc = sd ? sd.desc : sk.effect;
      html += statRow(ico, 'スキル', dsc);
    }
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
  regen:       { n:'ゴールド回復', e:'⏳', base:5,    step:0.5  },
  maxGold:     { n:'ゴールド上限', e:'💰', base:100,  step:50   },
  hp:          { n:'拠点HP',       e:'🏯', base:1000, step:200  },
  atk:         { n:'拠点攻撃力',   e:'🏹', base:20,   step:4    },
  cdReduction: { n:'配置CD短縮',   e:'⚡', base:0,    step:5, suffix:'%' }
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
    var d       = BASE_UPGRADES[key];
    var lv      = SAVE.baseLevels[key] || 0;
    var cost    = (lv + 1) * 100;
    var canBuy  = SAVE.gold >= cost;
    var curVal  = d.base + lv * d.step;
    var nextVal = d.base + (lv + 1) * d.step;
    var sfx     = d.suffix || '';

    var row = document.createElement('div');
    row.className = 'up-row';
    // レベル上限なし
    row.innerHTML =
      '<div class="up-ico">' + d.e + '</div>' +
      '<div class="up-mid">' +
        '<div class="up-nm">' + d.n +
          ' <span class="up-lv">Lv.' + lv + '</span>' +
        '</div>' +
        '<div class="up-stat">現在 <b>' + curVal + sfx + '</b> → <b>' + nextVal + sfx + '</b></div>' +
      '</div>' +
      '<button class="up-btn' + (canBuy ? ' up-btn-ok' : '') + '"' +
        (canBuy ? '' : ' disabled') + '>G' + cost + '</button>';
    row.querySelector('.up-btn').addEventListener('click', function() {
      doBaseUpgrade(key);
    });
    el.appendChild(row);
  });
}

function doBaseUpgrade(key) {
  var lv   = SAVE.baseLevels[key] || 0;
  var cost = (lv + 1) * 100;
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
    var ct = SAVE.clearTimes && SAVE.clearTimes[s.id];
    var clearBadge = ct
      ? '<div class="st-cleared">✅ クリア済み　ベスト: ' + formatTime(ct) + '</div>'
      : '';
    var card = document.createElement('div');
    card.className = 'st-card' + (active ? ' st-active' : '');
    card.innerHTML =
      '<div class="st-hd">' +
        '<span class="st-ico">' + s.icon + '</span>' +
        '<div><div class="st-nm">' + s.name + '</div><div class="st-sub">' + s.sub + '</div></div>' +
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
