const https = require('https');

function parseFirestoreRestValue(val) {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('nullValue' in val) return null;
    if ('arrayValue' in val) {
        const arr = val.arrayValue.values || [];
        return arr.map(parseFirestoreRestValue);
    }
    if ('mapValue' in val) {
        const fields = val.mapValue.fields || {};
        const obj = {};
        for (const k in fields) {
            obj[k] = parseFirestoreRestValue(fields[k]);
        }
        return obj;
    }
    return null;
}

function parseFirestoreRestDoc(doc) {
    if (!doc || !doc.fields) return null;
    const fields = doc.fields;
    const order = {};
    for (const k in fields) {
        order[k] = parseFirestoreRestValue(fields[k]);
    }
    if (!order.id && doc.name) {
        const parts = doc.name.split('/');
        order.id = parts[parts.length - 1];
    }
    if (!order.date) {
        order.date = doc.createTime || doc.updateTime || new Date().toISOString();
    }
    return order;
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

    const apiKey = "AIzaSyAzHf13KyA0W0qBW0nAJnHSgqgrDBewzRs";
    const projectId = "upichirahpersonal";
    const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/orders?key=${apiKey}&pageSize=300`;

    const options = {
        hostname: 'firestore.googleapis.com',
        port: 443,
        path: urlPath,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    };

    https.get(options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                if (data.error) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: false, error: data.error, orders: [] }));
                    return;
                }
                const docs = data.documents || [];
                const orders = docs.map(parseFirestoreRestDoc).filter(o => o && o.id);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, count: orders.length, orders }));
            } catch(e) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: e.message, orders: [] }));
            }
        });
    }).on('error', (err) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: err.message, orders: [] }));
    });
};
