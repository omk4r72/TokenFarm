const BASE_URL = 'http://localhost:3000';

export async function buildUnsigned(action, amount, poolId, sender) {
    const resp = await fetch(`${BASE_URL}/build-unsigned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount, pool_id: poolId, sender })
    });
    return await resp.json();
}

export async function submitSigned(signedXdr) {
    const resp = await fetch(`${BASE_URL}/submit-signed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_xdr: signedXdr })
    });
    return await resp.json();
}

export async function signWithFreighter(unsignedXdr, networkPassphrase) {
    if (window.freighter) {
        try {
            return await window.freighter.signTransaction(unsignedXdr, networkPassphrase);
        } catch (e) {
            console.warn('Freighter signing failed', e);
        }
    }
    // demo fallback
    return unsignedXdr + "_SIGNED_DEMO";
}
