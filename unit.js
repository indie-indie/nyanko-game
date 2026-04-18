// unit.js — Player unit definitions & shared constants

var W = 390, BH = 510;
var EBY = 58, PBY = BH - 60;
var ESY = EBY + 52, PSY = PBY - 52;

// type   : 'ground' | 'air'
// targets: 'base' | 'ground' | 'air' | 'both'
//          'base'   → ignores all units, beelines to enemy base
//          'ground' → fights ground units only
//          'air'    → fights air units only
//          'both'   → fights any unit
// cd     : summon cooldown (seconds)
// size   : emoji & HP-bar scale multiplier
// rew    : gold rewarded to attacker on kill (unused for player units)

var PLAYER_UNITS = {
  nyanko: {
    n:'ニャンコ', e:'🐱', cost:20,
    hp:80,  dmg:13, spd:55,  rng:30,  ar:1.0,
    type:'ground', targets:'ground',
    cd:0.5, size:1.0, rew:1
  },
  wanko: {
    n:'ワンコ', e:'🐶', cost:20,
    hp:80,  dmg:20, spd:35,  rng:30,  ar:1.0,
    type:'ground', targets:'ground',
    cd:0.5, size:1.0, rew:1
  },
  golem: {
    n:'ゴーレム', e:'🛡️', cost:50,
    hp:420, dmg:15, spd:24,  rng:30,  ar:1.3,
    type:'ground', targets:'ground',
    cd:3.0, size:1.5, rew:2
  },
  sniper: {
    n:'スナイパー', e:'🎯', cost:30,
    hp:55,  dmg:34, spd:40,  rng:100, ar:1.2,
    type:'ground', targets:'both',
    cd:2.0, size:0.9, rew:1
  },
  bolt: {
    n:'ボルト', e:'⚡', cost:20,
    hp:44,  dmg:10, spd:135, rng:30,  ar:0.9,
    type:'ground', targets:'ground',
    cd:0.5, size:0.8, rew:1
  },
    soldier: {
      n:'ソルジャー', e:'🗡️', cost:10,
      hp:120, dmg:18, spd:60, rng:55, ar:1.0,
      type:'ground', targets:'ground',
      cd:1.2, size:1.0, rew:1
    },  
    archer: {
      n:'アーチャー', e:'🏹', cost:15,
      hp:90, dmg:28, spd:48, rng:140, ar:1.2,
      type:'ground', targets:'both',
      cd:1.6, size:1.0, rew:1
    }, 
    assassin: {
      n:'アサシン', e:'🗡️', cost:20,
      hp:70, dmg:45, spd:110, rng:50, ar:0.8,
      type:'ground', targets:'ground',
      cd:1.5, size:0.9, rew:2
    }, 
    mage: {
      n:'メイジ', e:'🔥', cost:28,
      hp:100, dmg:38, spd:40, rng:120, ar:1.4,
      type:'ground', targets:'both',
      cd:2.2, size:1.0, area:20, rew:2
    },
      wolf: {
      n:'ウルフ', e:'🐺', cost:12,
      hp:85, dmg:16, spd:120, rng:50, ar:0.9,
      type:'ground', targets:'ground',
      cd:1.0, size:0.9, rew:1
    }, 
    wyvern: {
      n:'ワイバーン', e:'🦇', cost:50,
      hp:260, dmg:42, spd:55, rng:110, ar:1.3,
      type:'air', targets:'both',
      cd:2.5, size:1.2, rew:3
    },
  
    cannoner: {
      n:'キャノン', e:'💣', cost:35,
      hp:180, dmg:65, spd:30, rng:130, ar:2.2,
      type:'ground', targets:'ground',
      cd:3.0, size:1.1, area:35, rew:2
    },
  dragon: {
    n:'ドラゴン', e:'🐉', cost:70,
    hp:220, dmg:78, spd:34,  rng:80, ar:1.6,
    type:'air', targets:'both',
    cd:4.0, size:1.3, area:30, rew:3
  }
  };

// 全ユニットの中から使いたい10体だけを配列にする
var PLAYER_DECK = ['wanko', 'golem', 'sniper', 'bolt', 'dragon','nyanko', 'archer', 'wolf', 'cannoner', 'wyvern'];

// Factory — creates a live unit instance
function mkUnit(defId, team, x, y, d) {
  return {
    id      : uid_++,
    defId   : defId,
    team    : team,
    e: d.e, nm: d.n,
    hp: d.hp, mhp: d.hp,
    dmg: d.dmg, spd: d.spd, rng: d.rng, ar: d.ar,
    area    : d.area || 0,
    heal    : d.heal || 0,
    rew     : d.rew  || 1,
    type    : d.type,
    targets : d.targets,
    size    : d.size || 1.0,
    x: x, y: y,
    cd: 0, hcd: 0, dead: false, flash: 0
  };
}
