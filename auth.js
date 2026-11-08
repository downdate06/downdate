const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const DATA=process.env.DATA_FILE||path.join(__dirname,'accounts.json');
const START=100000;
let db=null;
const accounts=new Map(),sessions=new Map();
function hashPassword(pass,salt){return crypto.scryptSync(pass,salt,64).toString('hex');}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}
function safe(a){return a?{id:a.id,name:a.name,balance:a.balance,wins:a.wins,losses:a.losses}:null;}
async function init(){
 if(process.env.DATABASE_URL){const {Pool}=require('pg');db=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});
 await db.query('CREATE TABLE IF NOT EXISTS yut_accounts (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL, balance INTEGER NOT NULL, wins INTEGER NOT NULL, losses INTEGER NOT NULL)');
 await db.query('CREATE TABLE IF NOT EXISTS yut_sessions (hash TEXT PRIMARY KEY, id TEXT NOT NULL)');
 const a=await db.query('SELECT * FROM yut_accounts');for(const x of a.rows)accounts.set(x.id,x);
 const s=await db.query('SELECT * FROM yut_sessions');for(const x of s.rows)sessions.set(x.hash,x.id);
 console.log('계정 저장소: PostgreSQL 연결 완료');
 }else{try{const loaded=JSON.parse(fs.readFileSync(DATA,'utf8'));for(const a of loaded.accounts||[])accounts.set(a.id,a);for(const [k,v] of loaded.sessions||[])sessions.set(k,v);}catch{}console.warn('경고: DATABASE_URL 없음. Render 재시작 시 계정 데이터가 초기화될 수 있습니다.');}
}
async function save(){if(db){for(const a of accounts.values())await db.query('INSERT INTO yut_accounts (id,name,salt,password,balance,wins,losses) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET balance=EXCLUDED.balance,wins=EXCLUDED.wins,losses=EXCLUDED.losses',[a.id,a.name,a.salt,a.password,a.balance,a.wins,a.losses]);for(const [hash,id] of sessions)await db.query('INSERT INTO yut_sessions(hash,id) VALUES ($1,$2) ON CONFLICT(hash) DO NOTHING',[hash,id]);}
 else{const temp=DATA+'.tmp';fs.writeFileSync(temp,JSON.stringify({accounts:[...accounts.values()],sessions:[...sessions]}),{mode:0o600});fs.renameSync(temp,DATA);}}
async function register(name,password){if(process.env.NODE_ENV==='production'&&!db)throw Error('영구 데이터베이스가 연결되지 않았습니다. Render에 DATABASE_URL을 설정한 뒤 회원가입해 주세요.');name=String(name||'').trim();if(!/^[\p{L}\p{N}_-]{2,16}$/u.test(name))throw Error('아이디는 한글·영문·숫자 2~16자로 입력해 주세요.');if(typeof password!=='string'||password.length<8||password.length>128)throw Error('비밀번호는 8자 이상 입력해 주세요.');if([...accounts.values()].some(a=>a.name===name))throw Error('이미 사용 중인 아이디입니다.');
 const salt=crypto.randomBytes(16).toString('hex'),id=crypto.randomUUID();const a={id,name,salt,password:hashPassword(password,salt),balance:START,wins:0,losses:0};accounts.set(id,a);await save();return login(name,password);}
async function login(name,password){const a=[...accounts.values()].find(a=>a.name===name);if(!a||typeof password!=='string'||!crypto.timingSafeEqual(Buffer.from(hashPassword(password,a.salt),'hex'),Buffer.from(a.password,'hex')))throw Error('아이디 또는 비밀번호를 확인해 주세요.');const token=crypto.randomBytes(32).toString('hex');sessions.set(tokenHash(token),a.id);await save();return {token,account:safe(a)};}
function byToken(token){return accounts.get(sessions.get(tokenHash(String(token||''))))||null;}
function get(id){return accounts.get(id)||null;}
async function refill(id){if(process.env.NODE_ENV==='production'&&!db)throw Error('데이터베이스 연결 후 이용할 수 있습니다.');const a=get(id);if(!a)throw Error('로그인이 필요합니다.');if(a.balance!==0)throw Error('잔액이 0머니일 때만 충전할 수 있습니다.');a.balance=START;await save();return safe(a);}
async function debit(ids,amount){if(!amount)return;if(process.env.NODE_ENV==='production'&&!db)throw Error('게임머니 대전은 데이터베이스 연결 후 이용할 수 있습니다.');const list=ids.map(get);if(list.some(a=>!a||a.balance<amount))throw Error('참가자 중 가상 머니가 부족한 사람이 있습니다.');for(const a of list)a.balance-=amount;await save();}
async function settle(ids,winnerIds,pot){for(const id of ids){const a=get(id);if(a){if(winnerIds.includes(id))a.wins++;else a.losses++;}}
 const part=Math.floor(pot/winnerIds.length);for(const id of winnerIds){const a=get(id);if(a)a.balance+=part;}await save();}
function isPersistent(){return !!db;}
module.exports={init,register,login,byToken,get,safe,refill,debit,settle,isPersistent};
