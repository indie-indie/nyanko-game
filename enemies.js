// enemies.js — Enemy unit definitions

var ENEMY_UNITS = {
  gremlin: {
    n:'グレムリン', e:'👹',
    hp:72,  dmg:10, spd:58,  rng:55,  ar:1.0,
    type:'ground', targets:'ground',
    size:1.0, rew:5
  },
  ironbot: {
    n:'アイアンボット', e:'🤖',
    hp:360, dmg:22, spd:22,  rng:55,  ar:1.3,
    type:'ground', targets:'ground',
    size:1.5, rew:10
  },
  shade: {
    n:'シェード', e:'💀',
    hp:44,  dmg:14, spd:105, rng:52,  ar:0.9,
    type:'ground', targets:'ground',
    size:0.8, rew:5
  },
  warlock: {
    n:'ウォーロック', e:'🔮',
    hp:90,  dmg:36, spd:30,  rng:165, ar:1.4,
    type:'air', targets:'both',
    size:1.0, rew:10
  },
    slime: {
      n:'スライム', e:'🟢',
      hp:40, dmg:8, spd:50, rng:45, ar:1.0,
      type:'ground', targets:'ground',
      size:0.8, rew:10
    },  
    goblin: {
      n:'ゴブリン', e:'👺',
      hp:70, dmg:14, spd:65, rng:50, ar:1.0,
      type:'ground', targets:'ground',
      size:0.9, rew:15
    },
    orc: {
      n:'オーク', e:'🪓',
      hp:160, dmg:28, spd:45, rng:55, ar:1.2,
      type:'ground', targets:'ground',
      size:1.1,area:15, rew:25
    },
    lancer: {
      n:'ランサー', e:'🔱',
      hp:120, dmg:32, spd:55, rng:90, ar:1.3,
      type:'ground', targets:'both',
      size:1.0,area:30, rew:25
    }, 
  garpy: {
    n:'ガーピー', e:'🦅',
    hp:55,  dmg:18, spd:85,  rng:55,  ar:1.0,
    type:'air', targets:'both',
    size:0.9, rew:20
  }
};
