// wave.js — Wave definitions, shockwave config & enemy spawn logic
// ⚠ このファイルは Wave Editor で自動生成されました

// ── 衝撃波設定（敵ユニットごと）────────────────────
var SHOCKWAVE_CONFIG = {
  ironbot: { trigger:'spawn',    radius:300, force:400,           damage:0  },
  warlock: { trigger:'interval', radius:150, force:200, interval:8,damage:0  },
  orc:     { trigger:'death',    radius:100, force:100,           damage:10 },
  brute:   { trigger:'spawn',    radius:400, force:250,           damage:40 },
  runner:  { trigger:'interval', radius:80,  force:80,  interval:1,damage:5  }
};

// ── ステージ設定（ウェーブ・緊急スポーン・拠点HP）──
var STAGES_CONFIG = [
{
  id:1, name:'ステージ 1', sub:'草原', icon:'🌿',
  enemyMult:1, baseReward:150, enemyBaseHP:1000,
  waves:[
    { till:20, pool:[{id:'slime',w:1}], intv:[2.3,2.3] },
    { till:40, pool:[{id:'slime',w:3}, {id:'goblin',w:5}], intv:[2.3,2.3] },
    { till:60, pool:[{id:'slime',w:3}, {id:'goblin',w:5}, {id:'gremlin',w:8}], intv:[2.3,2.3] },
    { till:1e9, pool:[{id:'slime',w:1}, {id:'goblin',w:3}, {id:'gremlin',w:6}], intv:[2.3,2.3] }
  ],
  emergencySpawns:[]
},
{
  id:2, name:'ステージ 2', sub:'砂漠', icon:'🏜️',
  enemyMult:1.1, baseReward:250, enemyBaseHP:1300,
  waves:[
    { till:15, pool:[{id:'slime',w:5}, {id:'gremlin',w:6}], intv:[1.8,2.3] },
    { till:30, pool:[{id:'gremlin',w:3}, {id:'goblin',w:3}, {id:'shade',w:7}], intv:[1.3,1.8] },
    { till:50, pool:[{id:'orc',w:1}, {id:'shade',w:5}], intv:[2.8,2.8] },
    { till:70, pool:[{id:'orc',w:2}, {id:'charger',w:4}, {id:'garpy',w:3}], intv:[3.8,3.8] },
    { till:1e9, pool:[{id:'garpy',w:6}, {id:'charger',w:2}], intv:[3.8,3.8] }
  ],
  emergencySpawns:[
    { hpPercent:60, spawns:[{id:'charger',count:2}] }
  ]
},
{
  id:3, name:'ステージ 3', sub:'氷河', icon:'🥶',
  enemyMult:1.3, baseReward:400, enemyBaseHP:1800,
  waves:[
    { till:20, pool:[{id:'shade',w:1}], intv:[0.8,1.3] },
    { till:40, pool:[{id:'shade',w:6}, {id:'orc',w:3}, {id:'runner',w:4}], intv:[1.3,2.8] },
    { till:60, pool:[{id:'runner',w:3}, {id:'shade',w:1}, {id:'orc',w:3}, {id:'ironbot',w:1}], intv:[1.8,2.3] },
    { till:80, pool:[{id:'ironbot',w:2}, {id:'striker',w:7}], intv:[2.3,2.3] },
    { till:100, pool:[{id:'ironbot',w:3}, {id:'brute',w:3}, {id:'warlock',w:3}, {id:'garpy',w:2}], intv:[2.3,2.8] },
    { till:110, pool:[{id:'ironbot',w:1}, {id:'warlock',w:1}, {id:'orc',w:1}, {id:'striker',w:1}, {id:'gargoyle',w:1}, {id:'runner',w:1}, {id:'shade',w:1}], intv:[0.3,0.8] },
    { till:1e9, pool:[{id:'ironbot',w:1}, {id:'lancer',w:2}], intv:[1.8,1.8] }
  ],
  emergencySpawns:[
    { hpPercent:75, spawns:[{id:'ironbot',count:2}] },
    { hpPercent:50, spawns:[{id:'shade',count:20}] },
    { hpPercent:25, spawns:[{id:'ironbot',count:4}, {id:'warlock',count:2}, {id:'brute',count:3}] }
  ]
},
{
  id:4, name:'ステージ 4', sub:'火山', icon:'🔥',
  enemyMult:2, baseReward:2000, enemyBaseHP:5000,
  waves:[
    { till:20, pool:[{id:'runner',w:3}], intv:[0.3,1.3] },
    { till:35, pool:[{id:'ironbot',w:1}], intv:[0.8,1.3] },
    { till:50, pool:[{id:'warlock',w:1}], intv:[1.3,2.3] },
    { till:70, pool:[{id:'brute',w:3}, {id:'ironbot',w:1}], intv:[1.3,1.8] },
    { till:1e9, pool:[{id:'ironbot',w:3}, {id:'brute',w:3}, {id:'runner',w:3}, {id:'striker',w:3}, {id:'gargoyle',w:3}], intv:[0.3,0.3] }
  ],
  emergencySpawns:[
    { hpPercent:80, spawns:[{id:'garpy',count:10}] },
    { hpPercent:60, spawns:[{id:'ironbot',count:5}] },
    { hpPercent:40, spawns:[{id:'striker',count:10}] },
    { hpPercent:20, spawns:[{id:'orc',count:20}] },
    { hpPercent:10, spawns:[{id:'runner',count:15}, {id:'brute',count:5}, {id:'warlock',count:5}] }
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

// 【バグ修正】2つ目のループ変数を j に変更（var i の二重宣言を解消）
function wRand(pool) {
  var s = 0;
  for (var i = 0; i < pool.length; i++) s += pool[i].w;
  var r = Math.random() * s;
  for (var j = 0; j < pool.length; j++) { r -= pool[j].w; if (r <= 0) return pool[j].id; }
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
    skills: d.skills ? d.skills.slice() : null  // 【バグ修正】スキルを必ず引き継ぐ
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
