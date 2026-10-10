import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

for(const name of ['check-flow.mjs','check-ui.mjs']){
  const file=fileURLToPath(new URL('../tests/'+name,import.meta.url));
  const result=spawnSync(process.execPath,[file],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
