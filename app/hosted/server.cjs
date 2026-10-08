#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {Store}=require('./store.cjs'),{WorldService}=require('./service.cjs'),{PROFILE,WorldError}=require('./domain.cjs');
const BODY_LIMIT=16384;
const assets={'/':['index.html','text/html; charset=utf-8'],'/demo.js':['demo.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
function response(res,status,value) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req) {
  if((req.headers['content-type']||'').split(';')[0].trim()!=='application/json')throw new WorldError('content_type','Send application/json.',415);
  if(req.headers['content-length']&&Number(req.headers['content-length'])>BODY_LIMIT)throw new WorldError('body','Request is too large.',413);
  let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>BODY_LIMIT)throw new WorldError('body','Request is too large.',413);chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new WorldError('json','Request JSON is malformed.',400);}
}
async function start({directory,port=8787,world={}}={}) {
  if(!directory)throw new Error('A data directory is required.');if(!Number.isSafeInteger(port)||port<0||port>65535)throw new Error('Port must be 0–65535.');
  const store=await Store.open(directory,world),service=new WorldService(store);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    try {
      const address=server.address(),expected='127.0.0.1:'+address.port;
      // DNS-rebinding and cross-site browser access are refused. This profile
      // deliberately offers no CORS wildcard or remote listen option.
      if(req.headers.host!==expected&&req.headers.host!=='localhost:'+address.port)throw new WorldError('host','Use the displayed loopback address.',403);
      if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)throw new WorldError('origin','Cross-origin requests are not supported by this local profile.',403);
      if(req.headers['sec-fetch-site']&& !['same-origin','none'].includes(req.headers['sec-fetch-site']))throw new WorldError('origin','Cross-site browser requests are not supported.',403);
      const url=new URL(req.url,'http://'+expected);if(url.search)throw new WorldError('route','Query parameters are unsupported.',400);
      if(req.method==='GET'&&Object.hasOwn(assets,url.pathname)) {
        const [file,type]=assets[url.pathname];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await fs.readFile(path.join(__dirname,'public',file)));return;
      }
      if(req.method==='GET'&&url.pathname==='/v1/health') {await store.read(()=>true);response(res,200,{status:'ready',profile:PROFILE.id,capability:'local authoritative ordinary items',wallets:false,romBridge:false});return;}
      if(req.method==='POST'&&url.pathname==='/v1/sessions') {response(res,201,await service.join(await body(req)));return;}
      const authorization=req.headers.authorization||'',token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
      if(req.method==='GET'&&url.pathname==='/v1/state') {response(res,200,await service.snapshot(token));return;}
      if(req.method==='POST'&&url.pathname==='/v1/intents') {const result=await service.intent(token,await body(req));response(res,result.accepted?200:result.error.status,result);return;}
      throw new WorldError('route','Route not found.',404);
    }catch(error){const known=error instanceof WorldError;response(res,known?error.status:500,{error:{code:known?error.code:'internal',message:known?error.message:'Storage or server failure. No successful outcome is acknowledged; retry the identical request after restart.'}});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=1000;server.maxConnections=64;
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){await store.close();throw error;}
  return {server,service,store,url:'http://127.0.0.1:'+server.address().port,
    async close(){await new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeIdleConnections();});await store.close();}};
}
if(require.main===module) {
  (async()=>{
    const args=process.argv.slice(2),options={directory:path.join(process.cwd(),'forge-hosted-data')};
    for(let index=0;index<args.length;index++){const key=args[index];if(key==='--data'&&args[index+1])options.directory=path.resolve(args[++index]);else if(key==='--port'&&args[index+1])options.port=Number(args[++index]);else if(key==='--config'&&args[index+1])options.world=JSON.parse(await fs.readFile(args[++index],'utf8'));else throw Error('Usage: node hosted/server.cjs [--data DIRECTORY] [--port NUMBER] [--config WORLD_CONFIG.json]');}
    const app=await start(options);process.stdout.write(JSON.stringify({ready:true,url:app.url,directory:options.directory,profile:PROFILE.id})+'\n');
    let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(!stopping){stopping=true;app.close().then(()=>process.exit(0),error=>{process.stderr.write(error.message+'\n');process.exit(1);});}});
  })().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
}
module.exports={start,BODY_LIMIT};
