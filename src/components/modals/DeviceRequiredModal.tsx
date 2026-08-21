import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setDeviceStatus, setHasPaired, setIsSimulating, setIsRecordingSession } from '../../store/store';
import { Bluetooth, WifiOff, AlertTriangle, Play, ChevronRight, X, Sparkles, Loader2, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bluetoothService } from '../../services/bluetoothService';
import { cn } from '../../lib/utils';

interface DeviceRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectedAndStart?: () => void;
}

export const DeviceRequiredModal: React.FC<DeviceRequiredModalProps> = ({
  isOpen,
  onClose,
  onConnectedAndStart,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const device = useSelector((state: RootState) => state.device);
  const [isConnectingBle, setIsConnectingBle] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectBle = async () => {
    setIsConnectingBle(true);
    setBleError(null);
    try {
      const success = await bluetoothService.connect();
      if (success) {
        dispatch(setDeviceStatus(true));
        dispatch(setHasPaired(true));
        dispatch(setIsRecordingSession(true));
        if (onConnectedAndStart) {
          onConnectedAndStart();
        }
        onClose();
      } else {
        setBleError("Could not connect to PostureCare Pod. Ensure device is turned on and in Bluetooth range.");
      }
    } catch (err: any) {
      const errMsg = String(err.message || err);
      if (errMsg.includes('permissions policy') || errMsg.includes('disallowed') || errMsg.includes('SecurityError')) {
        setBleError("Bluetooth access is restricted inside preview iframes. Open the app in a New Tab or launch the Pairing Companion.");
      } else if (errMsg.includes('User cancelled') || errMsg.includes('cancel')) {
        setBleError("Bluetooth device pairing was cancelled.");
      } else {
        setBleError(`Connection error: ${err.message || err}`);
      }
    } finally {
      setIsConnectingBle(false);
    }
  };

  const handleLaunchSetup = () => {
    onClose();
    navigate('/device-setup');
  };

  const handleEnableDemoSimulation = () => {
    dispatch(setIsSimulating(true));
    dispatch(setDeviceStatus(true));
    dispatch(setIsRecordingSession(true));
    if (onConnectedAndStart) {
      onConnectedAndStart();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className="relative w-full max-w-md bg-white rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden z-10 p-6 sm:p-7"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>

          {/* Header Icon */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-13 h-13 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
              <WifiOff size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-black text-[9px] uppercase tracking-wider">
                  Device Disconnected
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                Hardware Link Required
              </h3>
            </div>
          </div>

          {/* Core Explanatory Copy */}
          <p className="text-xs text-slate-600 font-medium leading-relaxed mb-5">
            Posture recordings capture live spinal angles, slouch incidents, and paraspinal biomechanical torque. To prevent recording empty or inaccurate data, your <strong className="text-slate-800 font-bold">PostureCare Pod</strong> must be actively connected.
          </p>

          {/* Error Message if BLE fails */}
          {bleError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 mb-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
            >
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug font-medium text-[11px]">
                {bleError}
              </div>
            </motion.div>
          )}

          {/* Action List */}
          <div className="space-y-2.5">
            {/* Action 1: Connect via Web Bluetooth */}
            <button
              onClick={handleConnectBle}
              disabled={isConnectingBle}
              className={cn(
                "w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center justify-between transition-all active:scale-[0.98]",
                isConnectingBle && "opacity-80 cursor-wait"
              )}
            >
              <div className="flex items-center gap-2.5">
                {isConnectingBle ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Bluetooth size={16} className="text-indigo-200" />
                )}
                <span>{isConnectingBle ? "Connecting Bluetooth Pod..." : "Connect via Bluetooth"}</span>
              </div>
              <ChevronRight size={14} className="text-indigo-200" />
            </button>

            {/* Action 2: Setup Companion Wizard */}
            <button
              onClick={handleLaunchSetup}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone size={16} className="text-slate-500" />
                <span>Pairing Companion Wizard</span>
              </div>
              <ChevronRight size={14} className="text-slate-400" />
            </button>

            {/* Action 3: Demo Simulator fallback for instant evaluation */}
            <button
              onClick={handleEnableDemoSimulation}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={15} className="text-emerald-600" />
                <span>Record in Simulator Mode</span>
              </div>
              <Play size={13} className="text-emerald-600 fill-current" />
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-semibold">
              Recording will start automatically once your device telemetry is established.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
