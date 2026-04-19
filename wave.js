// wave.js — Wave definitions, shockwave config & enemy spawn logic
// ⚠ このファイルは Wave Editor で自動生成されました

var spawnedEmergency50 = false;
var spawnedEmergency20 = false;

// ── 衝撃波設定（Wave Editor で編集・エクスポート）──
var SHOCKWAVE_CONFIG = {
  ironbot: { trigger:'spawn', radius:200, force:150 },
  warlock: { trigger:'interval', radius:200, force:140, interval:10, damage:20 }
};

// ── ウェーブ定義 ─────────────────────────────────
var WAVES = [
  { till:20, pool:[{id:'slime',w:7}, {id:'gremlin',w:4}, {id:'goblin',w:2}], intv:[0.8, 3.3] },
  { till:40, pool:[{id:'slime',w:3}, {id:'gremlin',w:5}, {id:'goblin',w:5}, {id:'shade',w:5}], intv:[0.8, 3.3] },
  { till:60, pool:[{id:'gremlin',w:2}, {id:'goblin',w:2}, {id:'orc',w:5}, {id:'ironbot',w:2}, {id:'shade',w:2}], intv:[1.3, 3.3] },
  { till:80, pool:[{id:'orc',w:3}, {id:'garpy',w:8}, {id:'lancer',w:3}], intv:[1.3, 1.3] },
  { till:100, pool:[{id:'ironbot',w:5}, {id:'warlock',w:3}, {id:'lancer',w:5}], intv:[1.8, 2.8] },
  { till:120, pool:[{id:'shade',w:2}, {id:'orc',w:2}, {id:'ironbot',w:2}, {id:'garpy',w:8}, {id:'warlock',w:2}, {id:'lancer',w:5}], intv:[2, 3.5] },
  { till:1e9, pool:[{id:'ironbot',w:5}, {id:'warlock',w:5}, {id:'garpy',w:5}], intv:[0.3, 0.3] }
];

function getPhase(t) {
  for (var i = 0; i < WAVES.length; i++) {
    if (t < WAVES[i].till) return WAVES[i];
  }
  return WAVES[WAVES.length - 1];
}

function wRand(pool) {
  var s = 0;
  for (var i = 0; i < pool.length; i++) s += pool[i].w;
  var r = Math.random() * s;
  for (var i = 0; i < pool.length; i++) {
    r -= pool[i].w;
    if (r <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

function updateWave(g, dt) {
  var ph = getPhase(g.t);
  var hpPercent = g.eb.hp / g.eb.max;
  if (hpPercent <= 0.5 && !spawnedEmergency50) {
    for (var i = 0; i < 3; i++) spawnEnemy(g, 'garpy');
    spawnedEmergency50 = true;
  }
  if (hpPercent <= 0.2 && !spawnedEmergency20) {
    spawnEnemy(g, 'ironbot');
    spawnEnemy(g, 'warlock');
    spawnEnemy(g, 'warlock');
    spawnedEmergency20 = true;
  }
  g.eTimer += dt;
  if (g.eTimer >= g.eNext) {
    g.eTimer = 0;
    g.eNext = ph.intv[0] + Math.random() * (ph.intv[1] - ph.intv[0]);
    spawnEnemy(g, wRand(ph.pool));
  }
}

function spawnEnemy(g, defId) {
  var d = ENEMY_UNITS[defId];
  if (!d) return;
  var mult = g.stageMult || 1.0;
  var scaledD = {
    n:d.n, e:d.e, hp:Math.round(d.hp*mult), dmg:Math.round(d.dmg*mult),
    spd:d.spd, rng:d.rng, ar:d.ar, type:d.type, targets:d.targets,
    size:d.size, area:d.area||0, heal:d.heal||0, rew:d.rew||1
  };
  var margin = 28;
  var x = margin + Math.random() * (W - margin * 2);
  var u = mkUnit(defId, 'enemy', x, ESY, scaledD);
  g.units.push(u);
  // スポーン時衝撃波
  var swc = SHOCKWAVE_CONFIG[defId];
  if (swc && swc.trigger === 'spawn' && typeof triggerShockwave === 'function') {
    triggerShockwave(g, x, ESY, swc);
  }
}