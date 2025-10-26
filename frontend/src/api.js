export const BASE_URL = 'http://localhost:3000'


export async function buildUnsigned(action, amount, poolId, sender) {
try {
const resp = await fetch(`${BASE_URL}/build-unsigned`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ action, amount, pool_id: poolId, sender })
})
return await resp.json()
} catch (e) {
console.error(e)
return null
}
}


export async function submitSigned(signedXdr) {
try {
const resp = await fetch(`${BASE_URL}/submit-signed`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ signed_xdr: signedXdr })
})
return await resp.json()
} catch (e) {
console.error(e)
return null
}
}


export async function signWithFreighter(unsignedXdr, networkPassphrase) {
// Freighter demo: if Freighter is present, use it; otherwise return demo-signed
if (window.freighter) {
try {
// some freighter versions use signTransaction
if (typeof window.freighter.signTransaction === 'function') {
return await window.freighter.signTransaction(unsignedXdr, networkPassphrase)
}
// fallback method name
if (typeof window.freighter.sign === 'function') {
return await window.freighter.sign(unsignedXdr)
}
} catch (e) {
console.warn('Freighter sign failed', e)
}
}
return unsignedXdr + '_SIGNED_DEMO'
}