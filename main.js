// main.js — Game loop, state, update, render, input

var g, uid_, parts, raf_, prev_;
var mouseX = -1, mouseY = -1;
var canvas, cx;

// ── Init ─────────────────────────────────────────────

function startGame(stageConfig) {
  document.getElementById('ov').style.display = 'none';
  uid_  = 0;
  parts = [];

  spawnedEmergency50 = false;
  spawnedEmergency20 = false;

  var stage = stageConfig || { enemyMult: 1.0, baseReward: 150 };

  // 拠点強化ステータスの反映
  var base = SAVE.baseLevels || {};
  var initRegen = 5 + (base.regen || 0) * 0.5;
  var initMaxG  = 100 + (base.maxGold || 0) * 20;
  var pbHp      = 1000 + (base.hp || 0) * 200;
  var pbAtk     = 20 + (base.atk || 0) * 8;

  g = {
    on: true, t: 0,
    pb: { hp:pbHp, max:pbHp, cd:0, ar:1.2, dmg:pbAtk, rng:150 }, // プレイヤー拠点に攻撃パラメータ追加
    eb: { hp:1000, max:1000 },
    units: [],
    projectiles: [], // 弾の管理配列を追加
    gold: 0, maxGold: initMaxG, regen: initRegen,
    upgradeCost: Math.round(initMaxG * 0.7),
    unitCDs: {},
    selectedUnit: null,
    eTimer: 0, eNext: 4.5,
    shake: 0,
    stageMult: stage.enemyMult || 1.0   // applied to enemy hp/dmg in wave.js
  };

  PLAYER_DECK.forEach(function(id) { g.unitCDs[id] = 0; });

  // Canvas — bind events once
if (!canvas) {
  canvas = document.getElementById('gc');
  cx     = canvas.getContext('2d');
  
  // マウスイベント
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  
  // スマホ用タッチイベントを追加（これが無いとスマホで反応しません）
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    var scaleX = canvas.width / rect.width;
    mouseX = (touch.clientX - rect.left) * scaleX;
    handleCanvasClick(e); // タップで配置
  }, {passive: false});

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    var scaleX = canvas.width / rect.width;
    mouseX = (touch.clientX - rect.left) * scaleX;
  }, {passive: false});
}
 
  // Upgrade button
  document.getElementById('upbtn').onclick = function() {
    if (!g || g.gold < g.upgradeCost) return;
    g.gold       -= g.upgradeCost;
    g.maxGold = Math.round(g.maxGold * 1.5);
    g.upgradeCost = Math.round(g.upgradeCost * 1.4);
    updGoldUI();
  };

  buildDeck();
  updGoldUI();

  cancelAnimationFrame(raf_);
  prev_ = performance.now();
  raf_  = requestAnimationFrame(loop);
}

// ── Input ─────────────────────────────────────────────

function canvasX(clientX) {
  var r = canvas.getBoundingClientRect();
  return (clientX - r.left) * (W / r.width);
}
// main.js の handleCanvasClick 関数を修正
function handleCanvasClick(e) {
  if (!g || !g.on || !g.selectedUnit) return;

  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  
  // クリック位置の座標計算 (XY全方位対応)
  var clientX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
  var clientY = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
  var x = (clientX - rect.left) * scaleX;
  var y = (clientY - rect.top) * scaleY;

  var d = PLAYER_UNITS[g.selectedUnit];
  if (g.gold < d.cost) return; // ゴールド不足

  // --- スペルの場合の処理 ---
  if (d.type === 'spell') {
    castSpell(g.selectedUnit, x, y); // スペル発動
    g.gold -= d.cost;
    g.unitCDs[g.selectedUnit] = d.cd; // クールダウン開始
    g.selectedUnit = null;
    document.getElementById('phint').textContent = '';
    return;
  }

  // --- ユニットの場合の処理（既存のロジック） ---
  var mult = (typeof getMultiplier === 'function') ? getMultiplier(g.selectedUnit) : 1.0;
  var scaledD = {
    n:d.n, e:d.e, hp:Math.round(d.hp*mult), dmg:Math.round(d.dmg*mult),
    spd:d.spd, rng:d.rng, ar:d.ar, type:d.type, targets:d.targets,
    size:d.size, area:d.area||0, heal:d.heal||0, rew:d.rew||1, cd:d.cd
  };

  var spawnY = PSY + (Math.random() * 20 - 10); 
  var newUnit = mkUnit(g.selectedUnit, 'player', x, spawnY, scaledD);
  g.units.push(newUnit);

  g.gold -= d.cost;
  g.unitCDs[g.selectedUnit] = d.cd;
  g.selectedUnit = null;
  document.getElementById('phint').textContent = '';
}
function handleMouseMove(e) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
}
function handleTouchEnd(e)     { e.preventDefault(); placeUnit(canvasX(e.changedTouches[0].clientX)); }
function handleTouchMove(e)    { e.preventDefault(); mouseX = canvasX(e.touches[0].clientX); }

function placeUnit(x) {
  if (!g || !g.on || !g.selectedUnit) return;
  var id = g.selectedUnit;
  var d  = PLAYER_UNITS[id];
  if (g.gold < d.cost || onCd(id)) return;

  x = Math.max(15, Math.min(x, W - 15));
  g.gold       -= d.cost;
  g.unitCDs[id] = d.cd;

  // Apply upgrade multiplier (from home.js SAVE, fallback 1.0)
  var mult = (typeof getMultiplier === 'function') ? getMultiplier(id) : 1.0;
  var scaledD = {
    n:d.n, e:d.e, hp:Math.round(d.hp*mult), dmg:Math.round(d.dmg*mult),
    spd:d.spd, rng:d.rng, ar:d.ar, type:d.type, targets:d.targets,
    size:d.size, area:d.area||0, heal:d.heal||0, rew:d.rew||1, cd:d.cd
  };
  g.units.push(mkUnit(id, 'player', x, PSY, scaledD));
  g.selectedUnit = null;
  document.getElementById('phint').textContent = '';
}

function castSpell(id, x, y) {
  var d = PLAYER_UNITS[id];
  
  // 視覚効果（円形のパーティクル）
  for (var i = 0; i < 20; i++) {
    var ang = Math.random() * Math.PI * 2;
    var dist = Math.random() * d.area;
    parts.push({
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      vx: Math.cos(ang) * 2,
      vy: Math.sin(ang) * 2,
      life: 30,
      c: d.effect === 'damage' ? '#ff4400' : d.effect === 'heal' ? '#00ff88' : '#00ccff'
    });
  }

  // ユニットへの影響
  g.units.forEach(function(u) {
    var dx = u.x - x;
    var dy = u.y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= d.area) {
      if (d.effect === 'damage' && u.team === 'enemy') {
        u.hp -= d.dmg;
        u.flash = 5; // 被弾エフェクト
      } 
      else if (d.effect === 'heal' && u.team === 'player') {
        u.hp = Math.min(u.mhp, u.hp + d.dmg);
        u.flash = 5;
      }
      else if (d.effect === 'stun' && u.team === 'enemy') {
        u.state = 'idle';
        u.stuntimer = (u.stuntimer || 0) + d.duration * 60; // 60fps想定
      }
    }
  });

  // 敵拠点へのダメージ（スペルの場合）
  if (d.effect === 'damage' && Math.abs(y - EBY) < d.area) {
     g.eb.hp -= d.dmg * 0.5; // 拠点へはダメージ半減など
  }
}

// ── Combat helpers ────────────────────────────────────

// Returns the nearest valid enemy unit in range, or null
function findTarget(u) {
  if (u.targets === 'base') return null;

  // 1. 現在のターゲット(u.currentTarget)がまだ有効かチェック
  if (u.currentTarget && !u.currentTarget.dead) {
    var d = Math.hypot(u.x - u.currentTarget.x, u.y - u.currentTarget.y);
    // 射程内、かつ攻撃対象タイプ（地上/空中）が一致していれば維持
    if (d < u.rng && (u.targets === 'both' || u.targets === u.currentTarget.type)) {
      return u.currentTarget;
    }
  }

  // 2. 現在のターゲットが無効（死亡または射程外）なら、新しい敵を探す
  var best = null, bd = Infinity;
  for (var i = 0; i < g.units.length; i++) {
    var e = g.units[i];
    if (e.team === u.team || e.dead) continue;
    if (u.targets !== 'both' && u.targets !== e.type) continue;
    
    var d = Math.hypot(u.x - e.x, u.y - e.y);
    if (d < u.rng && d < bd) { 
      bd = d; 
      best = e; 
    }
  }

  // 新しいターゲットを記憶（見つからなければnull）
  u.currentTarget = best;
  return best;
}

function hitUnit(tgt, amt) {
  if (!tgt || tgt.dead) return;
  tgt.hp -= amt;
  tgt.flash = 8;
  if (tgt.hp <= 0) {
    tgt.dead = true;
    burst(tgt.x, tgt.y, tgt.team === 'player' ? '#3b82f6' : '#ef4444', 7);
    if (tgt.team === 'enemy') {
      // Player earns gold for kills
      g.gold = Math.min(g.gold + tgt.rew, g.maxGold);
    }
  }
}

function hitBase(side, amt) {
  if (side === 'enemy') {
    g.eb.hp = Math.max(0, g.eb.hp - amt);
  } else {
    g.pb.hp = Math.max(0, g.pb.hp - amt);
    g.shake = 14;
  }
}

function burst(x, y, col, n) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
    parts.push({ x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, col:col,
      life: 30 + (Math.random() * 22 | 0), max:52, r: 2 + Math.random() * 2.5 });
  }
}

// ── Update ────────────────────────────────────────────

function update(dt) {
  g.t    += dt;
  g.gold  = Math.min(g.gold + g.regen * dt, g.maxGold);
  g.shake = Math.max(0, g.shake - 1);

  // Tick summon cooldowns
  PLAYER_DECK.forEach(function(id) {
    if (g.unitCDs[id] > 0) g.unitCDs[id] = Math.max(0, g.unitCDs[id] - dt);
  });

  // Auto-deselect if selected card went on CD (just placed)
  if (g.selectedUnit && onCd(g.selectedUnit)) {
    g.selectedUnit = null;
    document.getElementById('phint').textContent = '';
  }

  // Enemy wave
  updateWave(g, dt);

  // Player Base Attack (拠点の迎撃ロジック)
  g.pb.cd = Math.max(0, g.pb.cd - dt);
  if (g.pb.cd <= 0) {
    var bestE = null, bestD = Infinity;
    for (var i = 0; i < g.units.length; i++) {
      var e = g.units[i];
      if (e.team === 'enemy' && !e.dead) {
        var d = Math.hypot(e.x - (W / 2), e.y - PBY);
        if (d < g.pb.rng && d < bestD) { bestD = d; bestE = e; }
      }
    }
    if (bestE) {
      g.pb.cd = g.pb.ar;
      g.projectiles.push({
        x: W / 2, y: PBY - 30, tgt: bestE, dmg: g.pb.dmg, spd: 400,
        team: 'player', col: '#fbbf24', type: 'base'
      });
    }
  }

  // Update projectiles (弾の進行と着弾ロジック)
  for (var pi = 0; pi < g.projectiles.length; pi++) {
    var p = g.projectiles[pi];
    if (p.tgt.dead) { p.dead = true; continue; }

    var dx = p.tgt.x - p.x;
    var dy = p.tgt.y - p.y;
    var dist = Math.hypot(dx, dy);
    var move = p.spd * dt;

    if (dist <= move) {
      // 着弾
      if (p.area) {
        for (var k = 0; k < g.units.length; k++) {
          var e2 = g.units[k];
          if (e2.team !== p.team && !e2.dead && Math.hypot(e2.x - p.tgt.x, e2.y - p.tgt.y) < p.area)
            hitUnit(e2, p.dmg);
        }
        burst(p.tgt.x, p.tgt.y, '#f97316', 5);
      } else {
        hitUnit(p.tgt, p.dmg);
      }
      p.dead = true;
    } else {
      p.x += (dx / dist) * move;
      p.y += (dy / dist) * move;
    }
  }
  g.projectiles = g.projectiles.filter(function(p) { return !p.dead; });

  // Unit AI
  for (var i = 0; i < g.units.length; i++) {
    var u = g.units[i];
    if (u.dead) continue;
    u.flash = Math.max(0, u.flash - 1);
    u.cd    = Math.max(0, u.cd  - dt);
    u.hcd   = Math.max(0, u.hcd - dt);
  
    // 1. 拠点情報の定義
    var baseIdx = (u.team === 'player' ? 'enemy' : 'player');
    var targetBaseX = W / 2;
    var targetBaseY = (u.team === 'player' ? EBY : PBY);
    var distToBase = Math.hypot(targetBaseX - u.x, targetBaseY - u.y);
  
    // --- 拠点攻撃：範囲内にいれば攻撃し、立ち止まる ---
    if (distToBase < 55) {
      if (u.cd <= 0) {
        u.cd = u.ar;
        hitBase(baseIdx, u.dmg);
      }
      continue; 
    }
  
    // 2. 射程内の敵ユニットを探す (findTarget内で型チェックが行われます)
    var tgt = findTarget(u); 
    
    if (tgt) {
      // ユニット攻撃
      if (u.cd <= 0) {
        u.cd = u.ar;
        
        // 射程が長い(遠距離)場合は弾を発射
        if (u.rng > 55) {
          var pcol = u.team === 'player' ? '#93c5fd' : '#fca5a5';
          g.projectiles.push({
            x: u.x, y: u.type === 'air' ? u.y - 22 : u.y,
            tgt: tgt, dmg: u.dmg, spd: 350, team: u.team,
            col: pcol, area: u.area
          });
        } else {
          // 近接攻撃の場合は即時ヒット
          if (u.area) {
            for (var k = 0; k < g.units.length; k++) {
              var e2 = g.units[k];
              if (e2.team !== u.team && !e2.dead && 
                  (u.targets === 'both' || u.targets === e2.type) &&
                  Math.hypot(e2.x - tgt.x, e2.y - tgt.y) < u.area)
                hitUnit(e2, u.dmg);
            }
            burst(tgt.x, tgt.y, '#f97316', 5);
          } else {
            hitUnit(tgt, u.dmg);
          }
        }
      }
      continue;
    }
  
    // 3. 攻撃対象がいない場合の移動ロジック
    var moveTargetX = targetBaseX;
    var moveTargetY = targetBaseY;
  
    if (u.targets !== 'base') {
      var nearestEnemy = null;
      var minDist = Infinity;
  
      for (var j = 0; j < g.units.length; j++) {
        var e = g.units[j];
        if (e.team === u.team || e.dead) continue;
        
        // 重要：自分の攻撃対象(u.targets)に合致する敵(e.type)しか追いかけない
        if (u.targets !== 'both' && u.targets !== e.type) continue;
  
        var d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < minDist) {
          minDist = d;
          nearestEnemy = e;
        }
      }
  
      // 「攻撃可能な敵」が拠点より近い場合のみ、その敵を追尾
      if (nearestEnemy && minDist < distToBase) {
        moveTargetX = nearestEnemy.x;
        moveTargetY = nearestEnemy.y;
      }
    }
  
    var dx = moveTargetX - u.x;
    var dy = moveTargetY - u.y;
    var angleDist = Math.hypot(dx, dy);
    if (angleDist > 2) {
      u.x += (dx / angleDist) * u.spd * dt;
      u.y += (dy / angleDist) * u.spd * dt;
    }
  }
  // Remove dead units
  g.units = g.units.filter(function(u) { return !u.dead; });

  // Tick particles
  for (var pi = 0; pi < parts.length; pi++) {
    var p = parts[pi];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
  }
  parts = parts.filter(function(p) { return p.life > 0; });

  // Win / lose
  if (g.eb.hp <= 0) { endGame(true);  return; }
  if (g.pb.hp <= 0) { endGame(false); return; }
}

function endGame(win) {
  if (!g.on) return;
  g.on = false;
  // Award persistent gold (home.js)
  var reward = null;
  if (typeof awardBattleGold === 'function') {
    reward = awardBattleGold(win, g.gold);
  }
  renderOverlay(win, reward);
}

// ── Render ────────────────────────────────────────────

function rrect(x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r);
  cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r);
  cx.arcTo(x, y, x + w, y, r);
  cx.closePath();
}

function drawBase(team, x, y, base) {
  cx.font = '40px serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(team === 'player' ? '🏯' : '🏰', x, y);

  var bw = 120, bh = 9, bx = x - 60, by = team === 'player' ? y + 30 : y - 39;
  cx.fillStyle = '#0c1627';
  rrect(bx, by, bw, bh, 4); cx.fill();
  var r = Math.max(0, base.hp / base.max);
  if (r > 0) {
    cx.fillStyle = r > .6 ? '#22c55e' : r > .3 ? '#f59e0b' : '#ef4444';
    rrect(bx, by, bw * r, bh, 4); cx.fill();
  }
  cx.fillStyle = 'rgba(255,255,255,.65)';
  cx.font = '8px sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(Math.ceil(base.hp) + ' / ' + base.max, x, by + bh / 2);
}

function drawUnit(u) {
  // Air units float higher on screen
  var drawY = u.type === 'air' ? u.y - 22 : u.y;

  // Flash on hit
  if (u.flash > 0) cx.globalAlpha = u.flash % 2 === 0 ? 0.2 : 1;

  // Shadow (fainter for air units)
  cx.fillStyle = 'rgba(0,0,0,1)';
  cx.globalAlpha = (u.type === 'air' ? 0.15 : 0.18) * (u.flash > 0 && u.flash % 2 === 0 ? 0.2 : 1);
  cx.beginPath();
  cx.ellipse(u.x, (u.type === 'air' ? u.y + 4 : u.y + 14) * 1,
    14 * u.size, 5 * u.size, 0, 0, Math.PI * 2);
  cx.fill();
  cx.globalAlpha = u.flash > 0 && u.flash % 2 === 0 ? 0.2 : 1;

  // Emoji
  cx.font = Math.round(25 * u.size) + 'px serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(u.e, u.x, drawY);
  cx.globalAlpha = 1;

  // HP bar
  var bw = Math.max(24, 28 * u.size), bh = 4;
  var bx = u.x - bw / 2, by = drawY - Math.max(19, 22 * u.size);
  cx.fillStyle = '#0c1627'; rrect(bx, by, bw, bh, 2); cx.fill();
  var hr = Math.max(0, u.hp / u.mhp);
  if (hr > 0) {
    cx.fillStyle = hr > .5 ? '#22c55e' : hr > .25 ? '#f59e0b' : '#ef4444';
    rrect(bx, by, bw * hr, bh, 2); cx.fill();
  }

  // Type badge for air units
  if (u.type === 'air') {
    cx.fillStyle = '#93c5fd';
    cx.font = '8px sans-serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('✈', u.x, drawY + Math.round(17 * u.size));
  }

  // Team dot (blue = player, red = enemy)
  cx.fillStyle = u.team === 'player' ? '#60a5fa' : '#f87171';
  cx.beginPath();
  cx.arc(u.x, u.y + Math.round(19 * u.size), 2.5, 0, Math.PI * 2);
  cx.fill();
}

function render() {
  cx.save();
  if (g.shake > 0)
    cx.translate((Math.random() - .5) * g.shake * .42, (Math.random() - .5) * g.shake * .42);

  // Background gradient
  var bg = cx.createLinearGradient(0, 0, 0, BH);
  bg.addColorStop(0, '#060b1e'); bg.addColorStop(.44, '#0f1f44'); bg.addColorStop(1, '#0d2016');
  cx.fillStyle = bg; cx.fillRect(0, 0, W, BH);

  // Stars
  cx.fillStyle = 'rgba(255,255,255,.5)';
  for (var i = 0; i < 28; i++) {
    cx.beginPath();
    cx.arc((i * 151 + 17) % W, (i * 89 + 11) % (BH * .36), .35 + (i % 3) * .4, 0, Math.PI * 2);
    cx.fill();
  }

  // Mid-field dashed line
  cx.save();
  cx.strokeStyle = 'rgba(255,255,255,.06)'; cx.lineWidth = 1.5; cx.setLineDash([10, 8]);
  cx.beginPath(); cx.moveTo(0, BH / 2); cx.lineTo(W, BH / 2); cx.stroke();
  cx.setLineDash([]); cx.restore();

// --- ③ プレビュー表示（ゴーストとガイドライン/範囲円） ---
if (g.selectedUnit && mouseX >= 0) {
  var pd = PLAYER_UNITS[g.selectedUnit]; // 選択中のユニット/スペルデータ
  cx.save();

  if (pd.type === 'spell') {
    // 【スペルの場合】全方位に発動できるため、マウス位置に範囲円を表示
    cx.beginPath();
    cx.arc(mouseX, mouseY, pd.area, 0, Math.PI * 2); // unit.jsのareaを使用
    cx.fillStyle = 'rgba(251, 191, 36, 0.2)'; // 薄い黄色
    cx.fill();
    cx.strokeStyle = '#fbbf24';
    cx.setLineDash([5, 5]); // 点線
    cx.stroke();

    // スペルのエモジをマウス位置に表示
    cx.font = '26px serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(pd.e, mouseX, mouseY);
  } 
  else {
    // 【ユニットの場合】配置ライン（既存のロジック）
    var ghostY = pd.type === 'air' ? PSY - 22 : PSY;
    cx.globalAlpha = 0.42;
    cx.strokeStyle = '#fbbf24';
    cx.setLineDash([4, 4]);
    cx.beginPath(); 
    cx.moveTo(mouseX, PSY - 40); 
    cx.lineTo(mouseX, PSY + 40); 
    cx.stroke();

    // ユニットのエモジを表示
    cx.font = Math.round(26 * (pd.size || 1.0)) + 'px serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(pd.e, mouseX, ghostY);
  }
  cx.restore();
}

  // Bases
  drawBase('enemy',  W / 2, EBY, g.eb);
  drawBase('player', W / 2, PBY, g.pb);

  // Units — Y-sorted for pseudo-depth
  var sorted = g.units.slice().sort(function(a, b) { return a.y - b.y; });
  for (var si = 0; si < sorted.length; si++) drawUnit(sorted[si]);

// 弾(Projectiles)の描画
for (var pi = 0; pi < g.projectiles.length; pi++) {
  var p = g.projectiles[pi];
  cx.fillStyle = p.col;
  cx.beginPath();
  cx.arc(p.x, p.y, p.type === 'base' ? 5 : 3, 0, Math.PI * 2);
  cx.fill();
  
  // 弾の軌跡（スピード感）
  cx.strokeStyle = p.col;
  cx.globalAlpha = 0.6;
  cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(p.x, p.y);
  var dx = p.tgt.x - p.x, dy = p.tgt.y - p.y;
  var a = Math.atan2(dy, dx);
  cx.lineTo(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12);
  cx.stroke();
  cx.globalAlpha = 1.0;
}

  // Particles
  for (var pi = 0; pi < parts.length; pi++) {
    var p = parts[pi];
    cx.globalAlpha = p.life / p.max;
    cx.fillStyle = p.col;
    cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.fill();
  }
  cx.globalAlpha = 1;
  cx.restore();

  // HUD sync
  var mm = Math.floor(g.t / 60), ss = Math.floor(g.t % 60);
  document.getElementById('timer').textContent =
    (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  updGoldUI();
  updateDeckUI();
}

// ── RAF loop ──────────────────────────────────────────

function loop(ts) {
  var dt = Math.min((ts - prev_) / 1000, 0.05);
  prev_ = ts;
  if (g && g.on) update(dt);
  if (g) render();
  raf_ = requestAnimationFrame(loop);
}

// (game starts via startBattle() in home.js)
