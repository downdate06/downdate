function afterMove(r,priorTurn,captured,now,turnMs){
 if(r.game.winner!==null){r.deadline=null;r.autoMove=false;return;}
 if(r.game.turn!==priorTurn||captured>0){r.autoMove=false;r.deadline=now+turnMs;}
}
module.exports={afterMove};
