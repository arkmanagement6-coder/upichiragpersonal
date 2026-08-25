// Global State and Core Logic for IKKO Digital E-commerce Store

// Meta Pixel Initialization & Tracking Logic
(function() {
    // Ensure Dual Meta Pixels (IDs: 1039324625032380 & 1790061685763294) are dynamically initialized on all pages
    if (!window.fbq) {
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '1039324625032380');
        fbq('init', '1790061685763294');
        fbq('track', 'PageView');
    }

    const runTracking = () => {
        const path = window.location.pathname.toLowerCase();
        console.log(`[Pixel] Core tracking running for path: ${path}`);
        
        // Track Checkout Page (InitiateCheckout)
        if (path.includes('checkout.html') || path.endsWith('/checkout') || path.includes('/checkout?')) {
            if (typeof fbq === 'function') {
                const cart = JSON.parse(localStorage.getItem('ikko_cart')) || [];
                let totalVal = 0;
                cart.forEach(item => {
                    let price = 999;
                    if (item.price) {
                        const cleaned = String(item.price).replace(/[^\d.]/g, '');
                        const parsed = parseFloat(cleaned);
                        if (!isNaN(parsed)) price = parsed;
                    }
                    totalVal += price * item.qty;
                });
                
                console.log(`[Pixel] Firing InitiateCheckout with value Rs. ${totalVal} and ${cart.length} items`);
                fbq('track', 'InitiateCheckout', {
                    value: totalVal,
                    currency: 'INR',
                    content_ids: cart.map(item => String(item.id)),
                    content_type: 'product',
                    num_items: cart.reduce((sum, item) => sum + item.qty, 0)
                });
            } else {
                console.warn('[Pixel] fbq function not found. Could not track InitiateCheckout.');
            }
        }
        
        // Track Product Page (ViewContent)
        if (path.includes('product.html') || path.endsWith('/product') || path.includes('/product?')) {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id') || '8270415000000';
            const products = JSON.parse(localStorage.getItem('ikko_products')) || [];
            const prod = products.find(p => String(p.id) === String(productId)) || { id: productId, title: 'Product', price: 999 };
            if (typeof fbq === 'function') {
                let priceVal = 999;
                if (prod.price) {
                    const cleaned = String(prod.price).replace(/[^\d.]/g, '');
                    const parsed = parseFloat(cleaned);
                    if (!isNaN(parsed)) priceVal = parsed;
                }
                console.log(`[Pixel] Firing ViewContent for product: ${prod.title} (ID: ${prod.id})`);
                fbq('track', 'ViewContent', {
                    content_ids: [String(prod.id)],
                    content_name: prod.title,
                    content_type: 'product',
                    value: priceVal,
                    currency: 'INR'
                });
            } else {
                console.warn('[Pixel] fbq function not found. Could not track ViewContent.');
            }
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', runTracking);
    } else {
        runTracking();
    }
})();

// Expose global helper to track purchase event dynamically on demand
window.trackPurchaseEvent = function(order) {
    if (!order) return;
    const targetId = order.id || order.orderId || order.order_id || ('ORD-' + Date.now());
    order.id = targetId;
    
    // Always trigger Server Conversions API (CAPI)
    try {
        console.log(`[CAPI] Dispatching Conversions API purchase for order: ${order.id}`);
        fetch('/api/track-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: order })
        }).then(res => res.json())
          .then(resData => {
              if (resData.success) {
                  console.log(`[CAPI] Server purchase event successfully logged for order ${order.id}`);
              } else {
                  console.warn(`[CAPI] Meta CAPI response:`, resData);
              }
          }).catch(err => {
              console.error("[CAPI] Server tracking error:", err);
          });
    } catch(e) {
        console.error("[CAPI] Error calling track-purchase endpoint:", e);
    }

    // Check session storage per order ID so browser pixel doesn't spam on page reloads
    const sessionKey = 'pixel_purchase_fired_' + order.id;
    if (sessionStorage.getItem(sessionKey)) {
        console.log(`[Pixel] Browser Purchase event already fired for order ${order.id} in this session.`);
        return;
    }

    const firePurchase = () => {
        if (typeof fbq === 'function') {
            let totalVal = 1.00;
            if (order.total) {
                const cleaned = String(order.total).replace(/[^\d.]/g, '');
                const parsed = parseFloat(cleaned);
                if (!isNaN(parsed) && parsed > 0) totalVal = parsed;
            }
            
            const contentIds = (order.items && Array.isArray(order.items) && order.items.length > 0)
                ? order.items.map(item => String(item.id))
                : ['8270415000000'];

            console.log(`[Pixel] Firing Browser Purchase event for order ${order.id} with value Rs. ${totalVal}`);
            fbq('track', 'Purchase', {
                value: totalVal,
                currency: 'INR',
                content_type: 'product',
                content_ids: contentIds
            }, { eventID: order.id });
            
            sessionStorage.setItem(sessionKey, 'true');
        } else {
            console.warn('[Pixel] fbq function not found yet. Retrying in 300ms...');
            setTimeout(firePurchase, 300);
        }
    };

    firePurchase();
};

const INITIAL_PRODUCTS = [
  {
    "id": "JUBI-1",
    "title": "Jio Mart Offer today online: Buy 20kg ashirwad atta+1 kg Besan + 5 kg sugar + 5 kg mustard oil",
    "price": "Rs. 499.00",
    "comparePrice": "Rs. 1099.00",
    "badge": "55% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1720600667-wg3b558v.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1720600667-wg3b558v.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today online: Buy 20kg ashirwad atta+1 kg Besan + 5 kg sugar + 5 kg mustard oil</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-2",
    "title": "Jio Mart Offer today online: Get Combo of 1kg Kaju and 1 kg Badam",
    "price": "Rs. 299.00",
    "comparePrice": "Rs. 899.00",
    "badge": "67% Off",
    "category": "dry-fruits",
    "image": "https://jubimart.vercel.app/assets/1720600784-DpRpsDcN.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1720600784-DpRpsDcN.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today online: Get Combo of 1kg Kaju and 1 kg Badam</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-3",
    "title": "Jio Mart Offer Today 9 Combo packs ' 10 kg Ashirwaad atta , 5 kg india gate basmati rice , fortune oil 5 L , Surf Excel 5 kg and more 5Kg",
    "price": "Rs. 699.00",
    "comparePrice": "Rs. 2478.00",
    "badge": "72% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1720600900-Bq3k49i-.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1720600900-Bq3k49i-.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer Today 9 Combo packs ' 10 kg Ashirwaad atta , 5 kg india gate basmati rice , fortune oil 5 L , Surf Excel 5 kg and more 5Kg</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-4",
    "title": "May Offer - Get 4Kg Dry Fruit Mix Combo",
    "price": "Rs. 399.00",
    "comparePrice": "Rs. 999.00",
    "badge": "60% Off",
    "category": "dry-fruits",
    "image": "https://jubimart.vercel.app/assets/1720600938-9eGnO6Cc.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1720600938-9eGnO6Cc.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>May Offer - Get 4Kg Dry Fruit Mix Combo</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-5",
    "title": "Jio Mart Offer Today 9 Combo packs ' 10 kg Ashirwaad atta , 5 kg india gate basmati rice , fortune oil 5 L , Surf Excel 5 kg and more 5Kg",
    "price": "Rs. 699.00",
    "comparePrice": "Rs. 2478.00",
    "badge": "72% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722696423-Cs-KGap3.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722696423-Cs-KGap3.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer Today 9 Combo packs ' 10 kg Ashirwaad atta , 5 kg india gate basmati rice , fortune oil 5 L , Surf Excel 5 kg and more 5Kg</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-6",
    "title": "Jio Mart Offer Today 9 Combo packs ' 10 kg Ashirwaad atta , 5 kg india gate basmati rice , fortune oil 5 L , Surf Excel 5 kg and more 5Kg",
    "price": "Rs. 369.00",
    "comparePrice": "Rs. 3999.00",
    "badge": "91% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722700076-BKN2_81Q.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722700076-BKN2_81Q.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer Today 9 Combo packs ' 10 kg Ashirwaad atta , 5 kg india gate basmati rice , fortune oil 5 L , Surf Excel 5 kg and more 5Kg</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-7",
    "title": "4 combo pack' india basmati 10kg 'tata agni 500g ashirwaad atta 10kg fortune sugar 5kg",
    "price": "Rs. 595.00",
    "comparePrice": "Rs. 2789.00",
    "badge": "79% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722700182-Cx6BP6WC.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722700182-Cx6BP6WC.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>4 combo pack' india basmati 10kg 'tata agni 500g ashirwaad atta 10kg fortune sugar 5kg</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-8",
    "title": "Aashirvaad Atta 5kg, India gate basmati rice 5kg, Fortune Suger 5kg, Lipton 1kg TATA Agni 1Kg, Super Sarvottam Refined Rice Bran Oil 1L",
    "price": "Rs. 369.00",
    "comparePrice": "Rs. 3999.00",
    "badge": "91% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722700324-B7a9_A2G.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722700324-B7a9_A2G.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Aashirvaad Atta 5kg, India gate basmati rice 5kg, Fortune Suger 5kg, Lipton 1kg TATA Agni 1Kg, Super Sarvottam Refined Rice Bran Oil 1L</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-9",
    "title": "Jio Mart Offer today: Combo of 5 kg Fortune oil+ 5 kg sugar+ 5 kg Basmati rice",
    "price": "Rs. 298.00",
    "comparePrice": "Rs. 999.00",
    "badge": "70% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722700435-Cervrfo5.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722700435-Cervrfo5.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today: Combo of 5 kg Fortune oil+ 5 kg sugar+ 5 kg Basmati rice</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-10",
    "title": "Jio Mart Offer today online: Get Combo of 5 liter Fortune Oil and 5 Litre Mustard Oil",
    "price": "Rs. 386.00",
    "comparePrice": "Rs. 1286.00",
    "badge": "69% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722700753-BbmOAGSP.png",
    "images": [
      "https://jubimart.vercel.app/assets/1722700753-BbmOAGSP.png"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today online: Get Combo of 5 liter Fortune Oil and 5 Litre Mustard Oil</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-11",
    "title": "Jio Mart Offer today online: Buy 20kg ashirwad atta+1 kg Besan + 5 kg sugar + 5 kg mustard oil",
    "price": "Rs. 499.00",
    "comparePrice": "Rs. 1099.00",
    "badge": "55% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/1722700896-RModbxHX.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722700896-RModbxHX.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today online: Buy 20kg ashirwad atta+1 kg Besan + 5 kg sugar + 5 kg mustard oil</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-12",
    "title": "Jio Mart Offer today online: Get Combo of 1kg Kaju and 1 kg Badam",
    "price": "Rs. 199.00",
    "comparePrice": "Rs. 1988.00",
    "badge": "90% Off",
    "category": "dry-fruits",
    "image": "https://jubimart.vercel.app/assets/1722700947-DRiVOVhB.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/1722700947-DRiVOVhB.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today online: Get Combo of 1kg Kaju and 1 kg Badam</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-13",
    "title": "Jio Mart Offer today online: Get Basmati Rice 5kg+ Fortune Oil 5L",
    "price": "Rs. 299.00",
    "comparePrice": "Rs. 996.00",
    "badge": "75% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/299-fq7XbP8h.jpg",
    "images": [
      "https://jubimart.vercel.app/assets/299-fq7XbP8h.jpg"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Offer today online: Get Basmati Rice 5kg+ Fortune Oil 5L</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  },
  {
    "id": "JUBI-14",
    "title": "Jio Mart Combo: Fortune Basmati Rice 5kg, Oil 5L, Sugar 5kg & Besan 2kg",
    "price": "Rs. 499.00",
    "comparePrice": "Rs. 1663.00",
    "badge": "70% Off",
    "category": "grocery-combos",
    "image": "https://jubimart.vercel.app/assets/3434355454-CqeSvYN9.png",
    "images": [
      "https://jubimart.vercel.app/assets/3434355454-CqeSvYN9.png"
    ],
    "stockStatus": "in-stock",
    "paymentLink": "https://rzp.io/rzp/tHlmofq",
    "hiddenOnWebsite": false,
    "specs": [
      {
        "name": "Brand",
        "value": "Jio Mart"
      },
      {
        "name": "Offer Type",
        "value": "Mega Saver Combo"
      },
      {
        "name": "Delivery",
        "value": "Express Shipping (2-3 Days)"
      }
    ],
    "description": "<p><strong>Jio Mart Combo: Fortune Basmati Rice 5kg, Oil 5L, Sugar 5kg & Besan 2kg</strong></p><p>Special promotional discount offer from Jio Mart India. Includes genuine high quality grocery staples directly from verified distributors with 100% Quality Assurance.</p>"
  }
];

// Database Initialization
function dbInit() {
    if (!localStorage.getItem('ikko_products')) {
        localStorage.setItem('ikko_products', JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem('ikko_orders')) {
        localStorage.setItem('ikko_orders', JSON.stringify([]));
    }
    if (!localStorage.getItem('ikko_settings')) {
        const defaultFirebaseConfig = {
            apiKey: "AIzaSyAzHf13KyA0W0qBW0nAJnHSgqgrDBewzRs",
            authDomain: "upichirahpersonal.firebaseapp.com",
            projectId: "upichirahpersonal",
            storageBucket: "upichirahpersonal.firebasestorage.app",
            messagingSenderId: "216570904039",
            appId: "1:216570904039:web:e21bb467fbea0495181142",
            measurementId: "G-ZGCX3LKTHQ"
        };
        localStorage.setItem('ikko_settings', JSON.stringify({
            phonepeEnabled: true,
            phonepeMerchantId: 'ikkodigital@axl',
            phonepeClientId: 'PhonePe',
            phonepeClientSecret: 'N/A',
            phonepeMode: 'live',
            customQrUrl: '',
            firebaseEnabled: true,
            firebaseConfig: defaultFirebaseConfig
        }));
    }
}

// Global settings loading promise
window.settingsLoadingPromise = loadGlobalSettings();

async function loadGlobalSettings() {
    try {
        const res = await fetch('/settings.json?v=' + Date.now());
        if (res.ok) {
            const globalSettings = await res.json();
            const localSettings = JSON.parse(localStorage.getItem('ikko_settings')) || {};
            
            // Always force migration of UPI ID to ikkodigital@axl
            if (localSettings.phonepeMerchantId !== 'ikkodigital@axl') {
                localSettings.phonepeMerchantId = 'ikkodigital@axl';
                localSettings.phonepeClientId = 'PhonePe';
                localSettings.customQrUrl = '';
                localStorage.setItem('ikko_settings', JSON.stringify(localSettings));
            }
            
            // Migration: Reset old Firebase credentials in local settings if server has updated configuration
            if (globalSettings.firebaseConfig && globalSettings.firebaseConfig.projectId) {
                if (localSettings.firebaseConfig && localSettings.firebaseConfig.projectId !== globalSettings.firebaseConfig.projectId) {
                    console.log("[Migration] Overwriting local Firebase config with new server config:", globalSettings.firebaseConfig.projectId);
                    localSettings.firebaseConfig = globalSettings.firebaseConfig;
                    localStorage.setItem('ikko_settings', JSON.stringify(localSettings));
                }
            }
            
            // Merge settings: local overrides take precedence for admin convenience,
            // but empty local settings must NOT overwrite valid global settings.
            const mergedSettings = { ...globalSettings };
            for (const key in localSettings) {
                const localVal = localSettings[key];
                if (localVal !== undefined && localVal !== null && localVal !== '') {
                    // Skip empty object configurations
                    if (key === 'firebaseConfig' && typeof localVal === 'object' && Object.keys(localVal).length === 0) {
                        continue;
                    }
                    // Crucial fix: Do not allow local overrides to turn off Firebase if it is enabled globally
                    if (key === 'firebaseEnabled' && globalSettings.firebaseEnabled) {
                        continue;
                    }
                    // Crucial fix: Do not allow local overrides to turn off PhonePe if it is enabled globally
                    if (key === 'phonepeEnabled' && globalSettings.phonepeEnabled) {
                        continue;
                    }
                    mergedSettings[key] = localVal;
                }
            }
            
            // Guarantee phonepeMerchantId is ikkodigital@axl in merged settings
            mergedSettings.phonepeMerchantId = 'ikkodigital@axl';
            localStorage.setItem('ikko_settings', JSON.stringify(mergedSettings));
            
            // If Firebase is enabled, dynamically sync settings document from Firestore (deadlock-free)
            if (mergedSettings.firebaseEnabled && mergedSettings.firebaseConfig) {
                const dbPromise = initFirebaseWithSettings(mergedSettings);
                const db = dbPromise ? await dbPromise : null;
                if (db) {
                    try {
                        const doc = await db.collection('settings').doc('global').get();
                        if (doc.exists) {
                            const firestoreSettings = doc.data();
                            
                            // Auto-migrate old UPI IDs stored in Firestore global settings
                            if (firestoreSettings.phonepeMerchantId !== 'ikkodigital@axl') {
                                firestoreSettings.phonepeMerchantId = 'ikkodigital@axl';
                                firestoreSettings.phonepeClientId = 'PhonePe';
                                
                                db.collection('settings').doc('global').update({
                                    phonepeMerchantId: 'ikkodigital@axl',
                                    phonepeClientId: 'PhonePe'
                                }).then(() => {
                                    console.log("[Migration] Updated old UPI ID to ikkodigital@axl in Firestore settings doc.");
                                }).catch(e => {
                                    console.error("[Migration] Failed to update settings in Firestore:", e);
                                });
                            }
                            
                            const finalSettings = { ...mergedSettings, ...firestoreSettings, phonepeMerchantId: 'ikkodigital@axl' };
                            localStorage.setItem('ikko_settings', JSON.stringify(finalSettings));
                            console.log("Loaded dynamic settings from Firestore successfully:", finalSettings);
                        } else {
                            // If settings/global does not exist, save the current mergedSettings to Firestore
                            await db.collection('settings').doc('global').set(cleanUndefinedFields(mergedSettings));
                            console.log("Initialized global settings in Firestore.");
                        }
                    } catch (err) {
                        console.error("Failed to fetch settings from Firestore:", err);
                    }
                }
            }
            console.log("Global settings loaded and merged successfully.");
        }
    } catch (e) {
        console.warn("Failed to load global settings from server:", e);
    }
}

// Settings Helpers
function getSettings() {
    dbInit();
    let settings = JSON.parse(localStorage.getItem('ikko_settings')) || {};
    
    let changed = false;
    
    if (settings.phonepeEnabled === undefined) {
        settings.phonepeEnabled = true;
        changed = true;
    }
    if (!settings.phonepeMerchantId) {
        settings.phonepeMerchantId = 'M23P2N630SNVS';
        settings.phonepeClientId = 'SU2605131450590093051231';
        settings.phonepeClientSecret = 'cab34e32-8fb5-4d6d-94be-7bcccc16c8cb';
        settings.phonepeMode = 'live';
        changed = true;
    }
    
    if (settings.firebaseEnabled === undefined || !settings.firebaseConfig) {
        settings.firebaseEnabled = true;
        settings.firebaseConfig = {
            apiKey: "AIzaSyAzHf13KyA0W0qBW0nAJnHSgqgrDBewzRs",
            authDomain: "upichirahpersonal.firebaseapp.com",
            projectId: "upichirahpersonal",
            storageBucket: "upichirahpersonal.firebasestorage.app",
            messagingSenderId: "216570904039",
            appId: "1:216570904039:web:e21bb467fbea0495181142",
            measurementId: "G-ZGCX3LKTHQ"
        };
        changed = true;
    }
    
    if (changed) {
        localStorage.setItem('ikko_settings', JSON.stringify(settings));
    }
    return settings;
}

async function saveSettings(settings) {
    localStorage.setItem('ikko_settings', JSON.stringify(settings));
    
    // Also save settings to Firestore to synchronize dynamically across all client devices
    const db = await initFirebase();
    if (db) {
        try {
            await db.collection('settings').doc('global').set(cleanUndefinedFields(settings));
            console.log("Settings synced to Firestore successfully.");
        } catch (e) {
            console.error("Failed to save settings to Firestore:", e);
        }
    }

    // Try to save to server settings.json in real-time if endpoint is available
    try {
        await fetch('/api/save-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        console.log("Settings saved to server settings.json successfully.");
    } catch (e) {
        console.warn("Server settings.json write not supported or failed:", e);
    }
}

// Firebase Dynamic Loader & Global Instance State
let firebaseDB = null;
let firebaseInitialized = false;

async function waitForFirebaseInstance() {
    if (window.firebase && typeof window.firebase.firestore === 'function') {
        return window.firebase;
    }
    
    // Wait up to 5 seconds for window.firebase to finish loading from head script or dynamic inject
    for (let i = 0; i < 25; i++) {
        if (window.firebase && typeof window.firebase.firestore === 'function') {
            return window.firebase;
        }
        await new Promise(r => setTimeout(r, 200));
    }
    
    // Fallback: Manually inject if missing
    if (!window.firebase || typeof window.firebase.firestore !== 'function') {
        await new Promise((resolve) => {
            const s1 = document.createElement('script');
            s1.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
            s1.onload = () => {
                const s2 = document.createElement('script');
                s2.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js";
                s2.onload = resolve;
                document.head.appendChild(s2);
            };
            document.head.appendChild(s1);
        });
    }
    return window.firebase;
}

async function initFirebaseWithSettings(settings) {
    if (firebaseInitialized && firebaseDB) return firebaseDB;
    if (!settings || !settings.firebaseEnabled) return null;

    let config = settings.firebaseConfig;
    if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch(e){}
    }
    if (!config || !config.apiKey || !config.projectId) return null;

    try {
        const fb = await waitForFirebaseInstance();
        if (fb && typeof fb.firestore === 'function') {
            let app;
            if (!fb.apps.length) {
                app = fb.initializeApp(config);
            } else {
                app = fb.app();
            }
            firebaseDB = fb.firestore(app);
            firebaseInitialized = true;
            console.log("🔥 Firebase Firestore connected successfully!");
            return firebaseDB;
        }
    } catch (e) {
        console.error("Error initializing Firebase:", e);
    }
    return null;
}

async function initFirebase() {
    if (firebaseInitialized && firebaseDB) return firebaseDB;

    if (window.settingsLoadingPromise) {
        try { await window.settingsLoadingPromise; } catch(e){}
    }

    const settings = getSettings();
    const dbPromise = initFirebaseWithSettings(settings);
    return dbPromise ? await dbPromise : null;
}

// Helper to clean undefined fields before saving to Firestore
function cleanUndefinedFields(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefinedFields(item)).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
            const val = obj[key];
            if (val !== undefined) {
                const cleanedVal = cleanUndefinedFields(val);
                if (cleanedVal !== undefined) {
                    cleaned[key] = cleanedVal;
                }
            }
        }
        return cleaned;
    }
    return obj;
}

let productsSyncPromise = null;

async function syncProductsBackground(forceSync = false) {
    if (productsSyncPromise) return productsSyncPromise;

    productsSyncPromise = (async () => {
        dbInit();
        const db = await initFirebase();
        
        if (db) {
            try {
                // Read the actual server timestamp directly from Firestore settings
                let serverTimestamp = 0;
                try {
                    const settingsDoc = await db.collection('settings').doc('global').get();
                    if (settingsDoc.exists) {
                        serverTimestamp = settingsDoc.data().productsLastUpdated || 0;
                    }
                } catch (err) {
                    console.warn("Could not read server timestamp from Firestore:", err);
                }

                const localTimestamp = parseInt(localStorage.getItem('ikko_products_last_updated') || '0');
                const cachedProducts = localStorage.getItem('ikko_products');

                // If local cache is up-to-date or newer, skip fetching from Firestore
                if (!forceSync && serverTimestamp && localTimestamp >= serverTimestamp && cachedProducts) {
                    try {
                        let parsed = JSON.parse(cachedProducts);
                        if (parsed && parsed.length > 0) {
                            parsed = parsed.filter(p => String(p.id) !== '8270415000000_demo');
                            localStorage.setItem('ikko_products', JSON.stringify(parsed));
                            console.log("⚡ Products cache is up-to-date/newer with Firestore (version: " + serverTimestamp + ")");
                            return parsed;
                        }
                    } catch (e) {}
                }

                console.log("🔄 Fetching product chunks from Firestore...");
                const snapshot = await db.collection('products_chunks').get();
                let products = [];

                if (!snapshot.empty) {
                    let chunks = [];
                    snapshot.forEach(doc => {
                        chunks.push({ index: parseInt(doc.id) || 0, products: doc.data().products || [] });
                    });
                    // Sort chunks by index to preserve catalogue ordering
                    chunks.sort((a, b) => a.index - b.index);
                    chunks.forEach(c => products.push(...c.products));
                }

                // Seamless backward-compatible legacy migration:
                // If products_chunks collection is empty, try migrating from individual legacy documents
                if (products.length === 0) {
                    console.log("Products chunks are empty in Firestore. Attempting migration from legacy products collection...");
                    const legacySnapshot = await db.collection('products').get();
                    if (!legacySnapshot.empty) {
                        let legacyMap = {};
                        legacySnapshot.forEach(doc => {
                            const data = doc.data();
                            const prodId = String(data.id || doc.id);
                            legacyMap[prodId] = data;
                        });
                        products = Object.keys(legacyMap).map(prodId => {
                            return { id: prodId, ...legacyMap[prodId] };
                        });
                        console.log(`Migrated ${products.length} products from legacy collection.`);
                    }

                    if (products.length === 0) {
                        console.log("No legacy products found. Seeding default catalog...");
                        products = [...INITIAL_PRODUCTS];
                    }

                    // Save the migrated or seeded catalog to products_chunks
                    const CHUNK_SIZE = 100;
                    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
                        const chunk = products.slice(i, i + CHUNK_SIZE);
                        await db.collection('products_chunks').doc(String(Math.floor(i / CHUNK_SIZE))).set({ products: cleanUndefinedFields(chunk) });
                    }
                    
                    // Set timestamp in settings to align versions
                    const initTimestamp = Date.now();
                    await db.collection('settings').doc('global').set({ productsLastUpdated: initTimestamp }, { merge: true });
                    localStorage.setItem('ikko_products_last_updated', String(initTimestamp));
                } else {
                    // Cache version timestamp locally if retrieved successfully
                    if (serverTimestamp) {
                        localStorage.setItem('ikko_products_last_updated', String(serverTimestamp));
                    }
                }

                // Always filter out ₹1 Demo Testing product
                products = products.filter(p => String(p.id) !== '1000000000001' && String(p.id) !== '8270415000000_demo' && !String(p.title || '').toLowerCase().includes('demo testing'));

                // Sanitize products to prevent XSS payloads from hiding the DOM and update old payment links
                products = products.map(p => {
                    const sanitize = (str) => {
                        if (typeof str !== 'string') return str;
                        return str.replace(/<\/?(script|style|iframe|object|embed|meta|link)[^>]*>/gi, '')
                                  .replace(/on\w+="[^"]*"/gi, '')
                                  .replace(/on\w+='[^']*'/gi, '')
                                  .replace(/on\w+=[^\s>]+/gi, '');
                    };
                    return {
                        ...p,
                        title: sanitize(p.title),
                        description: sanitize(p.description),
                        image: sanitize(p.image),
                        category: sanitize(p.category),
                        paymentLink: (!p.paymentLink || p.paymentLink === 'https://razorpay.me/@luckydigitalmedia') ? 'https://rzp.io/rzp/tHlmofq' : p.paymentLink
                    };
                });



                const oldProductsStr = localStorage.getItem('ikko_products');
                const newProductsStr = JSON.stringify(products);
                if (oldProductsStr !== newProductsStr) {
                    localStorage.setItem('ikko_products', newProductsStr);
                    // Dispatch event to notify pages to re-render
                    window.dispatchEvent(new CustomEvent('products-synced', { detail: products }));
                }
                return products;
            } catch (e) {
                console.error("Error reading Firestore chunks:", e);
            }
        }
        
        // Fallback: Fetch products.json from server if Firestore fails or is disabled
        let products = [];
        try {
            const res = await fetch('/products.json?v=' + Date.now());
            if (res.ok) {
                products = await res.json();
            } else {
                throw new Error("HTTP Status " + res.status);
            }
        } catch (e) {
            console.warn("Failed to load products.json from server, falling back to localStorage:", e);
            products = JSON.parse(localStorage.getItem('ikko_products')) || [];
        }

        // Sanitize products
        products = products.map(p => {
            const sanitize = (str) => {
                if (typeof str !== 'string') return str;
                return str.replace(/<\/?(script|style|iframe|object|embed|meta|link)[^>]*>/gi, '')
                          .replace(/on\w+="[^"]*"/gi, '')
                          .replace(/on\w+='[^']*'/gi, '')
                          .replace(/on\w+=[^\s>]+/gi, '');
            };
            return {
                ...p,
                title: sanitize(p.title),
                description: sanitize(p.description),
                image: sanitize(p.image),
                category: sanitize(p.category)
            };
        });




        if (!products || products.length === 0) {
            products = [...INITIAL_PRODUCTS];
        }

        let updated = false;
        products = products.map(p => {
            if (!p.paymentLink || p.paymentLink === 'https://razorpay.me/@luckydigitalmedia') {
                p.paymentLink = 'https://rzp.io/rzp/tHlmofq';
                updated = true;
            }
            if ((String(p.id) === '8270415000009' || String(p.id) === '8270415000021') && p.title.includes('iPad')) {
                p.title = "Boult Audio UFO Truly Wireless In-Ear Earbuds with 48H Playtime, Built-in App Support, 45ms Low Latency Gaming, 4 Mics ENC, Breathing LEDs, 13mm Bass Drivers, Ear Buds TWS, Made in India";
                updated = true;
            }
            
            return p;
        });
        const oldProductsStr = localStorage.getItem('ikko_products');
        const newProductsStr = JSON.stringify(products);
        if (oldProductsStr !== newProductsStr || updated) {
            localStorage.setItem('ikko_products', newProductsStr);
            window.dispatchEvent(new CustomEvent('products-synced', { detail: products }));
        }
        return products;
    })();

    const result = await productsSyncPromise;
    productsSyncPromise = null;
    return result;
}

const IKKO_BUILD_VER = '4000.0';

// Auto-purge stale cache if build version changed
(function checkBuildCacheBust() {
    try {
        const storedVer = localStorage.getItem('ikko_build_version');
        if (storedVer !== IKKO_BUILD_VER) {
            localStorage.removeItem('ikko_products');
            localStorage.removeItem('ikko_products_last_updated');
            sessionStorage.removeItem('ikko_products_synced');
            localStorage.setItem('ikko_build_version', IKKO_BUILD_VER);
            console.log("⚡ New build detected (" + IKKO_BUILD_VER + "). Purged stale browser cache!");
        }
    } catch(e){}
})();

// Product Database Helpers (Firestore Async with instant background revalidation)
async function getProducts(forceSync = false) {
    const cached = localStorage.getItem('ikko_products');

    // Always trigger background sync so any server/admin changes propagate instantly
    syncProductsBackground(forceSync).catch(err => console.error("Background sync error:", err));

    if (cached && !forceSync) {
        try {
            let products = JSON.parse(cached);
            if (products && products.length > 0) {
                products = products.filter(p => String(p.id) !== '1000000000001' && String(p.id) !== '8270415000000_demo' && !String(p.title || '').toLowerCase().includes('demo testing'));
                const hasVisible = products.some(p => !p.hiddenOnWebsite && p.stockStatus !== 'hidden');
                if (hasVisible) {
                    return products;
                }
            }
        } catch (e) {}
    }
    return await syncProductsBackground(true);
}

async function saveProducts(products, changedProduct = null) {
    localStorage.setItem('ikko_products', JSON.stringify(products));
    const updateTimestamp = Date.now();
    localStorage.setItem('ikko_products_last_updated', String(updateTimestamp));

    const db = await initFirebase();
    if (db) {
        try {
            // Chunk products and write them to products_chunks collection
            const CHUNK_SIZE = 100;
            const newChunkCount = Math.ceil(products.length / CHUNK_SIZE);
            
            for (let i = 0; i < products.length; i += CHUNK_SIZE) {
                const chunk = products.slice(i, i + CHUNK_SIZE);
                const chunkIdx = Math.floor(i / CHUNK_SIZE);
                await db.collection('products_chunks').doc(String(chunkIdx)).set({ products: cleanUndefinedFields(chunk) });
            }
            
            // Clean up any stale chunks
            const snapshot = await db.collection('products_chunks').get();
            snapshot.forEach(doc => {
                const idx = parseInt(doc.id) || 0;
                if (idx >= newChunkCount) {
                    db.collection('products_chunks').doc(doc.id).delete().catch(() => {});
                }
            });

            // Set new productsLastUpdated timestamp in Firestore settings document to notify all clients
            await db.collection('settings').doc('global').set({ productsLastUpdated: updateTimestamp }, { merge: true });
            
            console.log("Synced all products in chunks to Firestore successfully. Catalog version: " + updateTimestamp);

            if (changedProduct) {
                db.collection('products').doc(String(changedProduct.id)).set(cleanUndefinedFields(changedProduct)).catch(() => {});
            }
        } catch (e) {
            console.error("Failed to save products to Firestore:", e);
        }
    }
    window.dispatchEvent(new CustomEvent('products-synced', { detail: products }));
}

async function deleteProduct(productId) {
    let products = await getProducts();
    products = products.filter(p => String(p.id) !== String(productId));
    localStorage.setItem('ikko_products', JSON.stringify(products));

    const db = await initFirebase();
    if (db) {
        try {
            // Chunk products and write them to products_chunks collection
            const CHUNK_SIZE = 100;
            const newChunkCount = Math.ceil(products.length / CHUNK_SIZE);
            
            for (let i = 0; i < products.length; i += CHUNK_SIZE) {
                const chunk = products.slice(i, i + CHUNK_SIZE);
                const chunkIdx = Math.floor(i / CHUNK_SIZE);
                await db.collection('products_chunks').doc(String(chunkIdx)).set({ products: cleanUndefinedFields(chunk) });
            }
            
            // Clean up any stale chunks
            const snapshot = await db.collection('products_chunks').get();
            snapshot.forEach(doc => {
                const idx = parseInt(doc.id);
                if (idx >= newChunkCount) {
                    db.collection('products_chunks').doc(doc.id).delete().catch(() => {});
                }
            });

            // Set new productsLastUpdated timestamp in Firestore settings document
            const updateTimestamp = Date.now();
            await db.collection('settings').doc('global').set({ productsLastUpdated: updateTimestamp }, { merge: true });
            
            // Cache timestamp locally
            localStorage.setItem('ikko_products_last_updated', String(updateTimestamp));
            
            console.log(`Product ${productId} deleted from catalog in chunks. Catalog version: ` + updateTimestamp);
            
            // Legacy single-product deletion in the background
            db.collection('products').doc(String(productId)).delete().catch(e => {
                console.warn("Legacy single-product delete failed (non-blocking):", e);
            });
        } catch (e) {
            console.error("Failed to delete product from Firestore:", e);
            throw new Error("Firestore Database Delete Failed: " + e.message);
        }
    }
}

// Order Management Helpers
function getOrders() {
    dbInit();
    return JSON.parse(localStorage.getItem('ikko_orders'));
}

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

async function syncOrderToFirestoreRest(order) {
    try {
        const fields = {};
        const cleanObj = cleanUndefinedFields(order);
        for (const key in cleanObj) {
            fields[key] = toFirestoreRestValue(cleanObj[key]);
        }
        const url = `https://firestore.googleapis.com/v1/projects/upichirahpersonal/databases/(default)/documents/orders/${encodeURIComponent(order.id)}?key=AIzaSyAzHf13KyA0W0qBW0nAJnHSgqgrDBewzRs`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });
        if (response.ok) {
            console.log("⚡ REST API: Order synced to Firestore successfully!", order.id);
        } else {
            console.warn("⚠️ REST API sync response:", response.status, await response.text());
        }
    } catch(err) {
        console.error("❌ REST API Order Sync error:", err);
    }
}

async function saveOrder(order) {
    dbInit();
    const orders = JSON.parse(localStorage.getItem('ikko_orders')) || [];
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx !== -1) {
        orders[idx] = order;
    } else {
        orders.push(order);
    }
    localStorage.setItem('ikko_orders', JSON.stringify(orders));
    
    // 1. Serverless Endpoint Sync (Runs on Vercel Node.js backend with keepalive)
    try {
        fetch('/api/save-order', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        }).catch(e => console.warn("Server API sync warning:", e));
    } catch(e){}

    // 2. Direct REST API Sync (Guaranteed 0-ms SDK delay fallback for mobile)
    await syncOrderToFirestoreRest(order);

    // 3. Firebase JS SDK Sync (Triggers realtime listeners)
    try {
        const db = await initFirebase();
        if (db) {
            const cleanObj = cleanUndefinedFields(order);
            await db.collection('orders').doc(order.id).set(cleanObj, { merge: true });
            console.log("🔥 JS SDK: Order synced to Firestore successfully:", order.id);
        } else {
            console.warn("⚠️ initFirebase returned null during saveOrder for ID:", order.id);
        }
    } catch (e) {
        console.error("❌ JS SDK sync error:", e);
    }
}

// Cart State Management Helpers
function getCart() {
    const cart = localStorage.getItem('ikko_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('ikko_cart', JSON.stringify(cart));
    updateCartUI();
}

async function addToCart(productId, qty = 1) {
    const cart = getCart();
    const products = await getProducts();
    const product = products.find(p => String(p.id) === String(productId));
    
    if (!product) return;
    
    const existingItem = cart.find(item => String(item.id) === String(productId));
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            comparePrice: product.comparePrice,
            image: product.image,
            qty: qty
        });
    }
    
    // Meta Pixel AddToCart Event
    if (typeof fbq === 'function') {
        let priceVal = 999;
        if (product.price) {
            const cleaned = String(product.price).replace(/[^\d.]/g, '');
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed)) priceVal = parsed;
        }
        fbq('track', 'AddToCart', {
            content_ids: [String(product.id)],
            content_name: product.title,
            content_type: 'product',
            value: priceVal,
            currency: 'INR'
        });
    }

    saveCart(cart);
    openCartDrawer();
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => String(item.id) !== String(productId));
    saveCart(cart);
}

// Update cart quantity
function updateCartQty(productId, qty) {
    const cart = getCart();
    const item = cart.find(item => String(item.id) === String(productId));
    if (item) {
        item.qty = parseInt(qty) || 1;
        if (item.qty <= 0) {
            removeFromCart(productId);
            return;
        }
    }
    saveCart(cart);
}

function clearCart() {
    saveCart([]);
}

function getCartTotal() {
    const cart = getCart();
    if (!cart || cart.length === 0) return 0;
    
    let rawTotal = 0;
    let minPrice = Infinity;
    let totalQty = 0;

    cart.forEach(item => {
        const p = parsePrice(item.price);
        rawTotal += p * item.qty;
        totalQty += item.qty;
        if (p > 0 && p < minPrice) {
            minPrice = p;
        }
    });

    let freeDiscount = 0;
    if (totalQty >= 3 && minPrice !== Infinity) {
        freeDiscount = minPrice;
    }

    return Math.max(0, rawTotal - freeDiscount);
}

function getCartCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.qty, 0);
}

// Formatting utilities
function formatPrice(num) {
    return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[^\d.]/g, '').replace(/^\./, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}

// Header and Footer Rendering
// Header and Footer Rendering
function toggleMobileSearch() {
    const mobileSearch = document.getElementById('mobile-search-expand');
    if (mobileSearch) {
        mobileSearch.style.display = mobileSearch.style.display === 'block' ? 'none' : 'block';
        if (mobileSearch.style.display === 'block') {
            const input = document.getElementById('mobile-header-search');
            if (input) input.focus();
        }
    }
}

function renderHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;
    
    const cartCount = getCartCount();
    
    headerPlaceholder.innerHTML = `
        <header class="main-header">
            <div class="header-container">
                <a href="index.html" class="logo-link">
                    <img src="https://jubimart.vercel.app/assets/logo-BDwwMpVg.png" alt="JioMart" class="jiomart-header-logo" onerror="this.onerror=null; this.src='https://jubimart.vercel.app/assets/round_logo-BHlE3zVg.png';">
                </a>
                
                <div class="search-bar-container" id="header-search-container">
                    <div class="search-input-pill">
                        <svg class="search-glass-icon" viewBox="0 0 24 24" width="18" height="18" stroke="#94a3b8" stroke-width="2.2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="header-search" placeholder='Search "atta, milk, eggs..."' autocomplete="off">
                    </div>
                    <div id="search-results-dropdown" class="search-results-dropdown"></div>
                </div>
                
                <div class="header-actions">
                    <button class="search-trigger-btn" onclick="toggleMobileSearch()" title="Search">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="#1f2937" stroke-width="2.2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                    <button class="header-my-cart-btn" onclick="openCartDrawer()" title="View Cart">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="#0c831f" stroke-width="2.2" fill="none"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        <span class="my-cart-text">My Cart</span>
                        ${cartCount > 0 ? `<span class="cart-badge" id="cart-badge-count">${cartCount}</span>` : `<span class="cart-badge" id="cart-badge-count" style="display:none;">0</span>`}
                    </button>
                </div>
            </div>
            <div class="mobile-search-expand" id="mobile-search-expand">
                <form action="index.html" method="GET" class="search-form-mobile" onsubmit="event.preventDefault();">
                    <input type="text" id="mobile-header-search" placeholder='Search "atta, milk, eggs..."' autocomplete="off">
                </form>
            </div>
        </header>
    `;
    
    // Hook up search dropdown handler
    const searchInput = document.getElementById('header-search');
    const searchDropdown = document.getElementById('search-results-dropdown');
    
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) {
                searchDropdown.style.display = 'none';
                return;
            }
            
            const products = await getProducts();
            const matches = products.filter(p => p.title.toLowerCase().includes(query)).slice(0, 5);
            
            if (matches.length === 0) {
                searchDropdown.innerHTML = '<div class="search-no-results">No products found</div>';
            } else {
                searchDropdown.innerHTML = matches.map(p => `
                    <a href="product.html?id=${p.id}" class="search-result-item">
                        <img src="${p.image}" alt="${p.title}">
                        <div class="search-result-info">
                            <span class="search-result-title">${p.title}</span>
                            <div class="search-result-prices">
                                <span class="search-result-sale">${p.price}</span>
                                <span class="search-result-compare">${p.comparePrice}</span>
                            </div>
                        </div>
                    </a>
                `).join('');
            }
            searchDropdown.style.display = 'block';
        });
        
        // Hide dropdown on click outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });
    }
}

function renderFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;
    
    footerPlaceholder.innerHTML = `
        <footer class="jubimart-footer">
            <div class="jubimart-footer-container">
                <!-- Top Brand & App Downloads Row -->
                <div class="footer-top-row">
                    <div class="footer-brand-box">
                        <a href="index.html" class="footer-logo-wrap">
                            <img src="https://jubimart.vercel.app/assets/logo-BDwwMpVg.png" alt="JioMart" class="footer-logo-img">
                        </a>
                        <p class="footer-brand-desc">India's fastest online shopping platform. Groceries & more delivered in minutes.</p>
                    </div>
                    <div class="footer-app-box">
                        <p class="footer-app-title">Download our app</p>
                        <div class="footer-app-badges">
                            <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play"></a>
                            <a href="#"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store"></a>
                        </div>
                    </div>
                </div>

                <!-- 4 Column Links Grid -->
                <div class="footer-links-grid">
                    <div class="footer-col">
                        <h4>USEFUL LINKS</h4>
                        <ul>
                            <li><a href="index.html">Home</a></li>
                            <li><a href="about-us.html">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Press</a></li>
                            <li><a href="#">Lead Freshness</a></li>
                            <li><a href="#">Jio Mart for Business</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>CATEGORIES</h4>
                        <ul>
                            <li><a href="index.html?tab=grocery-combos">Vegetables & Fruits</a></li>
                            <li><a href="index.html?tab=grocery-combos">Dairy & Breakfast</a></li>
                            <li><a href="index.html?tab=grocery-combos">Munchies</a></li>
                            <li><a href="index.html?tab=grocery-combos">Cold Drinks & Juices</a></li>
                            <li><a href="index.html?tab=grocery-combos">Instant & Frozen Food</a></li>
                            <li><a href="index.html?tab=grocery-combos">Tea, Coffee & Health Drinks</a></li>
                            <li><a href="index.html?tab=grocery-combos">Bakery & Biscuits</a></li>
                            <li><a href="index.html?tab=grocery-combos">Sweet Tooth</a></li>
                            <li><a href="index.html?tab=grocery-combos">Atta, Rice & Dal</a></li>
                            <li><a href="index.html?tab=grocery-combos">Sauces & Spreads</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>HELP & SUPPORT</h4>
                        <ul>
                            <li><a href="faq.html">FAQs</a></li>
                            <li><a href="contact-information.html">Contact Us</a></li>
                            <li><a href="privacy-policy.html">Privacy Policy</a></li>
                            <li><a href="terms-of-service.html">Terms & Conditions</a></li>
                            <li><a href="refund-policy.html">Refund Policy</a></li>
                            <li><a href="return-policy.html">Return Policy</a></li>
                            <li><a href="shipping-policy.html">Pricing & Delivery Policy</a></li>
                            <li><a href="cookie-policy.html">Cookie Policy</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>OUR POLICIES</h4>
                        <ul>
                            <li><a href="#">Grievance Redressal</a></li>
                            <li><a href="#">Disclaimer</a></li>
                            <li><a href="#">Pickup Points</a></li>
                            <li><a href="cancellation-policy.html">Cancellation Policy</a></li>
                            <li><a href="#">Responsible Disclosure</a></li>
                            <li><a href="#">Sitemap</a></li>
                        </ul>
                    </div>
                </div>

                <!-- Social Follow Icons Row -->
                <div class="footer-social-row">
                    <span class="footer-social-title">Follow us</span>
                    <div class="footer-social-icons">
                        <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                        <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.636L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                        <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
                        <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
                        <a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
                    </div>
                </div>

                <!-- Cities List Row -->
                <div class="footer-cities-row">
                    <p class="footer-cities-title">WE DELIVER IN</p>
                    <p class="footer-cities-list">Agra <span>|</span> Ahmedabad <span>|</span> Aligarh <span>|</span> Allahabad <span>|</span> Bengaluru <span>|</span> Bhopal <span>|</span> Chandigarh <span>|</span> Chennai <span>|</span> Delhi <span>|</span> Faridabad <span>|</span> Gurugram <span>|</span> Guwahati <span>|</span> Hyderabad <span>|</span> Jaipur <span>|</span> Kanpur <span>|</span> Kolkata <span>|</span> Lucknow <span>|</span> Mumbai <span>|</span> Noida <span>|</span> Patna <span>|</span> Pune <span>|</span> Surat <span>|</span> Vadodara <span>|</span> Varanasi <span>|</span> Visakhapatnam</p>
                </div>

                <!-- About JioMart Text Row -->
                <div class="footer-about-row">
                    <p class="footer-about-title">ABOUT JIOMART</p>
                    <p class="footer-about-text">Jio Mart is India's fastest online shopping platform. Get fresh groceries and much more delivered online in minutes. Order thousands of products at just a tap: milk, eggs, bread, cooking oil, ghee, atta, rice, fresh fruits and vegetables, spices, fresh meat, seafood, frozen food, chocolates, chips, biscuits, cold drinks, shampoos, soaps, diapers, electronics, sanitizers, sanitary napkins, health products, and much more from your nearest stores.</p>
                    <p class="footer-disclaimer-text">"Jio Mart" is owned & managed by "Grofers India Private Limited" and is not related, linked or interconnected in whatsoever manner or nature, to "GROFFR.COM". By continuing past this page, you agree to our Terms of Service, Cookie Policy, Privacy Policy and Content Policies.</p>
                </div>
            </div>

            <!-- Bottom Copyright Bar -->
            <div class="jubimart-footer-bottom">
                <div class="jubimart-bottom-container">
                    <p>© 2025 Grofers India Pvt. Ltd. All Rights Reserved.</p>
                    <div class="footer-bottom-links">
                        <a href="privacy-policy.html">Privacy</a>
                        <span>·</span>
                        <a href="terms-of-service.html">Terms</a>
                        <span>·</span>
                        <a href="#">Cookies</a>
                        <span>·</span>
                        <span>Made in India</span>
                    </div>
                </div>
            </div>
        </footer>
    `;
}

// Cart Drawer Renderer
function renderCartDrawer() {
    let drawer = document.getElementById('cart-drawer-element');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'cart-drawer-element';
        drawer.className = 'cart-drawer-wrapper';
        document.body.appendChild(drawer);
    }
    
    const cart = getCart();
    const total = getCartTotal();
    const count = getCartCount();
    
    drawer.innerHTML = `
        <div class="cart-drawer-overlay" onclick="closeCartDrawer()"></div>
        <div class="cart-drawer">
            <div class="cart-drawer-header">
                <h2>Shopping Cart (${count})</h2>
                <button class="cart-close-btn" onclick="closeCartDrawer()">&times;</button>
            </div>
            
            <div class="cart-drawer-body">
                ${cart.length === 0 ? `
                    <div class="empty-cart-view">
                        <svg viewBox="0 0 24 24" width="60" height="60" stroke="#a0aec0" stroke-width="1.5" fill="none"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        <p>Your cart is empty</p>
                        <button class="continue-shopping-btn" onclick="closeCartDrawer()">Start Shopping</button>
                    </div>
                ` : `
                    <div class="cart-items-list">
                        ${cart.map(item => `
                            <div class="cart-item">
                                <div class="cart-item-img">
                                    <img src="${item.image}" alt="${item.title}">
                                </div>
                                <div class="cart-item-details">
                                    <a href="product.html?id=${item.id}" class="cart-item-title">${item.title}</a>
                                    <div class="cart-item-prices">
                                        <span class="cart-item-price">${item.price}</span>
                                        <span class="cart-item-compare">${item.comparePrice}</span>
                                    </div>
                                    <div class="cart-item-actions">
                                        <div class="qty-selector">
                                            <button onclick="updateCartQty('${item.id}', ${item.qty - 1})">-</button>
                                            <input type="number" value="${item.qty}" min="1" onchange="updateCartQty('${item.id}', this.value)">
                                            <button onclick="updateCartQty('${item.id}', ${item.qty + 1})">+</button>
                                        </div>
                                        <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            ${cart.length > 0 ? `
                <div class="cart-drawer-footer">
                    <div class="cart-subtotal">
                        <span>Subtotal:</span>
                        <span class="subtotal-amount">${formatPrice(total)}</span>
                    </div>
                    <p class="shipping-info-text">🚚 Express Shipping 2 to 3 Days Delivery | 🛡️ 100% Original Guarantee</p>
                    <a href="checkout.html" class="checkout-btn">Proceed to Checkout &rsaquo;</a>
                </div>
            ` : ''}
        </div>
    `;
}

function openCartDrawer() {
    renderCartDrawer();
    setTimeout(() => {
        document.getElementById('cart-drawer-element').classList.add('active');
    }, 10);
}

function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer-element');
    if (drawer) {
        drawer.classList.remove('active');
    }
}

function updateCartUI() {
    // Re-render drawer content if active
    const drawer = document.getElementById('cart-drawer-element');
    if (drawer && drawer.classList.contains('active')) {
        renderCartDrawer();
        drawer.classList.add('active');
    }
    
    // Update header badges
    const badge = document.getElementById('cart-badge-count');
    if (badge) {
        badge.innerText = getCartCount();
        badge.classList.remove('cart-bounce-anim');
        void badge.offsetWidth; // Trigger reflow to restart animation
        badge.classList.add('cart-bounce-anim');
    }
}

// Run database initialization immediately so that it is available for tracking and page rendering
dbInit();

// Auto-run on load
window.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
});
