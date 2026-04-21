// unit.js — Player unit definitions & shared constants

var W = 390, BH = 510;
var EBY = 58, PBY = BH - 60;
var ESY = EBY + 52, PSY = PBY - 52;

// ── ユニット定義フィールド凡例 ──────────────────────────
// targets : 'ground' | 'air' | 'both' | 'base'（拠点のみ）
// isBase  : true = targets:'base' の相手から攻撃される
// img     : 画像相対パス（省略時は絵文字）
// skills  : [ { trigger, effect, value?, range?, duration? }, ... ]
//   trigger : 'onHit' | 'onAttack' | 'onDeath'
//   effect  : 'thunder' | 'slow' | 'poison' | 'heal' | 'split' | 'freeze' | 'pierce'

var PLAYER_UNITS = {
  nyanko: {
    n:'ニャンコ', e:'🐱', cost:20, hp:80, dmg:13, spd:55, rng:30, ar:1.0,
    type:'ground', targets:'ground', cd:0.5, size:1.0, rew:1, zone:'own', unlockCost:0
  },
  wanko: {
    n:'ワンコ', e:'🐶', cost:20, hp:80, dmg:20, spd:35, rng:30, ar:1.0,
    type:'ground', targets:'ground', cd:0.5, size:1.0, rew:1, zone:'own', unlockCost:0,
    // 死亡時に 2 体に分裂（序盤の壁役として機能）
    skills: [{ trigger:'onDeath', effect:'split' }]
  },
  bolt: {
    n:'ボルト', e:'⚡', cost:20, hp:44, dmg:10, spd:135, rng:30, ar:0.9,
    type:'ground', targets:'ground', cd:0.5, size:0.8, rew:1, zone:'own', unlockCost:0
  },
  soldier: {
    n:'ソルジャー', e:'🗡️', cost:10, hp:120, dmg:18, spd:60, rng:55, ar:1.0,
    type:'ground', targets:'ground', cd:1.2, size:1.0, rew:1, zone:'own', unlockCost:0
  },
  archer: {
    n:'アーチャー', e:'🏹', cost:15, hp:90, dmg:28, spd:48, rng:140, ar:1.2,
    type:'ground', targets:'both', cd:1.6, size:1.0, rew:1, zone:'own', unlockCost:0,
    // 矢が当たると移動速度を低下
    skills: [{ trigger:'onHit', effect:'slow' }]
  },
  golem: {
    n:'ゴーレム', e:'🛡️', cost:50, hp:420, dmg:15, spd:24, rng:30, ar:1.3,
    type:'ground', targets:'ground', isBase:true, cd:3.0, size:1.5, rew:2, zone:'own', unlockCost:300
  },
  sniper: {
    n:'スナイパー', e:'🎯', cost:30, hp:55, dmg:34, spd:40, rng:100, ar:1.2,
    type:'ground', targets:'both', cd:2.0, size:0.9, rew:1, zone:'all', unlockCost:250,
    // 弾が射程全体を貫通する
    skills: [{ trigger:'onHit', effect:'pierce' }]
  },
  assassin: {
    n:'アサシン', e:'🥷', cost:20, hp:70, dmg:45, spd:110, rng:50, ar:0.8,
    type:'ground', targets:'ground', cd:1.5, size:0.9, rew:2, zone:'all', unlockCost:350,
    // 攻撃で相手のターゲットをリセット（混乱させる）
    skills: [{ trigger:'onHit', effect:'thunder' }]
  },
  mage: {
    n:'メイジ', e:'🔥', cost:28, hp:100, dmg:38, spd:40, rng:120, ar:1.4,
    type:'ground', targets:'both', cd:2.2, size:1.0, rew:2, zone:'all', unlockCost:400, area:20,
    // 攻撃で毒を付与
    skills: [{ trigger:'onHit', effect:'poison' }]
  },
  wolf: {
    n:'ウルフ', e:'🐺', cost:12, hp:85, dmg:16, spd:120, rng:50, ar:0.9,
    type:'ground', targets:'ground', cd:1.0, size:0.9, rew:1, zone:'own', unlockCost:200,
    // 攻撃するたびに周囲の味方を少し回復
    skills: [{ trigger:'onAttack', effect:'heal', value:6, range:75 }]
  },
  wyvern: {
    n:'ワイバーン', e:'🦇', cost:50, hp:260, dmg:42, spd:55, rng:110, ar:1.3,
    type:'air', targets:'both', cd:2.5, size:1.2, rew:3, zone:'all', unlockCost:600,
    // 攻撃で相手のターゲットをリセット
    skills: [{ trigger:'onHit', effect:'thunder' }]
  },
  cannoner: {
    n:'キャノン', e:'💣', cost:35, hp:180, dmg:65, spd:30, rng:130, ar:2.2,
    type:'ground', targets:'ground', cd:3.0, size:1.1, rew:2, zone:'own', unlockCost:500, area:35
    // ar=2.2 → 自動で重攻撃ビジュアルが適用される（スキル不要）
  },
  dragon: {
    n:'ドラゴン', e:'🐉', cost:70, hp:220, dmg:78, spd:34, rng:80, ar:1.6,
    type:'air', targets:'both', cd:4.0, size:1.3, rew:3, zone:'all', unlockCost:900, area:30,
    // 攻撃で凍結
    skills: [{ trigger:'onHit', effect:'freeze', duration:1.5 }]
  },
  fireball: {
    n:'火炎弾', e:'🔥', cost:30, type:'spell', effect:'damage', dmg:120, area:70, cd:8, unlockCost:350
  },
  heal_rain: {
    n:'癒しの雨', e:'✨', cost:25, type:'spell', effect:'heal', dmg:60, area:90, cd:12, unlockCost:400
  },
  freeze: {
    n:'フリーズ', e:'❄️', cost:20, type:'spell', effect:'stun', duration:3.0, area:60, cd:15, unlockCost:450
  }
};

// PLAYER_DECK は 10 要素の位置固定配列（null = 空スロット）
var PLAYER_DECK = [
  'nyanko','wanko','bolt','soldier','archer',
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
    baseSPD     : d.spd,   // スロウ計算用の基礎速度
    slowStacks  : 0,
    slowTimer   : 0,
    poisonTimer : 0,
    poisonDmg   : 0,
    poisonAccum : 0,
    hasSplit    : false    // 分裂済みフラグ
  };
}
