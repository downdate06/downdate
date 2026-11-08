const http=require('http');const fs=require('fs');const path=require('path');const crypto=require('crypto');
const {createGame,movesFor,roll,move}=require('./game');
const PORT=Number(process.env.PORT)||3000;const HOST=process.env.HOST||'0.0.0.0';
const PUBLIC=path.join(__dirname,'public');const rooms=new Map();const clients=new Set();
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}if(pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,rooms:rooms.size}));}
 const filename=path.resolve(PUBLIC,'.'+pathname.replace(/\/$/,'/index.html'));if(!filename.startsWith(PUBLIC+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});});
function frame(data,opcode=1){let buf=Buffer.from(data);const len=buf.length;let head;if(len<126){head=Buffer.alloc(2);head[1]=len;}else if(len<65536){head=Buffer.alloc(4);head[1]=126;head.writeUInt16BE(len,2);}else{head=Buffer.alloc(10);head[1]=127;head.writeBigUInt64BE(BigInt(len),2);}head[0]=0x80|opcode;return Buffer.concat([head,buf]);}
function send(c,obj){if(c.socket.destroyed)return;try{c.socket.write(frame(JSON.stringify(obj)));}catch{}}
function stateFor(room,player){return {type:'state',room:room.code,player,game:room.game,moves:player===null?[]:movesFor(room.game,player)};}
function broadcast(room){for(const c of clients)if(c.room===room.code)send(c,stateFor(room,c.player));}
function error(c,msg){send(c,{type:'error',message:msg});}
function cleanName(x){return String(x||'플레이어').trim().slice(0,12)||'플레이어';}
function code(){let c;do{c=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(c));return c;}
function handle(c,msg){if(!msg||typeof msg!=='object')return;
 try{
 if(msg.type==='create'){const id=code(),g=createGame(msg.mode||'individual',msg.mode==='team'?4:Number(msg.playerCount??4));g.players[0].name=cleanName(msg.name);g.players[0].connected=true;rooms.set(id,{code:id,game:g,owners:Array.from({length:g.playerCount},(_,i)=>i===0?c.session:null),updated:Date.now()});c.room=id;c.player=0;broadcast(rooms.get(id));return;}
 if(msg.type==='join'){const id=String(msg.room||'').trim().toUpperCase();const room=rooms.get(id);if(!room)throw Error('방을 찾을 수 없습니다. 방 코드를 확인해 주세요.');
 let slot=room.owners.indexOf(c.session);if(slot===-1){slot=room.owners.indexOf(null);if(slot===-1)throw Error('이 방은 정원이 '+room.game.playerCount+'명입니다.');room.owners[slot]=c.session;room.game.players[slot].name=cleanName(msg.name);}
 if(c.room&&c.room!==id){const old=rooms.get(c.room);if(old&&c.player!==null)old.game.players[c.player].connected=false;}
 c.room=id;c.player=slot;room.game.players[slot].connected=true;room.updated=Date.now();broadcast(room);return;}
 const room=rooms.get(c.room);if(!room||c.player===null||room.owners[c.player]!==c.session)throw Error('먼저 게임방에 입장해 주세요.');
 if(!room.game.players.every(p=>p.name))throw Error(room.game.playerCount+'명이 모두 입장할 때까지 기다려 주세요.');
 if(!room.game.players.every(p=>p.connected))throw Error('모든 참가자가 연결될 때까지 기다려 주세요.');
 if(msg.type==='roll'){roll(room.game,c.player);broadcast(room);}else if(msg.type==='move'){move(room.game,c.player,Number(msg.piece),String(msg.route));broadcast(room);}else if(msg.type==='rematch'){if(room.game.winner===null)throw Error('게임이 끝난 후 다시 시작할 수 있습니다.');const old=room.game;room.game=createGame(old.mode,old.playerCount);room.game.players=old.players.map(p=>({...p}));broadcast(room);}else throw Error('알 수 없는 요청입니다.');room.updated=Date.now();
 }catch(e){error(c,e.message);}}
server.on('upgrade',(req,socket)=>{if(new URL(req.url,'http://localhost').pathname!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return;}
 const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const c={socket,buffer:Buffer.alloc(0),room:null,player:null,session:null};clients.add(c);
 socket.on('data',chunk=>{c.buffer=Buffer.concat([c.buffer,chunk]);if(c.buffer.length>1024*1024){socket.destroy();return;}
 while(c.buffer.length>=2){let n=c.buffer[1]&127,off=2;const op=c.buffer[0]&15,masked=!!(c.buffer[1]&128);if(!(c.buffer[0]&128)){socket.destroy();return;}if(n===126){if(c.buffer.length<4)break;n=c.buffer.readUInt16BE(2);off=4;}else if(n===127){if(c.buffer.length<10)break;const big=c.buffer.readBigUInt64BE(2);if(big>BigInt(65536)){socket.destroy();return;}n=Number(big);off=10;}
 if(!masked){socket.destroy();return;}if(c.buffer.length<off+4+n)break;const mask=c.buffer.subarray(off,off+4);off+=4;const payload=Buffer.from(c.buffer.subarray(off,off+n));c.buffer=c.buffer.subarray(off+n);for(let i=0;i<n;i++)payload[i]^=mask[i%4];
 if(op===8){socket.end(frame('',8));return;}if(op===9){socket.write(frame(payload,10));continue;}if(op!==1)continue;
 try{const msg=JSON.parse(payload.toString('utf8'));if(msg.type==='hello'){c.session=String(msg.session||'').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80);if(!c.session)throw Error('연결 정보 오류');send(c,{type:'hello',ok:true});if(msg.room)handle(c,{type:'join',room:msg.room,name:msg.name});}else if(c.session)handle(c,msg);}catch(e){error(c,e.message||'메시지 오류');}
 }
 });
 socket.on('close',()=>{clients.delete(c);disconnect(c);});socket.on('error',()=>{});
 function disconnect(c){if(!c.room)return;const r=rooms.get(c.room);if(!r)return;const other=Array.from(clients).some(other=>other.room===c.room&&other.player===c.player&&other.session===c.session);if(!other&&c.player!==null)r.game.players[c.player].connected=false;broadcast(r);}
});
setInterval(()=>{const now=Date.now();for(const [id,r] of rooms)if(now-r.updated>24*60*60*1000)rooms.delete(id);},60*60*1000).unref();
server.listen(PORT,HOST,()=>console.log(`윷놀이 서버: http://localhost:${PORT}`));
