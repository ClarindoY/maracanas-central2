import {writeFileSync} from 'node:fs';
const info={version:'V47.7',buildAt:new Date().toISOString(),commit:process.env.RENDER_GIT_COMMIT?.slice(0,8)||process.env.GITHUB_SHA?.slice(0,8)||'local'};
writeFileSync(new URL('../src/deploy-info.json',import.meta.url),JSON.stringify(info,null,2)+'\n');
console.log('Build REPMAR:',info);
