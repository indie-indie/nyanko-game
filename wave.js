// wave.js — Wave definitions, shockwave config & enemy spawn logic
// ⚠ このファイルは Wave Editor で自動生成されました

// ── 衝撃波設定（敵ユニットごと）────────────────────
// キーは enemies.js の ENEMY_UNITS のID と一致させること
var SHOCKWAVE_CONFIG = {
  robo:   { trigger:'spawn',    radius:300, force:200 },
  tako:   { trigger:'interval', radius:100, force:100, interval:10 },
  boar:   { trigger:'death',    radius:200, force:100, damage:30 }
};

// ── ステージ設定（ウェーブ・緊急スポーン・拠点HP）──
var STAGES_CONFIG = [
{
  id:1, name:'ステージ 1', sub:'草原の戦い', icon:'🌿',
  enemyMult:1, baseReward:150, enemyBaseHP:1000,
  waves:[
    { till:1e9, pool:[{id:'frog',w:1}], intv:[1.8,1.8], scheduled:[{at:20,id:'croco',count:3}] }
  ],
  emergencySpawns:[

  ]
},
{
  id:2, name:'ステージ 2', sub:'砂漠の砦', icon:'🏜️',
  enemyMult:1.4, baseReward:280, enemyBaseHP:1500,
  waves:[
    { till:20, pool:[{id:'frog',w:5}, {id:'croco',w:3}], intv:[1.8,2.3], scheduled:[{at:30,id:'robo',count:2}, {at:50,id:'tako',count:3}] },
    { till:40, pool:[{id:'croco',w:4}, {id:'goblin',w:3}, {id:'ghost',w:2}], intv:[1.8,1.8] },
    { till:60, pool:[{id:'goblin',w:2}, {id:'boar',w:3}, {id:'robo',w:2}], intv:[2.3,3.3] },
    { till:80, pool:[{id:'boar',w:2}, {id:'parrot',w:5}, {id:'sasori',w:3}], intv:[1.3,2.8] },
    { till:100, pool:[{id:'robo',w:2}, {id:'tako',w:3}, {id:'sasori',w:5}], intv:[0.8,2.3] },
    { till:120, pool:[{id:'boar',w:4}, {id:'robo',w:2}, {id:'parrot',w:4}, {id:'tako',w:2}, {id:'sasori',w:3}], intv:[1.3,1.8] },
    { till:1e9, pool:[{id:'robo',w:4}, {id:'boar',w:4}, {id:'tako',w:3}, {id:'parrot',w:5}, {id:'sasori',w:4}], intv:[1.3,2.3] }
  ],
  emergencySpawns:[
    { hpPercent:50, spawns:[{id:'parrot',count:3}] }
  ]
},
{
  id:3, name:'ステージ 3', sub:'魔王の城', icon:'🏰',
  enemyMult:1.8, baseReward:410, enemyBaseHP:2000,
  waves:[
    { till:20, pool:[{id:'frog',w:5}, {id:'croco',w:3}], intv:[1.8,2.8] },
    { till:40, pool:[{id:'croco',w:4}, {id:'goblin',w:3}, {id:'ghost',w:2}], intv:[1.3,2.3] },
    { till:60, pool:[{id:'goblin',w:2}, {id:'boar',w:3}, {id:'robo',w:2}], intv:[2.3,3.8] },
    { till:80, pool:[{id:'boar',w:2}, {id:'parrot',w:5}, {id:'sasori',w:3}], intv:[1.8,2.8] },
    { till:100, pool:[{id:'robo',w:2}, {id:'tako',w:3}, {id:'sasori',w:5}], intv:[0.8,1.3] },
    { till:120, pool:[{id:'boar',w:4}, {id:'robo',w:2}, {id:'parrot',w:4}, {id:'tako',w:2}, {id:'sasori',w:3}], intv:[0.8,1.8] },
    { till:1e9, pool:[{id:'robo',w:4}, {id:'boar',w:4}, {id:'tako',w:3}, {id:'parrot',w:5}, {id:'sasori',w:4}], intv:[1.3,1.8], scheduled:[{at:30,id:'rabbit',count:5}] }
  ],
  emergencySpawns:[
    { hpPercent:50, spawns:[{id:'parrot',count:3}] },
    { hpPercent:20, spawns:[{id:'robo',count:2}, {id:'tako',count:2}] }
  ]
},
{
  id:4, name:'ステージ 4', sub:'新エリア', icon:'⭐',
  enemyMult:2.2, baseReward:540, enemyBaseHP:2500,
  waves:[
    { till:20, pool:[{id:'rabbit',w:1}], intv:[0.8,1.3], scheduled:[{at:15,id:'ghost',count:5}] },
    { till:30, pool:[{id:'robo',w:1}], intv:[1.3,1.3], scheduled:[{at:25,id:'ghost',count:5}] },
    { till:60, pool:[{id:'parrot',w:1}, {id:'tako',w:1}], intv:[1.3,2.3] },
    { till:1e9, pool:[{id:'rhino',w:1}, {id:'boar',w:1}], intv:[0.8,1.3] }
  ],
  emergencySpawns:[
    { hpPercent:75, spawns:[{id:'parrot',count:5}] },
    { hpPercent:50, spawns:[{id:'buffalo',count:5}] },
    { hpPercent:25, spawns:[{id:'sasori',count:3}, {id:'bat',count:4}, {id:'eagle',count:5}] },
    { hpPercent:10, spawns:[{id:'robo',count:10}, {id:'tako',count:5}] }
  ]
}
];

// ── Wave helpers ──────────────────────────────────
function getPhase(waves, t) {
  for (var i = 0; i < waves.length; i++) {
    if (t < waves[i].till) return waves[i];
  }
  return waves[waves.length - 1];
}

function wRand(pool) {
  var s = 0;
  for (var i = 0; i < pool.length; i++) s += pool[i].w;
  var r = Math.random() * s;
  for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) return pool[i].id; }
  return pool[pool.length - 1].id;
}

function updateWave(g, dt) {
  var ph = getPhase(g.stageWaves, g.t);
  var hpPct = (g.eb.hp / g.eb.max) * 100;

  // 緊急スポーントリガー
  for (var ei = 0; ei < g.emergencySpawns.length; ei++) {
    var es = g.emergencySpawns[ei];
    if (!es.triggered && hpPct <= es.hpPercent) {
      es.triggered = true;
      for (var si = 0; si < es.spawns.length; si++) {
        for (var ci = 0; ci < es.spawns[si].count; ci++) {
          spawnEnemy(g, es.spawns[si].id);
        }
      }
    }
  }

  // 時刻指定スポーン（各ウェーブの scheduled 配列）
  if (g.scheduledTriggered) {
    for (var wi = 0; wi < g.stageWaves.length; wi++) {
      var wv = g.stageWaves[wi];
      if (!wv.scheduled || !wv.scheduled.length) continue;
      for (var sci = 0; sci < wv.scheduled.length; sci++) {
        var sc = wv.scheduled[sci];
        var key = 'sc_' + wi + '_' + sci;
        if (!g.scheduledTriggered[key] && g.t >= sc.at) {
          g.scheduledTriggered[key] = true;
          for (var scc = 0; scc < sc.count; scc++) {
            spawnEnemy(g, sc.id);
          }
        }
      }
    }
  }

  // 通常スポーン
  g.eTimer += dt;
  if (g.eTimer >= g.eNext) {
    g.eTimer = 0;
    g.eNext  = ph.intv[0] + Math.random() * (ph.intv[1] - ph.intv[0]);
    spawnEnemy(g, wRand(ph.pool));
  }
}

function spawnEnemy(g, defId) {
  var d = ENEMY_UNITS[defId]; if (!d) return;
  var mult = g.stageMult || 1.0;
  var scaledD = {
    n:d.n, e:d.e, hp:Math.round(d.hp*mult), dmg:Math.round(d.dmg*mult),
    spd:d.spd, rng:d.rng, ar:d.ar, type:d.type, targets:d.targets,
    size:d.size, area:d.area||0, heal:d.heal||0, rew:d.rew||1,
    skills: d.skills ? d.skills.slice() : null
  };
  var margin = 28;
  var x = margin + Math.random() * (W - margin * 2);
  var u = mkUnit(defId, 'enemy', x, ESY, scaledD);
  g.units.push(u);

  var swc = SHOCKWAVE_CONFIG[defId];
  if (swc && swc.trigger === 'spawn' && typeof triggerShockwave === 'function') {
    triggerShockwave(g, x, ESY, swc);
  }
}
