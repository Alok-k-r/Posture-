import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, CreditCard, Smartphone, Building, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Appointment } from '../../store/store';

interface AdvancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onPaymentSuccess: (transactionId: string) => void;
}

export const AdvancePaymentModal: React.FC<AdvancePaymentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onPaymentSuccess,
}) => {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('user@upi');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8812');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [txnId, setTxnId] = useState('');

  if (!isOpen) return null;

  const advanceFee = appointment.advanceFeeAmount || 200;

  const handlePay = () => {
    setIsProcessing(true);
    const generatedTxn = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    setTxnId(generatedTxn);

    setTimeout(() => {
      setIsProcessing(false);
      setIsPaidSuccess(true);
      setTimeout(() => {
        onPaymentSuccess(generatedTxn);
      }, 1500);
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider rounded-full">
                Doctor Approved
              </span>
            </div>

            <h3 className="text-xl font-black tracking-tight text-white">Confirm Appointment Slot</h3>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Pay ₹{advanceFee} token deposit to finalize booking with {appointment.doctorName}.
            </p>

            <div className="mt-4 p-3 bg-slate-800/90 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Advance Deposit Fee</p>
                <p className="text-xl font-black text-emerald-400">₹{advanceFee}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Remaining Fee On Visit</p>
                <p className="text-xs font-bold text-slate-200">₹{parseInt(appointment.fee.replace('₹', '') || '1000') - advanceFee}</p>
              </div>
            </div>
          </div>

          {/* Payment Body */}
          <div className="p-6">
            {isPaidSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-xl font-black text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                  Your appointment slot with <span className="font-bold text-slate-800">{appointment.doctorName}</span> is officially confirmed.
                </p>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-mono inline-block">
                  TXN ID: <span className="font-bold text-slate-900">{txnId}</span>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Method Tabs */}
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod('upi')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        method === 'upi'
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone size={18} />
                      <span>UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('card')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        method === 'card'
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard size={18} />
                      <span>Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('netbanking')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        method === 'netbanking'
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building size={18} />
                      <span>NetBanking</span>
                    </button>
                  </div>
                </div>

                {/* Form Inputs */}
                {method === 'upi' && (
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 block">UPI ID / VPA</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. mobile@upi"
                    />
                    <p className="text-[10px] text-slate-500 font-medium">Supports Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                )}

                {method === 'card' && (
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 block">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {method === 'netbanking' && (
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 block">Select Bank</label>
                    <select className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none">
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>State Bank of India</option>
                      <option>Axis Bank</option>
                    </select>
                  </div>
                )}

                {/* Pay Button */}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Securing Slot...
                    </span>
                  ) : (
                    <>
                      <span>Pay ₹{advanceFee} & Confirm Slot</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold pt-1">
                  <Lock size={12} className="text-emerald-600" />
                  <span>256-Bit Bank Grade SSL Encrypted Checkout</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
