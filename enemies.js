// enemies.js — Enemy unit definitions
//
// targets : 'ground' | 'air' | 'both' | 'base'（拠点のみ）
// isBase  : true = プレイヤーの targets:'base' ユニットが攻撃する
// attr    : このユニットの属性（特攻を受ける側）
//           'beast' | 'humanoid' | 'machine' | 'undead' | 'magic' | 'construct'（随時追加予定）
// skills  : 特殊効果（skills.js の SKILL_EFFECTS を参照）

var ENEMY_UNITS = {
  gremlin: {
    n:'グレムリン', e:'👹',
    hp:72, dmg:10, spd:58, rng:55, ar:1.0,
    type:'ground', targets:'ground', size:1.0, rew:5,
    attr:'beast'
  },
  ironbot: {
    n:'アイアンボット', e:'🤖',
    hp:360, dmg:22, spd:22, rng:55, ar:1.3,
    type:'ground', targets:'ground', size:1.5, rew:10,
    attr:'machine'
    // 衝撃波は SHOCKWAVE_CONFIG で管理
  },
  shade: {
    n:'シェード', e:'💀',
    hp:44, dmg:14, spd:105, rng:52, ar:0.9,
    type:'ground', targets:'ground', size:0.8, rew:5,
    attr:'undead',
    skills: [{ trigger:'onDeath', effect:'split' }]
  },
  warlock: {
    n:'ウォーロック', e:'🔮',
    hp:90, dmg:36, spd:30, rng:165, ar:1.4,
    type:'air', targets:'both', size:1.0, rew:10,
    attr:'magic',
    skills: [{ trigger:'onHit', effect:'slow' }]
  },
  slime: {
    n:'スライム', e:'🟢',
    hp:40, dmg:8, spd:50, rng:45, ar:1.0,
    type:'ground', targets:'ground', size:0.8, rew:10,
    attr:'beast'
  },
  goblin: {
    n:'ゴブリン', e:'👺',
    hp:70, dmg:14, spd:65, rng:50, ar:1.0,
    type:'ground', targets:'ground', size:0.9, rew:15,
    attr:'humanoid'
  },
  orc: {
    n:'オーク', e:'🪓',
    hp:160, dmg:28, spd:45, rng:55, ar:1.2,
    type:'ground', targets:'ground', size:1.1, area:15, rew:25,
    attr:'beast'
  },
  lancer: {
    n:'ランサー', e:'🔱',
    hp:120, dmg:32, spd:55, rng:90, ar:1.3,
    type:'ground', targets:'both', size:1.0, area:30, rew:25,
    attr:'humanoid'
  },
  charger: {
    n:'チャージナイト', e:'🐂',
    hp:180, dmg:48, spd:95, rng:45, ar:1.8,
    type:'ground', targets:'base', size:1.2, rew:30,
    attr:'beast'
    // ar=1.8 → 重攻撃ビジュアル自動適用
  },
  brute: {
    n:'ブルート', e:'🚛',
    hp:380, dmg:26, spd:28, rng:50, ar:1.2,
    type:'ground', targets:'ground', size:1.3, rew:30,
    attr:'machine'
  },
  runner: {
    n:'ランナー', e:'🏃',
    hp:60, dmg:12, spd:140, rng:45, ar:0.9,
    type:'ground', targets:'base', size:0.8, rew:18,
    attr:'humanoid'
  },
  longbow: {
    n:'ロングボウ', e:'🔫',
    hp:80, dmg:24, spd:40, rng:170, ar:1.4,
    type:'ground', targets:'both', size:1.0, rew:25,
    attr:'humanoid',
    skills: [{ trigger:'onHit', effect:'thunder' }]
  },
  striker: {
    n:'ストライカー', e:'🥊',
    hp:110, dmg:20, spd:75, rng:50, ar:0.5,
    type:'ground', targets:'ground', size:1.0, rew:22,
    attr:'humanoid'
  },
  gargoyle: {
    n:'ガーゴイル', e:'👾',
    hp:260, dmg:30, spd:35, rng:55, ar:1.3,
    type:'air', targets:'both', size:1.2, rew:35,
    attr:'undead',
    skills: [{ trigger:'onHit', effect:'poison' }]
  },
  garpy: {
    n:'ガーピー', e:'🦅',
    hp:55, dmg:18, spd:85, rng:55, ar:1.0,
    type:'air', targets:'both', size:0.9, rew:20,
    attr:'beast',
    skills: [{ trigger:'onHit', effect:'thunder' }]
  }
};
