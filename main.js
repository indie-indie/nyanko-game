// main.js — Game loop, state, update, render, input

var g, uid_, parts, raf_, prev_;
var mouseX = -1, mouseY = -1;
var canvas, cx;

// ── 画像キャッシュ ─────────────────────────────────────
var IMG_CACHE = {};
function getImg(src) {
  if (!IMG_CACHE[src]) {
    var img = new Image();
    img.src = src;
    IMG_CACHE[src] = img;
  }
  return IMG_CACHE[src];
}

// ── 配置ゾーンY範囲 ───────────────────────────────────
function getPlacementYRange(d) {
  if (d.type === 'spell') return { minY: ESY + 15, maxY: PBY - 15 };
  if (d.zone === 'all')   return { minY: ESY + 15, maxY: PSY + 30 };
  return { minY: BH / 2,  maxY: PSY + 30 };
}

// ── Init ─────────────────────────────────────────────
function startGame(stageConfig) {
  document.getElementById('ov').style.display = 'none';
  uid_  = 0;
  parts = [];

  spawnedEmergency50 = false;
  spawnedEmergency20 = false;

  var stage = stageConfig || STAGES_CONFIG[0];
  var base  = SAVE.baseLevels || {};
  var initRegen = 5   + (base.regen       || 0) * 0.5;
  var initMaxG  = 100 + (base.maxGold     || 0) * 20;
  var pbHp      = 1000 + (base.hp         || 0) * 200;
  var pbAtk     = 20   + (base.atk        || 0) * 8;
  var cdMult    = Math.max(0.5, 1.0 - (base.cdReduction || 0) * 0.05);

  var ebHp = stage.enemyBaseHP || 1000;

  g = {
    on: true, t: 0,
    pb: { hp:pbHp, max:pbHp, cd:0, ar:1.2, dmg:pbAtk, rng:150 },
    eb: { hp:ebHp, max:ebHp },
    units: [],
    projectiles: [],
    shockwaves:  [],
    gold: 0, maxGold: initMaxG, regen: initRegen,
    upgradeCost: Math.round(initMaxG * 0.7),
    unitCDs: {},
    selectedUnit: null,
    eTimer: 0, eNext: 4.5,
    shake: 0,
    stageMult: stage.enemyMult || 1.0,
    cdMult: cdMult,
    stageWaves: stage.waves || [],
    emergencySpawns: (stage.emergencySpawns || []).map(function(es) {
      return { hpPercent: es.hpPercent, spawns: es.spawns, triggered: false };
    })
  };

  PLAYER_DECK.forEach(function(id) {
    if (id) g.unitCDs[id] = 0;
  });

  if (!canvas) {
    canvas = document.getElementById('gc');
    cx     = canvas.getContext('2d');
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      var t = e.touches[0];
      mouseX = (t.clientX - r.left) * (canvas.width  / r.width);
      mouseY = (t.clientY - r.top)  * (canvas.height / r.height);
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      var t = e.touches[0];
      mouseX = (t.clientX - r.left) * (canvas.width  / r.width);
      mouseY = (t.clientY - r.top)  * (canvas.height / r.height);
    }, { passive: false });

    // touchend で配置（タップ・ドラッグ離しどちらも対応）
    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (e.changedTouches && e.changedTouches[0]) {
        var r = canvas.getBoundingClientRect();
        var t = e.changedTouches[0];
        mouseX = (t.clientX - r.left) * (canvas.width  / r.width);
        mouseY = (t.clientY - r.top)  * (canvas.height / r.height);
      }
      handleCanvasClick(e);
    }, { passive: false });
  }

  document.getElementById('upbtn').onclick = function() {
    if (!g || g.gold < g.upgradeCost) return;
    g.gold        -= g.upgradeCost;
    g.maxGold      = Math.round(g.maxGold * 1.5);
    g.upgradeCost  = Math.round(g.upgradeCost * 1.4);
    updGoldUI();
  };

  buildDeck();
  updGoldUI();
  cancelAnimationFrame(raf_);
  prev_ = performance.now();
  raf_  = requestAnimationFrame(loop);
}

// ── Input ─────────────────────────────────────────────
function handleCanvasClick(e) {
  if (!g || !g.on || !g.selectedUnit) return;
  var rect   = canvas.getBoundingClientRect();
  var scaleX = canvas.width  / rect.width;
  var scaleY = canvas.height / rect.height;
  var clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
  var clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
  var x = (clientX - rect.left) * scaleX;
  var y = (clientY - rect.top)  * scaleY;

  var id = g.selectedUnit;
  var d  = PLAYER_UNITS[id];
  if (g.gold < d.cost) return;

  var yr = getPlacementYRange(d);
  x = Math.max(15, Math.min(x, W - 15));
  y = Math.max(yr.minY, Math.min(y, yr.maxY));

  if (d.type === 'spell') {
    castSpell(id, x, y);
    g.gold -= d.cost;
    g.unitCDs[id] = d.cd * (g.cdMult || 1.0);
    g.selectedUnit = null;
    document.getElementById('phint').textContent = '';
    return;
  }

  var mult    = (typeof getMultiplier === 'function') ? getMultiplier(id) : 1.0;
  var scaledD = {
    n:d.n, e:d.e, img:d.img||null, hp:Math.round(d.hp*mult), dmg:Math.round(d.dmg*mult),
    spd:d.spd, rng:d.rng, ar:d.ar, type:d.type, targets:d.targets,
    isBase:d.isBase||false, size:d.size, area:d.area||0, heal:d.heal||0, rew:d.rew||1, cd:d.cd
  };
  g.units.push(mkUnit(id, 'player', x, y, scaledD));
  g.gold -= d.cost;
  g.unitCDs[id] = d.cd * (g.cdMult || 1.0);
  g.selectedUnit = null;
  document.getElementById('phint').textContent = '';
}

function handleMouseMove(e) {
  var rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (canvas.width  / rect.width);
  mouseY = (e.clientY - rect.top)  * (canvas.height / rect.height);
}

// ── Spell ─────────────────────────────────────────────
function castSpell(id, x, y) {
  var d   = PLAYER_UNITS[id];
  var col = d.effect === 'damage' ? '#ff4400' : d.effect === 'heal' ? '#00ff88' : '#00ccff';
  for (var i = 0; i < 20; i++) {
    var ang  = Math.random() * Math.PI * 2;
    var dist = Math.random() * d.area;
    parts.push({ x:x+Math.cos(ang)*dist, y:y+Math.sin(ang)*dist,
      vx:Math.cos(ang)*2, vy:Math.sin(ang)*2, life:30, max:52, col:col, r:2+Math.random()*2 });
  }
  g.units.forEach(function(u) {
    if (u.dead) return;
    if (Math.hypot(u.x-x, u.y-y) > d.area) return;
    if (d.effect === 'damage' && u.team === 'enemy') {
      hitUnit(u, d.dmg);
    } else if (d.effect === 'heal' && u.team === 'player') {
      u.hp = Math.min(u.mhp, u.hp + d.dmg);
      u.flash = 5;
    } else if (d.effect === 'stun' && u.team === 'enemy') {
      u.stuntimer = (u.stuntimer || 0) + d.duration;
    }
  });
  if (d.effect === 'damage' && Math.abs(y - EBY) < d.area) {
    g.eb.hp = Math.max(0, g.eb.hp - d.dmg * 0.5);
  }
}

// ── 衝撃波エンジン ─────────────────────────────────────
function triggerShockwave(g, x, y, swc) {
  g.shockwaves.push({ x:x, y:y, r:0, maxR:swc.radius, life:1.0, speed:400 });
  g.shake = Math.max(g.shake, 20);
  for (var i = 0; i < g.units.length; i++) {
    var u = g.units[i];
    if (u.team !== 'player' || u.dead) continue;
    var dx = u.x - x, dy = u.y - y;
    var dist = Math.hypot(dx, dy);
    if (dist >= swc.radius || dist < 1) continue;
    var falloff = 1.0 - dist / swc.radius;
    var nx = dx / dist, ny = dy / dist;
    u.knockVX += nx * swc.force * falloff;
    u.knockVY += ny * swc.force * falloff;
    if (swc.damage > 0) hitUnit(u, Math.round(swc.damage * falloff));
  }
}

// ── Combat helpers ────────────────────────────────────
// targets:'base' のユニット：まず射程内の isBase 敵を探す。なければ null（→拠点攻撃へ）。
// それ以外のユニット：type マッチする最近敵を探す。isBase 敵は type 問わず対象に含む。
function findTarget(u) {
  if (u.targets === 'base') {
    // isBase:true の敵ユニットのみを対象とする
    var best = null, bd = Infinity;
    for (var i = 0; i < g.units.length; i++) {
      var e = g.units[i];
      if (e.team === u.team || e.dead || !e.isBase) continue;
      var d1 = Math.hypot(u.x - e.x, u.y - e.y);
      if (d1 < u.rng && d1 < bd) { bd = d1; best = e; }
    }
    u.currentTarget = best;
    return best;
  }

  // 既存ターゲットが有効ならそのまま使う（isBase 敵はタイプ問わず許容）
  if (u.currentTarget && !u.currentTarget.dead) {
    var d0 = Math.hypot(u.x - u.currentTarget.x, u.y - u.currentTarget.y);
    var typeOk = u.targets === 'both'
      || u.targets === u.currentTarget.type
      || u.currentTarget.isBase;
    if (d0 < u.rng && typeOk) return u.currentTarget;
  }

  var best = null, bd = Infinity;
  for (var i = 0; i < g.units.length; i++) {
    var e = g.units[i];
    if (e.team === u.team || e.dead) continue;
    // isBase 敵はタイプ問わず誰でも攻撃可。それ以外は通常の type チェック。
    if (!e.isBase && u.targets !== 'both' && u.targets !== e.type) continue;
    var d1 = Math.hypot(u.x - e.x, u.y - e.y);
    if (d1 < u.rng && d1 < bd) { bd = d1; best = e; }
  }
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
      g.gold = Math.min(g.gold + tgt.rew, g.maxGold);
      var swc = (typeof SHOCKWAVE_CONFIG !== 'undefined') ? SHOCKWAVE_CONFIG[tgt.defId] : null;
      if (swc && swc.trigger === 'death') triggerShockwave(g, tgt.x, tgt.y, swc);
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
      life:30+(Math.random()*22|0), max:52, r:2+Math.random()*2.5 });
  }
}

// ── Update ────────────────────────────────────────────
function update(dt) {
  g.t    += dt;
  g.gold  = Math.min(g.gold + g.regen * dt, g.maxGold);
  g.shake = Math.max(0, g.shake - 1);

  PLAYER_DECK.forEach(function(id) {
    if (id && g.unitCDs[id] > 0) g.unitCDs[id] = Math.max(0, g.unitCDs[id] - dt);
  });
  if (g.selectedUnit && onCd(g.selectedUnit)) {
    g.selectedUnit = null;
    document.getElementById('phint').textContent = '';
  }

  updateWave(g, dt);

  g.pb.cd = Math.max(0, g.pb.cd - dt);
  if (g.pb.cd <= 0) {
    var bestE = null, bestED = Infinity;
    for (var bi = 0; bi < g.units.length; bi++) {
      var eu = g.units[bi];
      if (eu.team === 'enemy' && !eu.dead) {
        var ed = Math.hypot(eu.x - W/2, eu.y - PBY);
        if (ed < g.pb.rng && ed < bestED) { bestED = ed; bestE = eu; }
      }
    }
    if (bestE) {
      g.pb.cd = g.pb.ar;
      g.projectiles.push({ x:W/2, y:PBY-30, tgt:bestE, dmg:g.pb.dmg,
        spd:400, team:'player', col:'#fbbf24', type:'base' });
    }
  }

  // プロジェクタイル更新
  for (var qi = 0; qi < g.projectiles.length; qi++) {
    var proj = g.projectiles[qi];
    if (proj.tgt.dead) { proj.dead = true; continue; }
    var pdx = proj.tgt.x - proj.x, pdy = proj.tgt.y - proj.y;
    var pdst = Math.hypot(pdx, pdy), pmv = proj.spd * dt;
    if (pdst <= pmv) {
      if (proj.tgt.isBase) {
        hitBase(proj.tgt.baseIdx, proj.dmg);
        if (proj.area) {
          burst(proj.tgt.x, proj.tgt.y, '#f97316', 5);
          for (var pk = 0; pk < g.units.length; pk++) {
            var ae = g.units[pk];
            if (ae.team !== proj.team && !ae.dead &&
                Math.hypot(ae.x - proj.tgt.x, ae.y - proj.tgt.y) < proj.area) hitUnit(ae, proj.dmg);
          }
        }
      } else {
        if (proj.area) {
          for (var pk = 0; pk < g.units.length; pk++) {
            var ae = g.units[pk];
            if (ae.team !== proj.team && !ae.dead &&
                Math.hypot(ae.x - proj.tgt.x, ae.y - proj.tgt.y) < proj.area) hitUnit(ae, proj.dmg);
          }
          burst(proj.tgt.x, proj.tgt.y, '#f97316', 5);
        } else {
          hitUnit(proj.tgt, proj.dmg);
        }
      }
      proj.dead = true;
    } else {
      proj.x += (pdx / pdst) * pmv;
      proj.y += (pdy / pdst) * pmv;
    }
  }
  g.projectiles = g.projectiles.filter(function(p) { return !p.dead; });

  // 衝撃波ビジュアル更新
  for (var si = g.shockwaves.length - 1; si >= 0; si--) {
    var sw = g.shockwaves[si];
    sw.r    += sw.speed * dt;
    sw.life  = Math.max(0, 1.0 - sw.r / sw.maxR);
    if (sw.r >= sw.maxR) g.shockwaves.splice(si, 1);
  }

  // ユニットAI
  for (var i = 0; i < g.units.length; i++) {
    var u = g.units[i];
    if (u.dead) continue;
    u.flash = Math.max(0, u.flash - 1);
    u.cd    = Math.max(0, u.cd   - dt);

    // ノックバック
    if (u.knockVX !== 0 || u.knockVY !== 0) {
      u.x += u.knockVX * dt;
      u.y += u.knockVY * dt;
      u.x = Math.max(10, Math.min(W - 10, u.x));
      u.y = Math.max(ESY, Math.min(PBY, u.y));
      var decay = Math.pow(0.002, dt);
      u.knockVX *= decay;
      u.knockVY *= decay;
      if (Math.abs(u.knockVX) < 2) u.knockVX = 0;
      if (Math.abs(u.knockVY) < 2) u.knockVY = 0;
      continue;
    }

    // スタン
    if (u.stuntimer > 0) {
      u.stuntimer = Math.max(0, u.stuntimer - dt);
      continue;
    }

    // 敵ユニット：定期衝撃波
    if (u.team === 'enemy') {
      var swcE = (typeof SHOCKWAVE_CONFIG !== 'undefined') ? SHOCKWAVE_CONFIG[u.defId] : null;
      if (swcE && swcE.trigger === 'interval') {
        u.swTimer = (u.swTimer || 0) + dt;
        if (u.swTimer >= swcE.interval) {
          u.swTimer = 0;
          triggerShockwave(g, u.x, u.y, swcE);
        }
      }
    }

    var baseIdx    = (u.team === 'player') ? 'enemy' : 'player';
    var tBaseX     = W / 2;
    var tBaseY     = (u.team === 'player') ? EBY : PBY;
    var distToBase = Math.hypot(tBaseX - u.x, tBaseY - u.y);

    // 拠点攻撃
    var attackRange = Math.max(55, u.rng);
    if (distToBase <= attackRange) {
      if (u.cd <= 0) {
        u.cd = u.ar;
        if (u.rng > 55) {
          var pcol = u.team === 'player' ? '#93c5fd' : '#fca5a5';
          var dummyTgt = { x: tBaseX, y: tBaseY, dead: false, isBase: true, baseIdx: baseIdx };
          g.projectiles.push({ x:u.x, y:u.type==='air'?u.y-22:u.y,
            tgt:dummyTgt, dmg:u.dmg, spd:350, team:u.team, col:pcol, area:u.area });
        } else {
          hitBase(baseIdx, u.dmg);
        }
      }
      continue;
    }

    // ユニット攻撃
    var tgt = findTarget(u);
    if (tgt) {
      if (u.cd <= 0) {
        u.cd = u.ar;
        if (u.rng > 55) {
          var pcol = u.team === 'player' ? '#93c5fd' : '#fca5a5';
          g.projectiles.push({ x:u.x, y:u.type==='air'?u.y-22:u.y,
            tgt:tgt, dmg:u.dmg, spd:350, team:u.team, col:pcol, area:u.area });
        } else {
          if (u.area) {
            for (var ak = 0; ak < g.units.length; ak++) {
              var ae2 = g.units[ak];
              if (ae2.team!==u.team && !ae2.dead &&
                  (u.targets==='both'||u.targets===ae2.type||ae2.isBase) &&
                  Math.hypot(ae2.x-tgt.x,ae2.y-tgt.y)<u.area) hitUnit(ae2,u.dmg);
            }
            burst(tgt.x, tgt.y, '#f97316', 5);
          } else { hitUnit(tgt, u.dmg); }
        }
      }
      continue;
    }

    // 移動
    var mtX = tBaseX, mtY = tBaseY;
    if (u.targets === 'base') {
      // targets:'base' ユニット：isBase 敵が近ければそちらへ向かう
      var nearBase = null, nearBaseD = distToBase;
      for (var j = 0; j < g.units.length; j++) {
        var ne = g.units[j];
        if (ne.team === u.team || ne.dead || !ne.isBase) continue;
        var nd = Math.hypot(ne.x - u.x, ne.y - u.y);
        if (nd < nearBaseD) { nearBaseD = nd; nearBase = ne; }
      }
      if (nearBase) { mtX = nearBase.x; mtY = nearBase.y; }
    } else {
      // 通常ユニット：最近の敵に向かう（isBase 敵はタイプ問わず追う）
      var nearE = null, nearD = Infinity;
      for (var j = 0; j < g.units.length; j++) {
        var ne = g.units[j];
        if (ne.team===u.team||ne.dead) continue;
        if (!ne.isBase && u.targets!=='both' && u.targets!==ne.type) continue;
        var nd = Math.hypot(ne.x-u.x, ne.y-u.y);
        if (nd < nearD) { nearD=nd; nearE=ne; }
      }
      if (nearE && nearD < distToBase) { mtX=nearE.x; mtY=nearE.y; }
    }
    var mdx = mtX-u.x, mdy = mtY-u.y, mdst = Math.hypot(mdx,mdy);
    if (mdst > 2) { u.x += (mdx/mdst)*u.spd*dt; u.y += (mdy/mdst)*u.spd*dt; }
  }

  g.units = g.units.filter(function(u) { return !u.dead; });

  for (var pi = 0; pi < parts.length; pi++) {
    var p = parts[pi];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
  }
  parts = parts.filter(function(p) { return p.life > 0; });

  if (g.eb.hp <= 0) { endGame(true);  return; }
  if (g.pb.hp <= 0) { endGame(false); return; }
}

function endGame(win) {
  if (!g.on) return;
  g.on = false;
  if (win && typeof recordStageClear === 'function' && typeof selectedStage !== 'undefined' && selectedStage) {
    recordStageClear(selectedStage.id, g.t);
  }
  var reward = null;
  if (typeof awardBattleGold === 'function') reward = awardBattleGold(win, g.gold);
  renderOverlay(win, reward);
}

// ── Render ────────────────────────────────────────────
function rrect(x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w/2, h/2);
  cx.beginPath();
  cx.moveTo(x+r, y);
  cx.arcTo(x+w,y, x+w,y+h, r); cx.arcTo(x+w,y+h, x,y+h, r);
  cx.arcTo(x,y+h, x,y, r);     cx.arcTo(x,y, x+w,y, r);
  cx.closePath();
}

function drawBase(team, x, y, base) {
  cx.font = '40px serif'; cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillText(team==='player'?'🏯':'🏰', x, y);
  var bw=120, bh=9, bx=x-60, by=team==='player'?y+30:y-39;
  cx.fillStyle='#0c1627'; rrect(bx,by,bw,bh,4); cx.fill();
  var r=Math.max(0,base.hp/base.max);
  if(r>0){ cx.fillStyle=r>.6?'#22c55e':r>.3?'#f59e0b':'#ef4444'; rrect(bx,by,bw*r,bh,4); cx.fill(); }
  cx.fillStyle='rgba(255,255,255,.65)'; cx.font='8px sans-serif';
  cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillText(Math.ceil(base.hp)+' / '+base.max, x, by+bh/2);
}

// ユニットアイコンを描画（img があれば画像、なければ絵文字）
function drawUnitIcon(u, x, y) {
  var sz = Math.round(25 * u.size);
  if (u.img) {
    var img = getImg(u.img);
    if (img.complete && img.naturalWidth > 0) {
      var hw = sz * 0.9;
      cx.drawImage(img, x - hw, y - hw, hw * 2, hw * 2);
      return;
    }
  }
  cx.font = sz + 'px serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(u.e, x, y);
}

function drawUnit(u) {
  var drawY = u.type==='air' ? u.y-22 : u.y;
  var alpha = (u.flash>0&&u.flash%2===0) ? 0.2 : 1;
  cx.globalAlpha=(u.type==='air'?0.15:0.18)*alpha;
  cx.fillStyle='rgba(0,0,0,1)';
  cx.beginPath(); cx.ellipse(u.x,(u.type==='air'?u.y+4:u.y+14),14*u.size,5*u.size,0,0,Math.PI*2); cx.fill();
  cx.globalAlpha=alpha;
  drawUnitIcon(u, u.x, drawY);
  cx.globalAlpha=1;
  var bw=Math.max(24,28*u.size), bh=4, bx=u.x-bw/2, by=drawY-Math.max(19,22*u.size);
  cx.fillStyle='#0c1627'; rrect(bx,by,bw,bh,2); cx.fill();
  var hr=Math.max(0,u.hp/u.mhp);
  if(hr>0){ cx.fillStyle=hr>.5?'#22c55e':hr>.25?'#f59e0b':'#ef4444'; rrect(bx,by,bw*hr,bh,2); cx.fill(); }
  if(u.type==='air'){ cx.fillStyle='#93c5fd'; cx.font='8px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('✈',u.x,drawY+Math.round(17*u.size)); }
  if(u.stuntimer>0){ cx.fillStyle='#00ccff'; cx.font='11px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('❄',u.x,by-7); }
  // isBase ユニット：金枠でアイコン表示
  if(u.isBase){ cx.strokeStyle='#fbbf24'; cx.lineWidth=1.5; cx.globalAlpha=0.6; cx.beginPath(); cx.arc(u.x,drawY,Math.max(16,14*u.size),0,Math.PI*2); cx.stroke(); cx.globalAlpha=1; }
  cx.fillStyle=u.team==='player'?'#60a5fa':'#f87171';
  cx.beginPath(); cx.arc(u.x,u.y+Math.round(19*u.size),2.5,0,Math.PI*2); cx.fill();
}

function render() {
  cx.save();
  if (g.shake > 0)
    cx.translate((Math.random()-.5)*g.shake*.42, (Math.random()-.5)*g.shake*.42);

  var bg = cx.createLinearGradient(0,0,0,BH);
  bg.addColorStop(0,'#060b1e'); bg.addColorStop(.44,'#0f1f44'); bg.addColorStop(1,'#0d2016');
  cx.fillStyle=bg; cx.fillRect(0,0,W,BH);

  cx.fillStyle='rgba(255,255,255,.5)';
  for(var i=0;i<28;i++){ cx.beginPath(); cx.arc((i*151+17)%W,(i*89+11)%(BH*.36),.35+(i%3)*.4,0,Math.PI*2); cx.fill(); }

  cx.save();
  cx.strokeStyle='rgba(255,255,255,.06)'; cx.lineWidth=1.5; cx.setLineDash([10,8]);
  cx.beginPath(); cx.moveTo(0,BH/2); cx.lineTo(W,BH/2); cx.stroke();
  cx.setLineDash([]); cx.restore();

  // 衝撃波リング
  for (var si = 0; si < g.shockwaves.length; si++) {
    var sw = g.shockwaves[si];
    cx.save();
    cx.globalAlpha = sw.life * 0.85; cx.strokeStyle = '#ff6600'; cx.lineWidth = 5 * sw.life;
    cx.beginPath(); cx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); cx.stroke();
    cx.globalAlpha = sw.life * 0.4; cx.strokeStyle = '#ffffff'; cx.lineWidth = 2 * sw.life;
    if (sw.r > 12) { cx.beginPath(); cx.arc(sw.x, sw.y, sw.r - 10, 0, Math.PI * 2); cx.stroke(); }
    cx.globalAlpha = sw.life * 0.06; cx.fillStyle = '#ff4400';
    cx.beginPath(); cx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); cx.fill();
    cx.restore();
  }

  // 配置プレビュー
  if (g.selectedUnit && mouseX >= 0 && mouseY >= 0) {
    var pd = PLAYER_UNITS[g.selectedUnit];
    var yr = getPlacementYRange(pd);
    cx.save();
    if (pd.type === 'spell') {
      var sy = Math.max(yr.minY, Math.min(mouseY, yr.maxY));
      cx.fillStyle='rgba(251,191,36,0.04)'; cx.fillRect(0,yr.minY,W,yr.maxY-yr.minY);
      cx.beginPath(); cx.arc(mouseX,sy,pd.area,0,Math.PI*2);
      cx.fillStyle='rgba(251,191,36,0.15)'; cx.fill();
      cx.strokeStyle='#fbbf24'; cx.lineWidth=1.5; cx.setLineDash([5,5]); cx.stroke(); cx.setLineDash([]);
      cx.font='26px serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(pd.e,mouseX,sy);
    } else {
      var gy = Math.max(yr.minY, Math.min(mouseY, yr.maxY));
      var ghostY = pd.type==='air' ? gy-22 : gy;
      cx.fillStyle='rgba(96,165,250,0.04)'; cx.fillRect(0,yr.minY,W,yr.maxY-yr.minY);
      cx.strokeStyle='rgba(96,165,250,0.3)'; cx.lineWidth=1; cx.setLineDash([6,4]);
      cx.beginPath(); cx.moveTo(0,yr.minY); cx.lineTo(W,yr.minY); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=0.42; cx.strokeStyle='#fbbf24'; cx.lineWidth=1.5; cx.setLineDash([4,4]);
      cx.beginPath(); cx.moveTo(mouseX,gy-35); cx.lineTo(mouseX,gy+35); cx.stroke(); cx.setLineDash([]);
      cx.font=Math.round(26*(pd.size||1.0))+'px serif'; cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText(pd.e, mouseX, ghostY);
    }
    cx.restore();
  }

  drawBase('enemy',  W/2, EBY, g.eb);
  drawBase('player', W/2, PBY, g.pb);

  var sorted = g.units.slice().sort(function(a,b){return a.y-b.y;});
  for (var si2 = 0; si2 < sorted.length; si2++) drawUnit(sorted[si2]);

  for (var qi = 0; qi < g.projectiles.length; qi++) {
    var proj = g.projectiles[qi];
    cx.fillStyle=proj.col; cx.beginPath(); cx.arc(proj.x,proj.y,proj.type==='base'?5:3,0,Math.PI*2); cx.fill();
    var pdx2=proj.tgt.x-proj.x, pdy2=proj.tgt.y-proj.y;
    var pa=Math.atan2(pdy2,pdx2);
    cx.strokeStyle=proj.col; cx.globalAlpha=0.6; cx.lineWidth=2;
    cx.beginPath(); cx.moveTo(proj.x,proj.y);
    cx.lineTo(proj.x-Math.cos(pa)*12, proj.y-Math.sin(pa)*12); cx.stroke(); cx.globalAlpha=1;
  }

  for (var pi = 0; pi < parts.length; pi++) {
    var p = parts[pi];
    cx.globalAlpha=p.life/p.max; cx.fillStyle=p.col;
    cx.beginPath(); cx.arc(p.x,p.y,p.r,0,Math.PI*2); cx.fill();
  }
  cx.globalAlpha=1;
  cx.restore();

  var mm=Math.floor(g.t/60), ss=Math.floor(g.t%60);
  document.getElementById('timer').textContent=(mm<10?'0':'')+mm+':'+(ss<10?'0':'')+ss;
  updGoldUI();
  updateDeckUI();
}

// ── Utils ─────────────────────────────────────────────
function onCd(id) { return (g.unitCDs[id] || 0) > 0.05; }

function loop(ts) {
  var dt = Math.min((ts - prev_) / 1000, 0.05);
  prev_ = ts;
  if (g && g.on) update(dt);
  if (g) render();
  raf_ = requestAnimationFrame(loop);
}
