// home.js — Screen manager, persistent save, deck builder, upgrade, stage select

// ── 初期アンロック済みユニット ──────────────────────────
var INITIAL_UNLOCKED = ['nyanko', 'wanko', 'bolt', 'soldier', 'archer'];

// ── Persistent Save ───────────────────────────────────
var SAVE = {
  gold: 0,
  levels: {},
  baseLevels: { regen:0, maxGold:0, hp:0, atk:0 },
  deck: null,
  unlocked: []
};

function loadSave() {
  try {
    SAVE.gold       = parseInt(localStorage.getItem('nrts_gold') || '0', 10);
    SAVE.levels     = JSON.parse(localStorage.getItem('nrts_levels')      || '{}');
    var savedBase   = JSON.parse(localStorage.getItem('nrts_base_levels') || '{}');
    SAVE.baseLevels = Object.assign({ regen:0, maxGold:0, hp:0, atk:0 }, savedBase);
    SAVE.deck       = JSON.parse(localStorage.getItem('nrts_deck')        || 'null');
    var savedUnlocked = JSON.parse(localStorage.getItem('nrts_unlocked')  || 'null');
    SAVE.unlocked   = Array.isArray(savedUnlocked) ? savedUnlocked : INITIAL_UNLOCKED.slice();
  } catch(e) {
    console.error('Save load error:', e);
    SAVE = { gold:0, levels:{}, baseLevels:{ regen:0, maxGold:0, hp:0, atk:0 },
             deck:null, unlocked: INITIAL_UNLOCKED.slice() };
  }

  // アンロック済みユニットのみデッキに含める
  if (!Array.isArray(SAVE.deck) || SAVE.deck.length === 0) {
    SAVE.deck = INITIAL_UNLOCKED.slice();
  }
  SAVE.deck = SAVE.deck.filter(function(id) {
    return SAVE.unlocked.indexOf(id) >= 0 && PLAYER_UNITS[id];
  });
  if (SAVE.deck.length === 0) SAVE.deck = INITIAL_UNLOCKED.slice();

  PLAYER_DECK    = SAVE.deck.slice();
  selectedStage  = STAGES[0];
}

function persistSave() {
  localStorage.setItem('nrts_gold',        String(SAVE.gold));
  localStorage.setItem('nrts_levels',      JSON.stringify(SAVE.levels));
  localStorage.setItem('nrts_base_levels', JSON.stringify(SAVE.baseLevels));
  localStorage.setItem('nrts_deck',        JSON.stringify(SAVE.deck));
  localStorage.setItem('nrts_unlocked',    JSON.stringify(SAVE.unlocked));
}

// アンロック済みかどうか判定
function isUnlocked(id) {
  return SAVE.unlocked.indexOf(id) >= 0;
}

// 強化倍率: Lv0=1.0x … Lv10=2.0x
function getMultiplier(id) {
  return 1.0 + (SAVE.levels[id] || 0) * 0.1;
}
// 強化コスト: Lv0→1=50G, Lv1→2=100G … Lv9→10=500G
function getUpgradeCost(id) {
  return ((SAVE.levels[id] || 0) + 1) * 50;
}

// ── Stage Definitions ────────────────────────────────
var STAGES = [
  { id:1, name:'ステージ 1', sub:'草原の戦い', icon:'🌿',
    enemyMult:1, baseReward:150 },
  { id:2, name:'ステージ 2', sub:'砂漠の砦', icon:'🏜️',
    enemyMult:1.4, baseReward:280 },
  { id:3, name:'ステージ 3', sub:'魔王の城', icon:'🏰',
    enemyMult:1.8, baseReward:450 },
  { id:4, name:'ステージ 4', sub:'絶望', icon:'⭐',
    enemyMult:2, baseReward:600 }
];
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

  // アンロック済みユニットのみ表示
  Object.keys(PLAYER_UNITS).forEach(function(id) {
    if (!isUnlocked(id)) return;
    var d   = PLAYER_UNITS[id];
    var sel = deckSel.indexOf(id) >= 0;
    var lv  = SAVE.levels[id] || 0;
    var m   = getMultiplier(id);
    var fs  = Math.min(Math.round(22 * (d.size || 1)), 30);

    var typeTag = d.type === 'spell' ? '✨スペル'
                : d.type === 'air'   ? '✈飛行' : '⚔地上';
    var zoneTag = (d.type === 'spell' || d.zone === 'all') ? '全域' : '自陣';

    var statHtml = d.type === 'spell'
      ? 'ATK:' + Math.round(d.dmg * m) + ' 範囲:' + d.area + ' 💰' + d.cost
      : 'HP:'  + Math.round(d.hp  * m) + ' ATK:' + Math.round(d.dmg * m) + ' 💰' + d.cost;

    var card = document.createElement('div');
    card.className = 'dbcard' + (sel ? ' dbsel' : '');
    card.setAttribute('data-id', id);
    card.innerHTML =
      '<span class="db-ico" style="font-size:' + fs + 'px">' + d.e + '</span>' +
      '<div class="db-body">' +
        '<div class="db-nm">' + d.n +
          ' <span class="db-type">' + typeTag + '</span>' +
          ' <span class="db-type" style="color:#a78bfa;background:#1a0a2e">' + zoneTag + '</span>' +
          ' <span class="db-lv">Lv.' + lv + '</span>' +
        '</div>' +
        '<div class="db-st">' + statHtml + '</div>' +
      '</div>' +
      '<span class="db-chk" style="visibility:' + (sel ? 'visible' : 'hidden') + '">✓</span>';

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
    var d       = PLAYER_UNITS[id];
    var unlocked = isUnlocked(id);
    var lv      = SAVE.levels[id] || 0;
    var m       = getMultiplier(id);
    var isSpell = d.type === 'spell';

    var row = document.createElement('div');
    row.className = 'up-row';

    if (!unlocked) {
      // ─── 未解放：アンロックボタン ───
      var ucost    = d.unlockCost || 0;
      var canUnlock = SAVE.gold >= ucost;
      var statHtml = isSpell
        ? 'ATK:' + d.dmg + '　範囲:' + d.area
        : 'HP:' + d.hp + '　ATK:' + d.dmg;

      row.innerHTML =
        '<div class="up-ico">' + d.e + '</div>' +
        '<div class="up-mid">' +
          '<div class="up-nm">' + d.n +
            ' <span class="up-lv" style="color:#ef4444">🔒 未解放</span>' +
          '</div>' +
          '<div class="up-stat">' + statHtml + '</div>' +
        '</div>' +
        '<button class="up-btn' + (canUnlock ? ' up-btn-ok' : '') + '"' +
          (canUnlock ? '' : ' disabled') + '>解放 G' + ucost + '</button>';

      row.querySelector('.up-btn').addEventListener('click', function() { doUnlock(id); });

    } else {
      // ─── 解放済み：強化ボタン ───
      var cost  = getUpgradeCost(id);
      var maxed = lv >= 10;
      var canBuy = !maxed && SAVE.gold >= cost;

      // スペルはHP表記を省略し、ATK（ダメージ）のみ表示
      var statHtml;
      if (isSpell) {
        statHtml = 'ATK <b>' + d.dmg + '</b>→<b>' + Math.round(d.dmg * m) + '</b>';
      } else {
        statHtml =
          'HP <b>' + d.hp + '</b>→<b>' + Math.round(d.hp * m) + '</b>　' +
          'ATK <b>' + d.dmg + '</b>→<b>' + Math.round(d.dmg * m) + '</b>';
      }

      row.innerHTML =
        '<div class="up-ico">' + d.e + '</div>' +
        '<div class="up-mid">' +
          '<div class="up-nm">' + d.n +
            ' <span class="up-lv' + (maxed ? ' up-maxed-lbl' : '') + '">Lv.' + lv + '/10</span>' +
          '</div>' +
          '<div class="up-stat">' + statHtml + '</div>' +
          '<div class="up-track"><div class="up-prog" style="width:' + (lv * 10) + '%"></div></div>' +
        '</div>' +
        '<button class="up-btn' +
          (maxed ? ' up-btn-max' : canBuy ? ' up-btn-ok' : '') + '"' +
          (maxed || !canBuy ? ' disabled' : '') +
          '>' + (maxed ? 'MAX' : 'G' + cost) + '</button>';

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

// ── Base Upgrade ──────────────────────────────────────
var BASE_UPGRADES = {
  regen:   { n:'ゴールド回復', e:'⏳', max:10, base:5,    step:0.5 },
  maxGold: { n:'ゴールド上限', e:'💰', max:10, base:100,  step:20  },
  hp:      { n:'拠点HP',       e:'🏯', max:10, base:1000, step:200 },
  atk:     { n:'拠点攻撃力',   e:'🏹', max:10, base:20,   step:8   }
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

    var row = document.createElement('div');
    row.className = 'up-row';
    row.innerHTML =
      '<div class="up-ico">' + d.e + '</div>' +
      '<div class="up-mid">' +
        '<div class="up-nm">' + d.n +
          ' <span class="up-lv' + (maxed ? ' up-maxed-lbl' : '') + '">Lv.' + lv + '/' + d.max + '</span>' +
        '</div>' +
        '<div class="up-stat">現在 <b>' + curVal + '</b>' +
          (maxed ? '' : ' → <b>' + nextVal + '</b>') + '</div>' +
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
  renderStages();
  showScreen('stage');
}

function renderStages() {
  var el = document.getElementById('stage-list');
  if (!el) return;
  el.innerHTML = '';
  STAGES.forEach(function(s) {
    var active = selectedStage && selectedStage.id === s.id;
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
      '<div class="st-det">' +
        '<span>敵強化 ×' + s.enemyMult.toFixed(1) + '</span>' +
        '<span>基礎報酬 💰' + s.baseReward + 'G + 残G</span>' +
      '</div>';
    card.addEventListener('click', function() { selectedStage = s; renderStages(); });
    el.appendChild(card);
  });
}

function startBattle() {
  if (!selectedStage) { flashMsg('ステージを選んでください'); return; }
  PLAYER_DECK = SAVE.deck.slice();
  if (typeof currentDeckPage !== 'undefined') currentDeckPage = 0;
  showScreen('battle');
  startGame(selectedStage);
}

// ── Battle End Reward ─────────────────────────────────
function awardBattleGold(win, leftoverGold) {
  var stg   = selectedStage || STAGES[0];
  var base  = win ? stg.baseReward : Math.round(stg.baseReward * 0.3);
  var bonus = Math.floor(leftoverGold);
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
