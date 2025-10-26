// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('../frontend')); // serve frontend folder

const PORT = process.env.PORT || 3000;

// Demo build-unsigned endpoint
app.post('/build-unsigned', async (req, res) => {
    const { action, amount, pool_id, sender } = req.body;
    if (!sender) return res.status(400).json({ error: 'sender required' });

    const unsignedXdr = `DEMO_UNSIGNED_XDR|${action}|${amount}|${pool_id}|FROM|${sender}`;
    return res.json({
        unsigned_xdr: unsignedXdr,
        network_passphrase: 'Test SDF Network ; September 2015'
    });
});

// Demo submit-signed endpoint
app.post('/submit-signed', async (req, res) => {
    const { signed_xdr } = req.body;
    if (!signed_xdr) return res.status(400).json({ error: 'signed_xdr missing' });

    if (signed_xdr.startsWith('DEMO_UNSIGNED_XDR|')) {
        return res.json({ ok: true, hash: 'DEMO_TX_HASH_12345' });
    } else {
        return res.json({ ok: false, hash: 'Invalid demo XDR' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running → http://localhost:${PORT}`);
});
