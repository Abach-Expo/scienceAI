import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Lock,
} from 'lucide-react';
import { PlanType, SUBSCRIPTION_PLANS, ANNUAL_PLANS, useSubscriptionStore } from '../store/subscriptionStore';
import { BillingPeriod, redirectToCheckout } from '../services/payment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: PlanType;
  isRenewal?: boolean;
  onSuccess?: () => void;
}

export const PaymentModal = ({ isOpen, onClose, planId, isRenewal, onSuccess }: PaymentModalProps) => {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [email, setEmail] = useState('');

  const subscription = useSubscriptionStore();
  const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.starter;

  const annualPlanKey = `${planId}_annual`;
  const annualPlan = (ANNUAL_PLANS as Record<string, any>)[annualPlanKey];

  const monthlyPrice = plan.price;
  const annualPrice = annualPlan?.annualPrice || monthlyPrice * 12 * 0.8;
  const savings = annualPlan?.savings || monthlyPrice * 12 * 0.2;
  const currentPrice = billingPeriod === 'monthly' ? monthlyPrice : annualPrice;

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!email) {
      setError('Enter your email for the receipt');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep('processing');

    try {
      await redirectToCheckout(planId, email, billingPeriod);
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const message = err instanceof Error ? err.message : 'Payment processing error';
      setError(message);
      setStep('error');
      setIsProcessing(false);
    }
  };

  // Demo mode
  const handleDemoPayment = async () => {
    setIsProcessing(true);
    setStep('processing');

    await new Promise(r => setTimeout(r, 2000));

    if (isRenewal) {
      subscription.renewPlan();
    } else {
      subscription.setPlan(planId);
    }

    setStep('success');
    setIsProcessing(false);

    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  const isLive = import.meta.env.VITE_PAYMENT_MODE === 'live';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-bg-secondary rounded-2xl border border-border-primary w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-border-primary bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {isRenewal ? 'Renew Subscription' : 'Subscribe'}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {plan.name} - ${currentPrice.toFixed(2)}
                  {billingPeriod === 'monthly' ? '/mo' : '/yr'}
                  {isRenewal && ' \u2022 Reset all limits'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {step === 'select' && (
              <>
                {/* Billing Period Toggle */}
                {!isRenewal && (
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 p-1 bg-bg-tertiary rounded-xl">
                      <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                          billingPeriod === 'monthly'
                            ? 'bg-accent-primary text-white shadow-lg'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingPeriod('annual')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all relative ${
                          billingPeriod === 'annual'
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        Annual
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          -20%
                        </span>
                      </button>
                    </div>

                    {billingPeriod === 'annual' && (
                      <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-400">You save</span>
                          <span className="font-bold text-green-400">${savings.toFixed(2)}/yr</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Email */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Email for receipt
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none"
                  />
                </div>

                {/* Payment method info */}
                <div className="mb-6 p-4 rounded-xl bg-bg-tertiary border border-border-primary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary text-sm">Secure Payment</div>
                      <div className="text-xs text-text-muted">Cards, PayPal, Google Pay, Apple Pay</div>
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-2 text-xs text-text-muted mb-6 justify-center">
                  <Shield size={14} className="text-green-400" />
                  <span>SSL encrypted secure payment</span>
                  <Lock size={14} className="text-green-400" />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary hover:bg-bg-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing || !email}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Pay ${billingPeriod === 'annual' ? annualPrice.toFixed(2) : monthlyPrice.toFixed(2)}
                      </>
                    )}
                  </button>
                </div>

                {/* Demo notice */}
                {!isLive && (
                  <p className="text-xs text-text-muted text-center mt-4">
                    Demo mode: payment is simulated for testing
                  </p>
                )}
              </>
            )}

            {step === 'processing' && (
              <div className="py-12 text-center">
                <Loader2 size={48} className="animate-spin text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Processing payment...
                </h3>
                <p className="text-sm text-text-muted">
                  Please do not close this window
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Payment successful!
                </h3>
                <p className="text-sm text-text-muted">
                  {plan.name} subscription activated
                </p>
              </div>
            )}

            {step === 'error' && (
              <div className="py-12 text-center">
                <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Payment Error
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  {error || 'Please try again'}
                </p>
                <button
                  onClick={() => setStep('select')}
                  className="px-6 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;
