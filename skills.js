// skills.js — 特殊効果・プロジェクタイル生成・衝撃波・状態異常の一元管理

// ── 重攻撃の閾値（ar がこれ以上のユニットは重攻撃ビジュアル）──
var HEAVY_AR_THRESHOLD = 1.5;

// ═══════════════════════════════════════════════════════
//  SKILL_EFFECTS — 各スキル効果の処理関数
//  引数統一: (attacker, target, skillDef, g, parts)
//    attacker : スキルを持つユニット（onDeath 時は死亡ユニット自身）
//    target   : 効果を受けるユニット
//    skillDef : skills 配列内の 1 エントリ（value, range, duration 等）
//    g        : ゲーム状態オブジェクト
//    parts    : パーティクル配列
// ═══════════════════════════════════════════════════════
var SKILL_EFFECTS = {

  // ── サンダー ─────────────────────────────────────────
  // ヒット時にターゲットの currentTarget をリセット（狙いが外れる）
  thunder: function(attacker, target, skill, g, parts) {
    if (!target || target.dead) return;
    target.currentTarget = null;
    // 青白い放電パーティクル
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      parts.push({
        x: target.x, y: (target.type === 'air' ? target.y - 22 : target.y),
        vx: Math.cos(a) * (1.5 + Math.random() * 2.5),
        vy: Math.sin(a) * (1.5 + Math.random() * 2.5),
        col: Math.random() < 0.5 ? '#a5f3fc' : '#e0f2fe',
        life: 18, max: 18, r: 1.5 + Math.random()
      });
    }
    // 雷テキスト
    parts.push({
      type: 'text', text: '⚡', x: target.x, y: (target.type === 'air' ? target.y - 30 : target.y - 20),
      vx: 0, vy: -0.8, life: 30, max: 30, col: '#fde047', r: 0
    });
  },

  // ── スロウ ───────────────────────────────────────────
  // ヒット時に移動速度 20% ずつダウン（最大 4 スタック = 80% 減速）
  slow: function(attacker, target, skill, g, parts) {
    if (!target || target.dead) return;
    // 基礎速度を初回のみ記録
    if (!target.baseSPD) target.baseSPD = target.spd;
    var maxStacks = 4;
    target.slowStacks = Math.min(maxStacks, (target.slowStacks || 0) + 1);
    target.slowTimer  = 3.5;  // スタック全解除タイマー（秒）
    // 実効速度を更新（最低 20% は確保）
    target.spd = target.baseSPD * Math.max(0.2, 1.0 - target.slowStacks * 0.2);
    // 水色パーティクル
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2;
      parts.push({
        x: target.x + (Math.random() - 0.5) * 20,
        y: (target.type === 'air' ? target.y - 22 : target.y) + (Math.random() - 0.5) * 14,
        vx: Math.cos(a) * 0.8, vy: Math.sin(a) * 0.8 - 0.5,
        col: '#7dd3fc', life: 28, max: 28, r: 2.5
      });
    }
  },

  // ── 毒 ──────────────────────────────────────────────
  // ヒット時に 3 秒間スリップダメージ
  poison: function(attacker, target, skill, g, parts) {
    if (!target || target.dead) return;
    // 新しい毒が上書き（より強い毒に更新）
    var dmg = skill.value || Math.max(1, Math.round(attacker.dmg * 0.15));
    if ((target.poisonDmg || 0) < dmg) target.poisonDmg = dmg;
    target.poisonTimer = 3.0;
    // 緑のパーティクル
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2;
      parts.push({
        x: target.x + (Math.random() - 0.5) * 18,
        y: (target.type === 'air' ? target.y - 22 : target.y),
        vx: Math.cos(a) * (0.3 + Math.random()),
        vy: -1.2 - Math.random() * 1.2,
        col: Math.random() < 0.5 ? '#4ade80' : '#86efac',
        life: 32, max: 32, r: 2 + Math.random()
      });
    }
  },

  // ── ヒール ───────────────────────────────────────────
  // 攻撃するたびに自分の周囲の味方を回復
  heal: function(attacker, target, skill, g, parts) {
    var range  = skill.range  || 80;
    var amount = skill.value  || Math.max(2, Math.round(attacker.dmg * 0.25));
    for (var i = 0; i < g.units.length; i++) {
      var u = g.units[i];
      if (u.team !== attacker.team || u.dead) continue;
      if (Math.hypot(u.x - attacker.x, u.y - attacker.y) > range) continue;
      if (u.hp >= u.mhp) continue;
      u.hp = Math.min(u.mhp, u.hp + amount);
      // 緑の上昇パーティクル
      for (var j = 0; j < 3; j++) {
        parts.push({
          x: u.x + (Math.random() - 0.5) * 18,
          y: (u.type === 'air' ? u.y - 22 : u.y),
          vx: (Math.random() - 0.5) * 0.8, vy: -1.4 - Math.random(),
          col: '#86efac', life: 26, max: 26, r: 2
        });
      }
    }
  },

  // ── 分裂 ─────────────────────────────────────────────
  // 死亡時に 2 体に分裂（分裂体は再分裂しない）
  split: function(attacker, target, skill, g, parts) {
    // attacker == target（死亡ユニット自身が分裂スキルを持つ）
    if (!target || !target.dead || target.hasSplit) return;
    target.hasSplit = true;

    // 定義データを取得（enemyMult 適用前の元データ）
    var defData = (target.team === 'enemy')
      ? ENEMY_UNITS[target.defId]
      : (PLAYER_UNITS[target.defId] || null);
    if (!defData) return;

    for (var i = 0; i < 2; i++) {
      var offX   = (i === 0 ? -16 : 16);
      var childD = {
        n      : target.nm + '（分）',
        e      : target.e,
        img    : target.img    || null,
        hp     : Math.max(1, Math.round(target.mhp * 0.45)),
        dmg    : Math.max(1, Math.round(target.dmg * 0.65)),
        spd    : target.baseSPD ? target.baseSPD * 1.2 : target.spd * 1.2,
        rng    : target.rng,
        ar     : target.ar,
        type   : target.type,
        targets: target.targets,
        isBase : false,
        size   : target.size * 0.72,
        area   : 0,
        heal   : 0,
        rew    : 0,        // 分裂体は報酬なし
        skills : null      // 再分裂しない
      };
      var child = mkUnit(target.defId, target.team, target.x + offX, target.y, childD);
      child.hasSplit = true;
      g.units.push(child);
    }

    // 分裂エフェクト
    var col = target.team === 'enemy' ? '#f97316' : '#60a5fa';
    for (var k = 0; k < 14; k++) {
      var a = Math.random() * Math.PI * 2;
      parts.push({
        x: target.x, y: target.type === 'air' ? target.y - 22 : target.y,
        vx: Math.cos(a) * (2 + Math.random() * 4),
        vy: Math.sin(a) * (2 + Math.random() * 4),
        col: col, life: 28, max: 28, r: 3 + Math.random() * 2
      });
    }
  },

  // ── 凍結 ─────────────────────────────────────────────
  // ヒット時に一定時間行動不能（既存 stuntimer を流用）
  freeze: function(attacker, target, skill, g, parts) {
    if (!target || target.dead) return;
    var dur = skill.duration || 1.5;
    target.stuntimer = Math.max(target.stuntimer || 0, dur);
    // 氷の結晶パーティクル
    var drawY = target.type === 'air' ? target.y - 22 : target.y;
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      var r = 10 + Math.random() * 8;
      parts.push({
        x: target.x + Math.cos(a) * r, y: drawY + Math.sin(a) * r,
        vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5 - 0.3,
        col: i % 2 === 0 ? '#bae6fd' : '#e0f2fe',
        life: 40, max: 40, r: 2.5
      });
    }
    parts.push({
      type: 'text', text: '🧊', x: target.x, y: drawY - 20,
      vx: 0, vy: -0.5, life: 35, max: 35, col: '#bae6fd', r: 0
    });
  }

  // ── 貫通（pierce）─────────────────────────────────────
  // プロジェクタイルビルド時に処理するため SKILL_EFFECTS には不要
};

// ═══════════════════════════════════════════════════════
//  triggerSkill — スキル窓口（main.js から呼ぶ唯一の関数）
//  trigger : 'onHit' | 'onAttack' | 'onDeath'
// ═══════════════════════════════════════════════════════
function triggerSkill(trigger, attacker, target, g, parts) {
  if (!attacker || !attacker.skills || !attacker.skills.length) return;
  for (var i = 0; i < attacker.skills.length; i++) {
    var sk = attacker.skills[i];
    if (sk.trigger !== trigger) continue;
    if (sk.effect === 'pierce') continue;  // pierce はビルド時に処理
    var fn = SKILL_EFFECTS[sk.effect];
    if (fn) fn(attacker, target, sk, g, parts);
  }
}

// ═══════════════════════════════════════════════════════
//  updateStatusEffects — 毎フレーム状態異常を更新
// ═══════════════════════════════════════════════════════
function updateStatusEffects(units, dt, g, parts) {
  for (var i = 0; i < units.length; i++) {
    var u = units[i];
    if (u.dead) continue;

    // ── 毒 ──────────────────────────────────────────
    if (u.poisonTimer > 0) {
      u.poisonTimer = Math.max(0, u.poisonTimer - dt);
      u.poisonAccum = (u.poisonAccum || 0) + (u.poisonDmg || 0) * dt;
      if (u.poisonAccum >= 1) {
        var dmg = Math.floor(u.poisonAccum);
        u.poisonAccum -= dmg;
        u.hp -= dmg;
        u.flash = 4;
        if (u.hp <= 0 && !u.dead) {
          u.dead = true;
          burst(u.x, u.y, '#4ade80', 6);
          if (u.team === 'enemy') g.gold = Math.min(g.gold + u.rew, g.maxGold);
        }
      }
      // 毒の煙パーティクル（間引き）
      if (Math.random() < 0.25) {
        parts.push({
          x: u.x + (Math.random() - 0.5) * 16,
          y: (u.type === 'air' ? u.y - 22 : u.y) - 4,
          vx: (Math.random() - 0.5) * 0.6, vy: -0.9 - Math.random() * 0.5,
          col: '#4ade80', life: 18, max: 18, r: 1.8
        });
      }
    }

    // ── スロウの時間消費 ─────────────────────────────
    if ((u.slowStacks || 0) > 0) {
      u.slowTimer = Math.max(0, (u.slowTimer || 0) - dt);
      if (u.slowTimer <= 0) {
        u.slowStacks = 0;
        if (u.baseSPD) u.spd = u.baseSPD;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
//  buildProjectile — プロジェクタイル生成ファクトリー
//  ar >= HEAVY_AR_THRESHOLD なら重攻撃ビジュアルを付与
//  pierce スキル持ちは方向ベクトル・貫通フラグを追加
// ═══════════════════════════════════════════════════════
function buildProjectile(u, tgt, area) {
  var isHeavy  = u.ar >= HEAVY_AR_THRESHOLD;
  var isPlayer = u.team === 'player';
  var startY   = u.type === 'air' ? u.y - 22 : u.y;

  // 見た目パラメータ
  var col, glowCol, radius, trailLen, hitEffect;
  if (isHeavy) {
    col       = isPlayer ? '#fbbf24' : '#ef4444';
    glowCol   = isPlayer ? '#fde68a' : '#fca5a5';
    radius    = 6;
    trailLen  = 28;
    hitEffect = 'heavy';
  } else {
    col       = isPlayer ? '#93c5fd' : '#fca5a5';
    glowCol   = null;
    radius    = 3;
    trailLen  = 12;
    hitEffect = 'normal';
  }

  var proj = {
    x        : u.x,
    y        : startY,
    tgt      : tgt,
    dmg      : u.dmg,
    spd      : 350,
    team     : u.team,
    area     : area || 0,
    attacker : u,
    // 見た目
    col      : col,
    glowCol  : glowCol,
    radius   : radius,
    glow     : isHeavy,
    trailLen : trailLen,
    hitEffect: hitEffect
  };

  // 貫通（pierce スキル持ち）
  if (hasPierceSkill(u)) {
    var tgtY   = tgt.type === 'air' ? tgt.y - 22 : tgt.y;
    var dx = tgt.x - u.x, dy = tgtY - startY;
    var dist = Math.hypot(dx, dy) || 1;
    proj.pierce       = true;
    proj.vx           = (dx / dist) * proj.spd;
    proj.vy           = (dy / dist) * proj.spd;
    proj.maxDist      = u.rng * 1.8;
    proj.traveledDist = 0;
    proj.hitIds       = {};   // 貫通済みユニット ID セット（重複ヒット防止）
  }

  return proj;
}

// ── pierce スキルを持つか確認 ─────────────────────────
function hasPierceSkill(u) {
  if (!u.skills) return false;
  for (var i = 0; i < u.skills.length; i++) {
    if (u.skills[i].effect === 'pierce') return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════
//  applyHitEffect — プロジェクタイルのヒット演出
// ═══════════════════════════════════════════════════════
function applyHitEffect(proj, tgt, g, parts) {
  if (proj.hitEffect === 'heavy') {
    // 大きなバースト
    burst(tgt.x, tgt.y, proj.team === 'player' ? '#fde68a' : '#fca5a5', 14);
    // 小型衝撃リング
    g.shockwaves.push({ x: tgt.x, y: tgt.y, r: 0, maxR: 48, life: 1.0, speed: 280 });
    // 画面シェイク（小）
    g.shake = Math.max(g.shake, 8);
  } else {
    // 通常ヒット：小さなパーティクル
    var col = proj.team === 'player' ? '#93c5fd' : '#fca5a5';
    for (var i = 0; i < 4; i++) {
      var a = Math.random() * Math.PI * 2;
      parts.push({
        x: tgt.x, y: tgt.type === 'air' ? tgt.y - 22 : tgt.y,
        vx: Math.cos(a) * (1.5 + Math.random() * 2),
        vy: Math.sin(a) * (1.5 + Math.random() * 2) - 0.8,
        col: col, life: 14, max: 14, r: 1.5
      });
    }
  }
}

// ═══════════════════════════════════════════════════════
//  triggerShockwave — main.js から移動
// ═══════════════════════════════════════════════════════
function triggerShockwave(g, x, y, swc) {
  g.shockwaves.push({ x: x, y: y, r: 0, maxR: swc.radius, life: 1.0, speed: 400 });
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
    if (swc.damage > 0) hitUnit(u, Math.round(swc.damage * falloff), null);
  }
}
