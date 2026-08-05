// ---------------------------------------------------------
// mock.js — localStorage-backed stand-in for the Apps Script
// backend. Mirrors the exact same action/response shape so
// swapping to the real backend (just set CONFIG.APPS_SCRIPT_URL)
// requires no changes anywhere else in the app.
// ---------------------------------------------------------

const LS_KEY = 'loyalboost_demo_db_v1';
const DEMO_USER = { username: 'admin', password: 'demo123' };

function seed() {
  return {
    settings: {
      businessName: 'Royal Salon & Spa',
      logo: '',
      primaryColor: '#6D5DFB',
      accentColor: '#00C2D1',
      category: 'salon',
      rewardName: 'Free Hair Spa',
      rewardDescription: 'One complimentary hair spa session on the house.',
      requiredVisits: 8,
      phone: '+91 98765 43210',
      address: 'MG Road, Indore, MP',
      website: 'royalsalon.example.com',
      social: '@royalsalon',
    },
    customers: [], // each customer row also carries its own visitHistory: [{date, service}]
    coupons: [],
    seq: 0,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through */ }
  const fresh = seed();
  save(fresh);
  return fresh;
}
function save(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
function delay(ms = 15) { return new Promise(r => setTimeout(r, ms)); }
function nextCustomerId(db) {
  db.seq += 1;
  return 'LB' + String(db.seq).padStart(5, '0');
}
function todayISO() { return new Date().toISOString(); }

export async function mockApi(action, payload = {}) {
  await delay();
  const db = load();

  switch (action) {
    case 'login': {
      if (payload.username === DEMO_USER.username && payload.password === DEMO_USER.password) {
        return { token: 'demo-token-' + Date.now() };
      }
      throw new Error('Invalid username or password');
    }

    case 'getSettings':
      return db.settings;

    case 'saveSettings':
      db.settings = { ...db.settings, ...payload.settings };
      save(db);
      return db.settings;

    case 'getDashboardStats': {
      const today = new Date().toDateString();
      const allVisits = db.customers.flatMap(c => c.visitHistory || []);
      const todayVisits = allVisits.filter(v => new Date(v.date).toDateString() === today).length;
      const pending = db.customers.filter(c => c.rewardStatus === 'pending').length;
      const redeemed = db.coupons.filter(c => c.status === 'Redeemed').length;
      const lastMonth = Date.now() - 30 * 86400000;
      const newThisMonth = db.customers.filter(c => new Date(c.createdDate).getTime() > lastMonth).length;
      return {
        totalCustomers: db.customers.length,
        todayVisits,
        pendingRewards: pending,
        rewardsRedeemed: redeemed,
        monthlyGrowth: newThisMonth,
        recentCustomers: [...db.customers].sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)).slice(0, 5),
      };
    }

    case 'listCustomers': {
      let list = [...db.customers];
      const { search, membership, page = 1, pageSize = 8 } = payload;
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(s) || c.mobile.includes(s) || c.customerId.toLowerCase().includes(s));
      }
      if (membership) list = list.filter(c => c.membership === membership);
      list.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
      const total = list.length;
      const start = (page - 1) * pageSize;
      return { customers: list.slice(start, start + pageSize), total, page, pageSize };
    }

    case 'getCustomer': {
      const c = db.customers.find(c => c.customerId === payload.customerId);
      if (!c) throw new Error('Customer not found');
      return c;
    }

    case 'createCustomer': {
      const required = db.settings.requiredVisits;
      const customer = {
        customerId: nextCustomerId(db),
        name: payload.customer.name,
        photo: payload.customer.photo || '',
        mobile: payload.customer.mobile || '',
        email: payload.customer.email || '',
        dob: payload.customer.dob || '',
        membership: payload.customer.membership || 'Bronze',
        notes: payload.customer.notes || '',
        visitCount: 0,
        requiredVisits: required,
        rewardStatus: 'none',
        qrId: 'QR-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        createdDate: todayISO(),
        lastVisit: '',
        rewardRedeemed: false,
        visitHistory: [],
      };
      db.customers.push(customer);
      save(db);
      return customer;
    }

    case 'updateCustomer': {
      const c = db.customers.find(c => c.customerId === payload.customerId);
      if (!c) throw new Error('Customer not found');
      Object.assign(c, payload.updates);
      save(db);
      return c;
    }

    case 'deleteCustomer': {
      db.customers = db.customers.filter(c => c.customerId !== payload.customerId);
      save(db);
      return { deleted: true };
    }

    case 'addVisit': {
      const c = db.customers.find(c => c.customerId === payload.customerId);
      if (!c) throw new Error('Customer not found');
      c.visitCount += 1;
      c.lastVisit = todayISO();
      c.visitHistory = c.visitHistory || [];
      c.visitHistory.push({ date: todayISO(), service: payload.service || db.settings.rewardName });
      let justCompleted = false;
      if (c.visitCount >= c.requiredVisits) {
        c.rewardStatus = 'pending';
        justCompleted = true;
        const coupon = {
          code: `${db.settings.category.toUpperCase()}-${new Date().getFullYear()}-${String(db.coupons.length + 1).padStart(3, '0')}`,
          customerId: c.customerId,
          status: 'Unused',
          createdDate: todayISO(),
          redeemedDate: '',
          rewardText: db.settings.rewardName,
        };
        db.coupons.push(coupon);
        c.visitCount = 0; // reset stamp cycle after reward is earned
      }
      save(db);
      return { customer: c, justCompleted, coupon: justCompleted ? db.coupons[db.coupons.length - 1] : null };
    }

    case 'getVisitHistory': {
      const c = db.customers.find(c => c.customerId === payload.customerId);
      if (!c) return [];
      return [...(c.visitHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    case 'redeemCoupon': {
      const coupon = db.coupons.find(c => c.code === payload.couponCode);
      if (!coupon) throw new Error('Coupon not found');
      if (coupon.status === 'Redeemed') throw new Error('Coupon already redeemed');
      coupon.status = 'Redeemed';
      coupon.redeemedDate = todayISO();
      const c = db.customers.find(c => c.customerId === coupon.customerId);
      if (c) {
        c.rewardStatus = 'none';
        c.rewardRedeemed = true;
        c.visitHistory = c.visitHistory || [];
        c.visitHistory.push({
          date: todayISO(),
          service: '🎁 Claimed Reward: ' + (coupon.rewardText || 'Free Reward'),
          type: 'reward'
        });
      }
      save(db);
      return coupon;
    }

    case 'scratchReward': {
      const prizes = ['10% OFF', '20% OFF', 'Free Add-on', 'Free Beverage', 'Better Luck Next Time'];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      return { prize };
    }

    case 'getPublicCard': {
      const c = db.customers.find(c => c.qrId === payload.qrId || c.customerId === payload.qrId);
      if (!c) throw new Error('Card not found');
      const coupon = db.coupons.find(cp => cp.customerId === c.customerId && cp.status === 'Unused');
      const history = [...(c.visitHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      return { customer: c, settings: db.settings, coupon: coupon || null, history };
    }

    default:
      throw new Error(`Unknown demo action: ${action}`);
  }
}
