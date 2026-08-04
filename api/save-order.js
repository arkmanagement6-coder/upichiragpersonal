const https = require('https');

function toFirestoreRestValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) {
        if (val.length === 0) return { arrayValue: {} };
        return { arrayValue: { values: val.map(toFirestoreRestValue) } };
    }
    if (typeof val === 'object') {
        const fields = {};
        for (const k in val) {
            if (val[k] !== undefined) fields[k] = toFirestoreRestValue(val[k]);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

function cleanUndefined(obj) {
    if (Array.isArray(obj)) {
        return obj.map(cleanUndefined);
    } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const k in obj) {
            if (obj[k] !== undefined) {
                newObj[k] = cleanUndefined(obj[k]);
            }
        }
        return newObj;
    }
    return obj;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
        return;
    }

    try {
        let order = req.body;
        if (typeof order === 'string') {
            try { order = JSON.parse(order); } catch(e){}
        }

        if (!order || !order.id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Missing order data' }));
            return;
        }

        const cleanObj = cleanUndefined(order);
        const fields = {};
        for (const key in cleanObj) {
            fields[key] = toFirestoreRestValue(cleanObj[key]);
        }

        const payload = JSON.stringify({ fields });
        const apiKey = "AIzaSyAzHf13KyA0W0qBW0nAJnHSgqgrDBewzRs";
        const projectId = "upichirahpersonal";
        const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/orders/${encodeURIComponent(order.id)}?key=${apiKey}`;

        const options = {
            hostname: 'firestore.googleapis.com',
            port: 443,
            path: urlPath,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        await new Promise((resolve) => {
            const request = https.request(options, (response) => {
                let body = '';
                response.on('data', chunk => body += chunk);
                response.on('end', () => {
                    resolve(body);
                });
            });
            request.on('error', (err) => {
                console.error('[Save-Order API] Request error:', err);
                resolve(null);
            });
            request.write(payload);
            request.end();
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, orderId: order.id }));
    } catch(err) {
        console.error('[Save-Order API] Internal error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: err.message }));
    }
};
