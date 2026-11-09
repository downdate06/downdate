'use strict';
const {splitPool}=require('./missions');
const STAKES=[0,1000,5000,10000];
function entryCost(stake){if(!STAKES.includes(stake))throw Error('잘못된 참가비');return stake*2;}
function initEconomy(playerCount,stake){return {stake,entryCost:entryCost(stake),unit:stake/10,finePot:0,fineSpent:Array(playerCount).fill(0),captureStreak:Array(playerCount).fill(0),capturingTurn:Array(playerCount).fill(-1),events:[],payouts:null};}
function captured(economy,actor,victims,turn){if(!economy||!victims.length)return [];if(economy.capturingTurn[actor]!==turn){economy.capturingTurn[actor]=turn;economy.captureStreak[actor]=0;}
 economy.captureStreak[actor]++;
 const multiplier=[1,2,4,6,8,10][Math.min(economy.captureStreak[actor]-1,5)];const grouped=new Map();for(const v of victims)grouped.set(v.player,(grouped.get(v.player)||0)+1);
 const penalties=[];for(const [player,number]of grouped){const nominal=Math.round(economy.unit*2**(number-1)*multiplier);const available=Math.max(0,economy.stake-economy.fineSpent[player]);const paid=Math.min(nominal,economy.stake*5,available);economy.fineSpent[player]+=paid;economy.finePot+=paid;penalties.push({player,number,nominal,paid,multiplier});}
 economy.events.unshift({actor,turn,penalties});economy.events=economy.events.slice(0,20);return penalties;
}
function settle(economy,scores,winner){const n=economy.fineSpent.length,stake=economy.stake;if(!stake){economy.payouts=Array(n).fill(0);return economy.payouts;}const total=stake*n,missionPool=Math.floor(total*.1),mission=splitPool(missionPool,scores,winner);const payouts=economy.fineSpent.map((paid,i)=>stake-paid+mission[i]+(i===winner?total-missionPool+economy.finePot:0));if(payouts.reduce((a,b)=>a+b,0)!==n*stake*2)throw Error('게임머니 보존 규칙 위반');economy.payouts=payouts;return payouts;}
module.exports={entryCost,initEconomy,captured,settle};
