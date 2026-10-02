import {mkdir,copyFile,rm} from 'node:fs/promises';
const output=new URL('./dist/',import.meta.url);
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
// Explicit allowlist: never upload the repository, secrets, notes, or QA files.
for(const file of ['index.html','styles.css','app.js'])await copyFile(new URL(file,import.meta.url),new URL(file,output));
console.log('Built 3 public assets into dist/');
