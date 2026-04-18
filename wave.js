// wave.js — Wave definitions & enemy spawn logic
var spawnedEmergency50 = false;
var spawnedEmergency20 = false;
// Each wave: active until `till` seconds, weighted enemy pool, spawn interval range
// wave.js — 戦略的なウェーブ構成
var WAVES = [
  { till:20,  pool:[{id:'slime',w:6}, {id:'gremlin',w:2}], intv:[3.5, 4.5] },

  { till:40,  pool:[{id:'slime',w:3}, {id:'gremlin',w:4}, {id:'shade',w:3}], intv:[3, 4] },

  { till:60, pool:[{id:'gremlin',w:3}, {id:'orc',w:3}, {id:'ironbot',w:2}], intv:[4, 6] },

  { till:80, pool:[{id:'orc',w:2}, {id:'garpy',w:5}, {id:'lancer',w:3}], intv:[3.5, 5] },

  { till:100, pool:[{id:'ironbot',w:2}, {id:'warlock',w:3}, {id:'lancer',w:5}], intv:[3, 4.5] },

  { till:120, pool:[
    {id:'shade',w:3}, {id:'orc',w:4}, {id:'ironbot',w:2}, 
    {id:'garpy',w:4}, {id:'warlock',w:2}, {id:'lancer',w:3}
  ], intv:[2, 3.5] },

  { till:1e9, pool:[
    {id:'ironbot',w:4}, {id:'orc',w:4}, {id:'warlock',w:3}, 
    {id:'garpy',w:5}, {id:'lancer',w:4}
  ], intv:[1.5, 2.5] }
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

// Called every frame with the live game state
function updateWave(g, dt) {
  var ph = getPhase(g.t);
  
  // --- 防衛トリガー：拠点のHP割合を計算 ---
  var hpPercent = g.eb.hp / g.eb.max; // 敵拠点のHP割合 (0.0 ～ 1.0)

  // 1. HPが50%以下になった時、一気にガーピー（空中）を3体放出
  if (hpPercent <= 0.5 && !spawnedEmergency50) {
    for(var i=0; i<3; i++) spawnEnemy(g, 'garpy');
    spawnedEmergency50 = true; // 二度目がないようにフラグを立てる
  }

  // 2. HPが20%以下になった時、最強のアイアンボットとウォーロックを放出
  if (hpPercent <= 0.2 && !spawnedEmergency20) {
    spawnEnemy(g, 'ironbot');
    spawnEnemy(g, 'warlock');
    spawnEnemy(g, 'warlock');
    spawnedEmergency20 = true;
  }

  // --- 既存の通常の湧き処理 ---
  g.eTimer += dt;
  if (g.eTimer >= g.eNext) {
    g.eTimer = 0;
    g.eNext = ph.intv[0] + Math.random() * (ph.intv[1] - ph.intv[0]);
    spawnEnemy(g, wRand(ph.pool));
  }
}

// Spawn one enemy at a random X along the enemy base line
function spawnEnemy(g, defId) {
  var d = ENEMY_UNITS[defId];
  if (!d) return;
  var mult = g.stageMult || 1.0;
  // Apply stage difficulty multiplier to hp and dmg
  var scaledD = {
    n:d.n, e:d.e, hp:Math.round(d.hp*mult), dmg:Math.round(d.dmg*mult),
    spd:d.spd, rng:d.rng, ar:d.ar, type:d.type, targets:d.targets,
    size:d.size, area:d.area||0, heal:d.heal||0, rew:d.rew||1
  };
  var margin = 28;
  var x = margin + Math.random() * (W - margin * 2);
  g.units.push(mkUnit(defId, 'enemy', x, ESY, scaledD));
}
