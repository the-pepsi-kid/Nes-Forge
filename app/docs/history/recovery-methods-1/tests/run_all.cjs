'use strict';
// Stable public command; the strict runner owns the complete required suite set.
const path=require('node:path'),cp=require('node:child_process');
const result=cp.spawnSync(process.execPath,[path.join(__dirname,'run_candidate.cjs'),...process.argv.slice(2)],{stdio:'inherit',env:process.env});
if(result.error)console.error(result.error.message);
process.exitCode=result.status===0?0:(result.status||1);
