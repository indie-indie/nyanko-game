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
];

// ── Deck ──────────────────────────────────────────────

function buildDeck() {
  var row = document.getElementById('deck');
  row.innerHTML = '';
  deckBuilt = false;

  // 全デッキ（最大10体）を2段で表示
  PLAYER_DECK.forEach(function(id) {
    var d = PLAYER_UNITS[id];
    if (!d) return;

    var el = document.createElement('div');
    el.className = 'card';
    el.setAttribute('data-uid', id);

    var fs = Math.min(Math.round(20 * d.size), 26);
    var typeTag = '';
    if (d.type === 'air')   typeTag = '✈ 飛行';
    else if (d.type === 'spell') typeTag = '✨ 魔法';
    else                    typeTag = '⚔ 地上';

    if (d.type === 'spell') el.classList.add('card-spell');

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
      // 勝利時：報酬を表示
      rewardEl.style.display = '';
      rewardEl.innerHTML =
        '基礎報酬　<b style="color:#fbbf24">+' + reward.base + ' G</b><br>' +
        '残ゴールド　<b style="color:#93c5fd">+' + reward.bonus + ' G</b><br>' +
        '<span style="color:#f1f5f9;font-size:13px">合計　<b style="color:#fbbf24">+' + reward.total + ' G</b> 獲得！</span>';
    } else {
      // 敗北時：ランダムヒントを表示
      rewardEl.style.display = '';
      var tip = BATTLE_TIPS[Math.floor(Math.random() * BATTLE_TIPS.length)];
      rewardEl.innerHTML =
        '<div style="color:#60a5fa;font-size:11px;margin-bottom:6px;font-weight:600;">💡 ヒント</div>' +
        '<div style="color:#94a3b8;font-size:12px;line-height:1.7;">' + tip + '</div>';
    }
  }
}
