// Tests DeinArtSplits on a local chain. Start one first:  npx -y ganache@7 --chain.chainId 11155111 --wallet.deterministic --port 8545
//   node tools/contracts/test.mjs
import { ethers } from 'ethers';
import { readFileSync } from 'node:fs';
const SPLITS = new Function(readFileSync('prototype/assets/splits-contract.js', 'utf8') + '; return SPLITS;')();
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545', undefined, { cacheTimeout: -1 });          // no remembered answers: balances are read right after they change
const accounts = await provider.listAccounts(), [admin, maker, dp, editor, viewer, stranger] = accounts;
const eth = ethers.parseEther, fee = eth('0.0003'), key = 'a-film--abc123', idOf = (who, k) => ethers.solidityPackedKeccak256(['address', 'string'], [who.address, k]), id = idOf(maker, key);
let failed = 0;
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
// a call that must be refused: tried without sending it, so the reason comes back
const reverts = async (name, call, why) => { try { await call(); ok(name, false, 'was not refused'); } catch (e) { const said = String(e.reason || e.revert?.args?.[0] || e.shortMessage || e.message); ok(name, said.includes(why), '“' + said.slice(0, 50) + '”'); } };
const bal = a => provider.getBalance(a.address);

const c = await new ethers.ContractFactory(SPLITS.abi, SPLITS.bytecode, admin).deploy(ethers.ZeroAddress, fee); await c.waitForDeployment();
ok('deployed; the deployer is the treasury', (await c.treasury()) === admin.address && (await c.fee()) === fee);

await reverts('support for a film nobody recorded is refused', () => c.connect(viewer).support.staticCall(id, { value: eth('0.01') }), 'no such film');
await reverts('shares that do not add up are refused', () => c.connect(maker).register.staticCall(key, [maker.address, dp.address], [6000, 3000]), 'add up');
await reverts('a share with no wallet is refused', () => c.connect(maker).register.staticCall(key, [maker.address, ethers.ZeroAddress], [6000, 4000]), 'empty share');
await (await c.connect(maker).register(key, [maker.address, dp.address, editor.address], [5000, 3000, 2000])).wait();
ok('the contract and the site agree on a film\'s number', (await c.filmId(maker.address, key)) === id);
const s = await c.splitOf(id);
ok('the split is recorded', s[0] === maker.address && s[1].length === 3 && Number(s[2][0]) === 5000);
// someone else recording the same address gets a film of their own: the maker's split is untouched
await (await c.connect(stranger).register(key, [stranger.address], [10000])).wait();
ok('someone else cannot change it', (await c.splitOf(id))[1].length === 3 && (await c.splitOf(idOf(stranger, key)))[0] === stranger.address);
await reverts('a payment no larger than the fee is refused', () => c.connect(viewer).support.staticCall(id, { value: fee }), 'too small');

const before = await Promise.all([maker, dp, editor, admin].map(bal));
await (await c.connect(viewer).support(id, { value: eth('0.0103') })).wait();
const after = await Promise.all([maker, dp, editor, admin].map(bal)), got = after.map((b, i) => b - before[i]);
ok('0.01 after the fee is split 50 / 30 / 20', got[0] === eth('0.005') && got[1] === eth('0.003') && got[2] === eth('0.002'), got.slice(0, 3).map(ethers.formatEther).join(' / '));
ok('the fee went to the treasury', got[3] === fee);
ok('the film remembers what it received', (await c.splitOf(id))[3] === eth('0.0103') && Number((await c.splitOf(id))[4]) === 1);
ok('each person\'s total is kept', (await c.earned(dp.address)) === eth('0.003') && (await c.paid(id, editor.address)) === eth('0.002'));
ok('nothing stays in the contract', (await provider.getBalance(await c.getAddress())) === 0n);

// an amount that does not divide evenly: every wei is still paid
await (await c.connect(maker).register(key, [maker.address, dp.address, editor.address], [3333, 3333, 3334])).wait();
const b2 = await Promise.all([maker, dp, editor].map(bal));
await (await c.connect(viewer).support(id, { value: fee + 1000000000000001n })).wait();
const g2 = (await Promise.all([maker, dp, editor].map(bal))).map((b, i) => b - b2[i]);
ok('an uneven amount is paid to the last wei', g2[0] + g2[1] + g2[2] === 1000000000000001n && (await provider.getBalance(await c.getAddress())) === 0n, g2.join(' + '));

// a payee that cannot receive money does not block the others
const Refuser = new ethers.ContractFactory(['constructor()'], '0x6080604052348015600e575f80fd5b50603e80601a5f395ff3fe60806040525f80fdfea164736f6c6343000818000a', admin);
const refuser = await Refuser.deploy(); await refuser.waitForDeployment(); const ra = await refuser.getAddress();
const id2 = idOf(maker, 'another--def456');
await (await c.connect(maker).register('another--def456', [ra, dp.address], [5000, 5000])).wait();
const b3 = await bal(dp);
await (await c.connect(viewer).support(id2, { value: fee + eth('0.002') })).wait();
ok('a wallet that refuses money does not stop the others', (await bal(dp)) - b3 === eth('0.001') && (await c.owed(ra)) === eth('0.001'), 'owed ' + ethers.formatEther(await c.owed(ra)));
await reverts('nobody else can collect what is owed', () => c.connect(stranger).withdraw.staticCall(), 'nothing owed');
await reverts('only the admin sets the fee', () => c.connect(stranger).setFee.staticCall(1), 'not the admin');
await reverts('the fee has a ceiling', () => c.connect(admin).setFee.staticCall(eth('1')), 'fee too high');
console.log(failed ? `${failed} FAILED` : 'all passed'); process.exit(failed ? 1 : 0);
