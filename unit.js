// unit.js — Player unit definitions & shared constants

var W = 390, BH = 510;
var EBY = 58, PBY = BH - 60;
var ESY = EBY + 52, PSY = PBY - 52;

// ── 特攻倍率デフォルト値 ────────────────────────────
// crt フィールドを省略した場合に使用されるフォールバック値
var AFFINITY_BONUS_DEFAULT = 1.5;

// ── 属性一覧（attr）─────────────────────────────────
// 'beast'    : 動物・獣系
// 'humanoid' : 人間・亜人系
// 'machine'  : 機械・ロボット系
// 'undead'   : 不死・霊体系
// 'magic'    : 魔法・精霊系
// 'construct': 構造物・ゴーレム系
// （随時追加可能）

// ── ユニット定義フィールド凡例 ──────────────────────────
// targets  : 地上'ground' | 空'air' | 両方'both' | 拠点'base'
// isBase   : true = targets:'base' の相手から攻撃される
// img      : 画像相対パス（拡張子あり推奨。省略時は絵文字）
//            ※ 拡張子を省略すると .png が自動付与されます
// attr     : このユニットの属性（特攻を受ける側）
// affinity : このユニットが特攻を持つ属性（対象の attr と一致でダメージ×crt）
// crt      : 特攻倍率（例: 1.5 = 150%ダメージ）省略時は AFFINITY_BONUS_DEFAULT
// skills   : [ { trigger, effect, value?, range?, duration? }, ... ]
//   trigger :攻撃ヒット時 'onHit' | 攻撃したとき'onAttack' | 死亡したとき'onDeath'
//   effect  : サンダー'thunder' | スロウ'slow' | 毒'poison' | 回復'heal' | 分裂'split' | 凍結'freeze' | 貫通'pierce'

var PLAYER_UNITS = {
  nico: {
    n:'ニコ', e:'😄', cost:20, hp:100, dmg:13, spd:40, rng:30, ar:1.0,
    type:'ground', targets:'ground', cd:1.0, size:0.8, rew:1, zone:'own', unlockCost:0,
    attr:'beast', affinity:null, crt:1.5
  },
  hoko: {
    n:'ホッコ', e:'😊', cost:25, hp:80, dmg:20, spd:30, rng:30, ar:1.0,
    type:'ground', targets:'ground', cd:2.0, size:1.0, rew:1, zone:'own', unlockCost:0,
    attr:'beast', affinity:null, crt:1.5,
    skills: [{ trigger:'onDeath', effect:'split' }]
  },
  fuu: {
    n:'フゥ', e:'😤', cost:30, hp:50, dmg:10, spd:100, rng:40, ar:0.75,
    type:'ground', targets:'ground', cd:1.0, size:0.8, rew:1.5, zone:'own', unlockCost:0,
    attr:'beast', affinity:null, crt:1.5
  },
  ikari: {
    n:'イカリ', e:'😠', cost:40, hp:150, dmg:30, spd:60, rng:50, ar:1.0,
    type:'ground', targets:'ground', cd:1.5, size:1.1, rew:1.2, zone:'own', unlockCost:0,
    attr:'humanoid', affinity:'beast', crt:1.5
  },
  teko: {
    n:'テコ', e:'🤓', cost:30, hp:80, dmg:15, spd:50, rng:120, ar:0.75,
    type:'ground', targets:'both', cd:1.0, size:0.9, rew:1, zone:'own', unlockCost:0,
    attr:'humanoid', affinity:null, crt:1.5
  },
  noo: {
    n:'ノー', e:'😐', img:'nyanko-game/image/golem', cost:60, hp:500, dmg:15, spd:25, rng:30, ar:1.5,
    type:'ground', targets:'ground', isBase:true, cd:2.5, size:1.5, rew:2, zone:'own', unlockCost:250,
    attr:'construct', affinity:'humanoid', crt:1.8
  },
  jiro: {
    n:'ジロ', e:'🧐', cost:40, hp:50, dmg:40, spd:40, rng:150, ar:1.6,
    type:'ground', targets:'both', cd:3.0, size:0.9, rew:1, zone:'own', unlockCost:250,
    attr:'humanoid', affinity:'machine', crt:2.0,
    skills: [{ trigger:'onHit', effect:'pierce' }]
  },
  guru: {
    n:'グル', e:'😵‍💫', cost:50, hp:30, dmg:8, spd:20, rng:80, ar:0.3,
    type:'ground', targets:'both', cd:4.0, size:0.7, rew:1, zone:'own', unlockCost:250,
    attr:'construct', affinity:'beast', crt:1.5,
    skills: [{ trigger:'onHit', effect:'pierce' }]
  },
  waru: {
    n:'ワル', e:'😈', cost:35, hp:80, dmg:90, spd:90, rng:20, ar:0.8,
    type:'ground', targets:'ground', cd:5.0, size:0.8, rew:1, zone:'all', unlockCost:350,
    attr:'humanoid', affinity:'humanoid', crt:1.6,
    skills: [{ trigger:'onHit', effect:'poison' }]
  },
  don: {
    n:'ドン', e:'🤯', cost:50, hp:120, dmg:100, spd:30, rng:120, ar:1.5, area:10,
    type:'ground', targets:'both', cd:5.5, size:1.0, rew:1, zone:'own', unlockCost:400,
    attr:'humanoid', affinity:'undead', crt:2.0
  },
  biri: {
    n:'ビリ', e:'🤩', cost:60, hp:90, dmg:30, spd:30, rng:120, ar:1.2, area:5,
    type:'ground', targets:'both', cd:6.5, size:1.0, rew:1, zone:'own', unlockCost:400,
    attr:'construct', affinity:'machine', crt:2.0,
    skills: [{ trigger:'onHit', effect:'thunder' }]
  },
  muku: {
    n:'ムク', e:'😶', cost:20, hp:60, dmg:20, spd:80, rng:50, ar:0.6,
    type:'ground', targets:'ground', cd:1.0, size:0.9, rew:2, zone:'own', unlockCost:200,
    attr:'beast', affinity:null, crt:1.5
  },
  niya: {
    n:'ニヤ', e:'😏', cost:100, hp:400, dmg:50, spd:50, rng:110, ar:1.5,
    type:'air', targets:'base', cd:10.0, size:1.4, rew:3, zone:'own', unlockCost:400,
    attr:'beast', affinity:'humanoid', crt:1.7
  },
  buchi: {
    n:'ブチ', e:'🤬', cost:50, hp:180, dmg:50, spd:30, rng:130, ar:2.0, area:50,
    type:'ground', targets:'ground', cd:5.0, size:1.2, rew:1, zone:'own', unlockCost:500,
    attr:'construct', affinity:'undead', crt:1.8
  },
  kaa: {
    n:'カァ', e:'😡', cost:100, hp:250, dmg:80, spd:30, rng:100, ar:1.5, area:40,
    type:'air', targets:'both', cd:10.0, size:1.3, rew:1, zone:'own', unlockCost:700,
    attr:'beast', affinity:'machine', crt:2.0,
    skills: [{ trigger:'onHit', effect:'freeze' }]
  },
  akuma: {
    n:'アクマ', e:'👿', cost:500, hp:1000, dmg:300, spd:8, rng:100, ar:5.0, area:80,
    type:'ground', targets:'both', cd:30.0, size:2.0, rew:1, zone:'own', unlockCost:1000,
    attr:'beast', affinity:null, crt:1.5
  },
  fireball: {
    n:'火炎弾', e:'💥', cost:50, type:'spell', effect:'damage', dmg:80, area:70, cd:8, unlockCost:300
  },
  heal_rain: {
    n:'癒しの雨', e:'💚', cost:50, type:'spell', effect:'heal', dmg:100, area:90, cd:15, unlockCost:300
  },
  freeze: {
    n:'フリーズ', e:'❄️', cost:50, type:'spell', effect:'stun', duration:3.0, area:60, cd:15, unlockCost:300
  }
};

// PLAYER_DECK は 10 要素の位置固定配列（null = 空スロット）
var PLAYER_DECK = [
  'nico','hoko','fuu','ikari','teko',
  null, null, null, null, null
];

function mkUnit(defId, team, x, y, d) {
  return {
    id      : uid_++,
    defId   : defId,
    team    : team,
    e       : d.e,
    img     : d.img    || null,
    nm      : d.n,
    hp      : d.hp,  mhp: d.hp,
    dmg     : d.dmg, spd: d.spd, rng: d.rng, ar: d.ar,
    area    : d.area   || 0,
    heal    : d.heal   || 0,
    rew     : d.rew    || 1,
    type    : d.type,
    targets : d.targets,
    isBase  : d.isBase || false,
    size    : d.size   || 1.0,
    attr    : d.attr   || null,       // 属性（特攻を受ける側）
    affinity: d.affinity || null,     // 特攻対象属性
    crt     : d.crt    || AFFINITY_BONUS_DEFAULT,  // 特攻倍率
    // スキル（配列参照をコピー。null でも動作する）
    skills  : d.skills ? d.skills.slice() : null,
    x: x, y: y,
    cd: 0, hcd: 0, dead: false, flash: 0,
    stuntimer: 0,
    knockVX : 0,
    knockVY : 0,
    swTimer : 0,
    currentTarget: null,
    // 状態異常フィールド
    baseSPD     : d.spd,
    slowStacks  : 0,
    slowTimer   : 0,
    poisonTimer : 0,
    poisonDmg   : 0,
    poisonAccum : 0,
    hasSplit    : false
  };
}
