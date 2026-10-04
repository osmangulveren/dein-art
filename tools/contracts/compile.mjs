// Compiles contracts/DeinArtSplits.sol and writes prototype/assets/splits-contract.js (the ABI and bytecode the site uses).
//   node tools/contracts/compile.mjs        (fetches solc 0.8.24 through npx the first time)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = mkdtempSync(join(tmpdir(), 'deinart-solc-'));
execSync(`npx -y solc@0.8.24 --optimize --optimize-runs 200 --bin --abi -o "${out}" contracts/DeinArtSplits.sol`, { stdio: 'inherit' });
const file = ext => readFileSync(join(out, readdirSync(out).find(f => f.endsWith('DeinArtSplits.' + ext))), 'utf8').trim();
const abi = JSON.parse(file('abi')), bytecode = '0x' + file('bin');
const old = (() => { try { return (readFileSync('prototype/assets/splits-contract.js', 'utf8').match(/address: "(0x[0-9a-fA-F]{40})"/) || [])[1] || ''; } catch { return ''; } })();
writeFileSync('prototype/assets/splits-contract.js', `// DeinArtSplits, compiled from contracts/DeinArtSplits.sol with solc 0.8.24 (optimizer on). Do not edit by hand.
// The address is read from the site (/api/config) once the contract is deployed; the one written here is only a fallback.
const SPLITS = { chainId: 11155111, chainName: "Sepolia", rpc: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io", fee: "0.0003", address: "${old}", abi: ${JSON.stringify(abi)}, bytecode: "${bytecode}" };\n`);
console.log('wrote prototype/assets/splits-contract.js:', abi.filter(x => x.type === 'function').map(x => x.name).join(', '), '·', (bytecode.length - 2) / 2, 'bytes');
