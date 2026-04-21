// ui.js — HUD rendering: gold bar, deck cards, overlay

var deckBuilt = false;

// ── Tips（敗北時に表示）────────────────────────────
var BATTLE_TIPS = [
  'コスト低めのユニットを複数展開して数で押し切ろう！',
  'アーチャーやスナイパーは飛行ユニットにも対応できる。',
  'ゴーレムで前線を固めてから後ろに射程ユニットを置くと強い。',
  'スペル「火炎弾」で密集した敵をまとめて一掃できる。',
  'ゴールド上限をアップすると大型ユニットが出しやすくなる。',
  'ウルフは速度が高く、前線を素早く突破できる。',
  '拠点強化でHP・攻撃力を底上げしておこう！',
  'アサシンは全域配置可能。敵の後方に奇襲をかけよう。',
  'フリーズスペルで強敵を一時停止できる。',
  '敵の飛行ユニットには「両方」ターゲットのユニットで対抗しよう。',
  'ゴーレムは isBase 属性持ち。敵の突進役もゴーレムを狙う！',
];

// ── カードアイコン HTML（画像 or 絵文字）─────────────
function unitIconHtml(d, size) {
  if (d.img) {
    return '<img src="' + d.img + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;vertical-align:middle;">';
  }
  return d.e;
}

// ── Deck ──────────────────────────────────────────────
// PLAYER_DECK は 10 要素の位置固定配列（null = 空スロット）

function buildDeck() {
  var row = document.getElementById('deck');
  row.innerHTML = '';
  deckBuilt = false;

  for (var slotIdx = 0; slotIdx < PLAYER_DECK.length; slotIdx++) {
    var id = PLAYER_DECK[slotIdx];
    var el = document.createElement('div');
    el.className = 'card';

    if (!id) {
      // 空スロット
      el.classList.add('card-empty');
      el.innerHTML = '<div style="font-size:14px;color:#1e3a5f;">—</div>';
      row.appendChild(el);
      continue;
    }

    el.setAttribute('data-uid', id);
    var d  = PLAYER_UNITS[id];
    var fs = Math.min(Math.round(20 * d.size), 24);
    var typeTag = d.type === 'air' ? '✈' : d.type === 'spell' ? '✨' : '⚔';
    if (d.type === 'spell') el.classList.add('card-spell');

    el.innerHTML =
      '<div class="cico" style="font-size:' + (d.img ? '0' : fs) + 'px">' +
        unitIconHtml(d, d.img ? fs : null) +
      '</div>' +
      '<div class="cnm">' + d.n + '</div>' +
      '<div class="ctyp">' + typeTag + '</div>' +
      '<div class="ccost">G' + d.cost + '</div>' +
      '<div class="cdov"></div>';

    el.addEventListener('click', function(capturedId) {
      return function() { handleCardClick(capturedId); };
    }(id));
    row.appendChild(el);
  }

  deckBuilt = true;
}

// Per-frame update
function updateDeckUI() {
  if (!deckBuilt) return;
  PLAYER_DECK.forEach(function(id) {
    if (!id) return;
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

  g.selectedUnit = (g.selectedUnit === id) ? null : id;
  document.getElementById('phint').textContent = g.selectedUnit
    ? d.e + ' ' + d.n + ' を配置する場所をタップ'
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
    : '拠点を破壊されてしまった... 生存時間: ' + ts;

  var rewardEl = document.getElementById('oreward');
  if (rewardEl) {
    if (win && reward) {
      rewardEl.style.display = '';
      rewardEl.innerHTML =
        '基礎報酬　<b style="color:#fbbf24">+' + reward.base + ' G</b><br>' +
        '残ゴールド　<b style="color:#93c5fd">+' + reward.bonus + ' G</b><br>' +
        '<span style="color:#f1f5f9;font-size:13px">合計　<b style="color:#fbbf24">+' + reward.total + ' G</b> 獲得！</span>';
    } else {
      rewardEl.style.display = '';
      var tip = BATTLE_TIPS[Math.floor(Math.random() * BATTLE_TIPS.length)];
      rewardEl.innerHTML =
        '<div style="color:#60a5fa;font-size:11px;margin-bottom:6px;font-weight:600;">💡 ヒント</div>' +
        '<div style="color:#94a3b8;font-size:12px;line-height:1.7;">' + tip + '</div>';
    }
  }
}
