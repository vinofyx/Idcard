import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Check, Zap, Star, Building2, AlertCircle } from 'lucide-react';

const PLAN_ICONS = { free: Building2, basic: Zap, pro: Star };
const PLAN_COLORS = { free: '#868e96', basic: '#3b5bdb', pro: '#e67700' };
const PLAN_BG    = { free: '#f8f9fa', basic: '#edf2ff', pro: '#fff3bf' };

export default function BillingPage() {
  const { organization, refreshOrg } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState('');

  useEffect(() => {
    api.get('/billing/plans')
      .then(({ data }) => setPlans(data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleUpgrade = async (planId) => {
    if (planId === 'free' || planId === organization?.plan) return;
    setUpgrading(planId);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Could not load payment gateway. Check your internet connection.'); setUpgrading(''); return; }

      const { data: order } = await api.post('/billing/create-order', { planId });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'IDFlow',
        description: `Upgrade to ${order.planName}`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const { data } = await api.post('/billing/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            });
            toast.success(data.message);
            await refreshOrg();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: { name: '', email: '' },
        theme: { color: '#3b5bdb' },
        modal: { ondismiss: () => setUpgrading('') },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => toast.error('Payment failed: ' + r.error.description));
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
      setUpgrading('');
    }
  };

  const currentPlan = organization?.plan || 'free';

  return (
    <div>
      <div className="page-header">
        <h1>Plans & Billing</h1>
        <p>Upgrade to generate more IDs and unlock advanced features</p>
      </div>

      {/* Current plan banner */}
      <div style={{ background: '#edf2ff', border: '1px solid #c5d0fa', borderRadius: 10, padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Zap size={20} color="#3b5bdb" />
        <div>
          <strong>Current plan: {plans.find((p) => p.id === currentPlan)?.name || currentPlan.toUpperCase()}</strong>
          {currentPlan === 'free' && <span style={{ marginLeft: 8, fontSize: 13, color: '#495057' }}>— upgrade anytime, cancel anytime.</span>}
          {currentPlan !== 'free' && <span style={{ marginLeft: 8, fontSize: 13, color: '#2f9e44' }}>— active ✓</span>}
        </div>
      </div>

      {/* Test mode notice */}
      <div style={{ background: '#fff3bf', border: '1px solid #ffe066', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#664d03', display: 'flex', gap: 8, alignItems: 'center' }}>
        <AlertCircle size={15} />
        <span>Razorpay is in <strong>test mode</strong>. Use test card <code>4111 1111 1111 1111</code>, any future expiry, any CVV.</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900 }}>
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || Star;
            const color = PLAN_COLORS[plan.id];
            const bg = PLAN_BG[plan.id];
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = plans.findIndex((p) => p.id === plan.id) < plans.findIndex((p) => p.id === currentPlan);

            return (
              <div
                key={plan.id}
                className="card"
                style={{
                  border: `2px solid ${isCurrent ? color : '#e9ecef'}`,
                  position: 'relative',
                  transition: 'transform .15s, box-shadow .15s',
                }}
              >
                {plan.id === 'pro' && (
                  <div style={{ position: 'absolute', top: -1, right: 20, background: '#e67700', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 6px 6px' }}>
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div style={{ position: 'absolute', top: -1, left: 20, background: color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 6px 6px' }}>
                    CURRENT PLAN
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: bg, padding: 10, borderRadius: 8 }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</div>
                    <div style={{ fontSize: 13, color: '#868e96' }}>
                      {plan.price === 0 ? 'Free forever' : `₹${(plan.price / 100).toLocaleString('en-IN')}/month`}
                    </div>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'flex-start' }}>
                      <Check size={15} color="#2f9e44" style={{ flexShrink: 0, marginTop: 1 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`btn btn-block ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                  style={isCurrent ? {} : { background: color }}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || isDowngrade || upgrading === plan.id}
                >
                  {upgrading === plan.id
                    ? <><span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#fff' }} /> Processing…</>
                    : isCurrent ? 'Current Plan'
                    : isDowngrade ? 'Downgrade (Contact Us)'
                    : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 13, color: '#868e96' }}>
        <p>💳 Payments processed securely by <strong>Razorpay</strong>. Plans auto-renew monthly.</p>
        <p style={{ marginTop: 4 }}>Need Enterprise pricing? <a href="mailto:hello@idflow.in">Contact us</a></p>
      </div>
    </div>
  );
}
