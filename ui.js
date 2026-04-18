// ui.js — HUD rendering: gold bar, deck cards, overlay

var currentDeckPage = 0;
var deckBuilt = false;

// ── Deck ──────────────────────────────────────────────

function buildDeck() {
  var row = document.getElementById('deck');
  row.innerHTML = '';
  deckBuilt = false;

  // 現在のページに基づいて表示する5体を選択
  var start = currentDeckPage * 5;
  var end = start + 5;
  var displayUnits = PLAYER_DECK.slice(start, end);

  displayUnits.forEach(function(id) {
    var d = PLAYER_UNITS[id];
    if (!d) return; // ユニットが足りない場合の安全策

    var el = document.createElement('div');
    el.className = 'card';
    el.setAttribute('data-uid', id);

    var fs = Math.min(Math.round(24 * d.size), 30);
    var typeTag = d.type === 'air' ? '✈ 飛行' : '⚔ 地上';

    el.innerHTML =
      '<div class="cico" style="font-size:' + fs + 'px">' + d.e + '</div>' +
      '<div class="cnm">' + d.n + '</div>' +
      '<div class="ctyp">' + typeTag + '</div>' +
      '<div class="ccost">G' + d.cost + '</div>' +
      '<div class="cdov"></div>';

    el.addEventListener('click', function() { handleCardClick(id); });
    row.appendChild(el);
  });

  deckBuilt = true;
}

// デッキを切り替える関数
function toggleDeck() {
  currentDeckPage = (currentDeckPage === 0) ? 1 : 0;
  buildDeck();
  // main.jsの状態を反映させるためにUIを更新
  if (typeof updateDeckUI === 'function') updateDeckUI();
}

// Per-frame lightweight update (no innerHTML rebuild)
function updateDeckUI() {
  if (!deckBuilt) return;
  PLAYER_DECK.forEach(function(id) {
    var el = document.querySelector('[data-uid="' + id + '"]');
    if (!el) return;
    var d      = PLAYER_UNITS[id];
    var cdLeft = g.unitCDs[id] || 0;
    var onCd   = cdLeft > 0.05;
    var noGold = g.gold < d.cost;
    var sel    = g.selectedUnit === id;

    el.classList.toggle('selected', sel);
    el.classList.toggle('dim',  !sel && !onCd && noGold);
    el.classList.toggle('oncd', onCd);

    var cdov = el.querySelector('.cdov');
    if (onCd) {
      cdov.style.display = 'flex';
      cdov.textContent   = cdLeft.toFixed(1);
    } else {
      cdov.style.display = 'none';
    }
  });
}

// ── Gold bar ─────────────────────────────────────────

function updGoldUI() {
  var r = Math.min(1, g.gold / g.maxGold);
  document.getElementById('gfl').style.width = (r * 100) + '%';
  document.getElementById('glbl').textContent =
    '💰 ' + Math.floor(g.gold) + ' / ' + g.maxGold;

  var btn = document.getElementById('upbtn');
  btn.textContent = '上限UP [G' + g.upgradeCost + ']';
  btn.disabled    = !g.on || g.gold < g.upgradeCost;
}

// ── Card click ───────────────────────────────────────

function handleCardClick(id) {
  if (!g || !g.on) return;
  var d      = PLAYER_UNITS[id];
  var cdLeft = g.unitCDs[id] || 0;
  if (onCd(id) || g.gold < d.cost) return;

  // Toggle selection
  g.selectedUnit = (g.selectedUnit === id) ? null : id;
  document.getElementById('phint').textContent = g.selectedUnit
    ? d.e + ' ' + d.n + ' を配置する場所をクリック'
    : '';
}

function onCd(id) { return (g.unitCDs[id] || 0) > 0.05; }

// ── Win/Lose overlay ─────────────────────────────────

function renderOverlay(win, reward) {
  var ov = document.getElementById('ov');
  ov.style.display = 'flex';
  document.getElementById('oico').textContent = win ? '🏆' : '💀';
  document.getElementById('otit').textContent = win ? '勝利！' : '敗北...';
  document.getElementById('otit').style.color = win ? '#fbbf24' : '#ef4444';
  var mm = Math.floor(g.t / 60), ss = Math.floor(g.t % 60);
  var ts = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  document.getElementById('osub').textContent = win
    ? '敵拠点を撃破！ クリアタイム: ' + ts
    : '拠点が落ちた... 生存時間: ' + ts;

  var rewardEl = document.getElementById('oreward');
  if (rewardEl) {
    if (reward) {
      rewardEl.innerHTML =
        '基礎報酬　<b style="color:#fbbf24">+' + reward.base + ' G</b><br>' +
        '残ゴールド　<b style="color:#93c5fd">+' + reward.bonus + ' G</b><br>' +
        '<span style="color:#f1f5f9;font-size:13px">合計　<b style="color:#fbbf24">+' + reward.total + ' G</b> 獲得！</span>';
    } else {
      rewardEl.textContent = '';
    }
  }
}
