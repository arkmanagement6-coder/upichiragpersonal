const https = require('https');
const path = require('path');
const fs = require('fs');

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

async function saveOrderToFirestore(order) {
    try {
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
                response.on('end', () => resolve(body));
            });
            request.on('error', (err) => {
                console.error('[Create-Payment API] Firestore REST request error:', err);
                resolve(null);
            });
            request.write(payload);
            request.end();
        });
    } catch(e) {
        console.error('[Create-Payment API] Error saving order to Firestore:', e);
    }
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

    async function processPayment(data) {
        try {
            const orderId = data.orderId || `IKKO-${Math.floor(100000 + Math.random() * 900000)}`;
            const amount = parseFloat(data.amount) || 1.00;
            const method = data.method || 'phonepe';

            let settings = {};
            try {
                const settingsPath = path.join(process.cwd(), 'settings.json');
                if (fs.existsSync(settingsPath)) {
                    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                }
            } catch (err) {}

            const upiId = data.upi || settings.phonepeMerchantId || '7722051108@ibl';
            const payeeName = data.name || settings.phonepeClientId || 'PhonePe';

            // Construct full order object to guarantee it exists in Firestore
            const orderObject = {
                id: orderId,
                date: new Date().toISOString(),
                status: 'pending_verification',
                paymentMethod: method,
                utr: 'Pending Payment',
                customer: {
                    name: data.custName || data.name || (data.customer ? data.customer.name : 'Customer'),
                    phone: data.custPhone || data.phone || (data.customer ? data.customer.phone : ''),
                    address: data.custAddress || data.address || (data.customer ? data.customer.address : ''),
                    city: data.city || (data.customer ? data.customer.city : ''),
                    state: data.state || (data.customer ? data.customer.state : ''),
                    pin: data.pin || (data.customer ? data.customer.pin : '')
                },
                items: data.items || [{ title: data.productTitle || 'Demo Testing Product', price: amount, qty: 1 }],
                total: amount
            };

            // Save order to Firestore server-side
            await saveOrderToFirestore(orderObject);

            const customRedirectUrl = `/payment.html?orderId=${encodeURIComponent(orderId)}&method=${encodeURIComponent(method)}&upi=${encodeURIComponent(upiId)}&name=${encodeURIComponent(payeeName)}&total=${encodeURIComponent(amount)}`;

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, redirectUrl: customRedirectUrl, orderId: orderId }));

        } catch (err) {
            console.error('[UPI Checkout] Internal server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Internal server error: ' + err.message }));
        }
    }

    if (req.body) {
        await processPayment(req.body);
    } else {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                await processPayment(data);
            } catch (e) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Invalid JSON body' }));
            }
        });
    }
};
