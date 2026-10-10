import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,relative,extname,isAbsolute,sep} from 'node:path';

const types={
  '.html':'text/html; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon',
  '.csv':'text/csv; charset=utf-8',
  '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

export function createHandler(directory){
  const root=resolve(directory);
  return async function handle(request,response){
    const finish=(status,body,headers={})=>{
      response.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...headers});
      response.end(request.method==='HEAD'?undefined:body);
    };
    if(!['GET','HEAD'].includes(request.method))return finish(405,'Method not allowed',{Allow:'GET, HEAD'});
    let pathname;
    try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}
    catch{return finish(400,'Invalid URL');}
    if(pathname.includes('\0'))return finish(400,'Invalid URL');
    let file=resolve(root,pathname.replace(/^\/+/,''));
    const rel=relative(root,file);
    if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))return finish(403,'Forbidden');
    try{
      let info;
      try{info=await stat(file);}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;}
      if(info?.isDirectory())file=resolve(file,'index.html');
      else if(!info){
        if(extname(pathname))return finish(404,'Not found');
        // State-driven views also work when the app is opened at /auction.
        file=resolve(root,'index.html');
      }
      const content=await readFile(file);
      response.writeHead(200,{
        'Content-Type':types[extname(file)]||'application/octet-stream',
        'Content-Length':content.length,
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff'
      });
      response.end(request.method==='HEAD'?undefined:content);
    }catch(error){
      const missing=['ENOENT','ENOTDIR','EISDIR'].includes(error.code);
      if(!missing)console.error('Could not serve a file:',error.message);
      finish(missing?404:500,missing?'Not found':'Server error');
    }
  };
}

export function serve(directory,defaultPort){
  if(!existsSync(resolve(directory,'index.html')))throw Error('Build files are missing. Run npm run build first.');
  const args=process.argv.slice(2),portIndex=args.indexOf('--port');
  const requested=args.find(arg=>arg.startsWith('--port='))?.slice(7)??(portIndex>=0?args[portIndex+1]:undefined);
  if(portIndex>=0&&!requested)throw Error('Supply a port after --port.');
  const port=Number(requested??process.env.PORT??defaultPort);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port must be a whole number between 1 and 65535.');
  const server=createServer(createHandler(directory));
  server.on('error',error=>{
    console.error(error.code==='EADDRINUSE'?`Port ${port} is busy. Try npm run dev -- --port ${port+1}.`:error.message);
    process.exitCode=1;
  });
  server.listen(port,'127.0.0.1',()=>console.log(`Auction House is running at http://localhost:${port}\nPress Ctrl+C to stop. Refresh your browser after editing source files.`));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());
  return server;
}
