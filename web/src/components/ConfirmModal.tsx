import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  loading?: boolean;
}

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  type = 'warning',
  loading = false,
}: ConfirmModalProps) => {
  const iconMap = {
    danger: <Trash2 size={24} className="text-red-400" />,
    warning: <AlertTriangle size={24} className="text-amber-400" />,
    success: <CheckCircle size={24} className="text-green-400" />,
    info: <Info size={24} className="text-blue-400" />,
  };

  const colorMap = {
    danger: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      button: 'bg-red-500 hover:bg-red-600',
      icon: 'bg-red-500/20',
    },
    warning: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/30',
      button: 'bg-amber-500 hover:bg-amber-600',
      icon: 'bg-amber-500/20',
    },
    success: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      button: 'bg-green-500 hover:bg-green-600',
      icon: 'bg-green-500/20',
    },
    info: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      button: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      icon: 'bg-blue-500/20',
    },
  };

  const colors = colorMap[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={`relative w-full max-w-md rounded-2xl bg-[#12121A] border ${colors.border} shadow-2xl overflow-hidden`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-bg-secondary flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center mb-4`}>
                {iconMap[type]}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>

              {/* Message */}
              <div className="text-text-secondary text-sm mb-6">{message}</div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-secondary text-text-primary font-medium transition-all disabled:opacity-50"
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onConfirm();
                    if (!loading) onClose();
                  }}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-xl ${colors.button} text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    confirmText
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Alert Modal (no confirm button, just info)
export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | ReactNode;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  type = 'info',
}: AlertModalProps) => {
  const iconMap = {
    error: <X size={24} className="text-red-400" />,
    warning: <AlertTriangle size={24} className="text-amber-400" />,
    success: <CheckCircle size={24} className="text-green-400" />,
    info: <Info size={24} className="text-blue-400" />,
  };

  const colorMap = {
    error: {
      border: 'border-red-500/30',
      button: 'bg-red-500 hover:bg-red-600',
      icon: 'bg-red-500/20',
    },
    warning: {
      border: 'border-amber-500/30',
      button: 'bg-amber-500 hover:bg-amber-600',
      icon: 'bg-amber-500/20',
    },
    success: {
      border: 'border-green-500/30',
      button: 'bg-green-500 hover:bg-green-600',
      icon: 'bg-green-500/20',
    },
    info: {
      border: 'border-purple-500/30',
      button: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      icon: 'bg-purple-500/20',
    },
  };

  const colors = colorMap[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={`relative w-full max-w-md rounded-2xl bg-[#12121A] border ${colors.border} shadow-2xl overflow-hidden`}
          >
            <div className="p-6 text-center">
              <div className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center mx-auto mb-4`}>
                {iconMap[type]}
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
              <div className="text-text-secondary text-sm mb-6">{message}</div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={`w-full py-3 rounded-xl ${colors.button} text-white font-medium transition-all`}
              >
                {buttonText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook for easy usage
import { useState, useCallback } from 'react';

interface UseConfirmOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
}

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmOptions>({
    title: '',
    message: '',
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: UseConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef) {
      resolveRef(true);
      setResolveRef(null);
    }
    setIsOpen(false);
  }, [resolveRef]);

  const handleClose = useCallback(() => {
    if (resolveRef) {
      resolveRef(false);
      setResolveRef(null);
    }
    setIsOpen(false);
  }, [resolveRef]);

  const ConfirmDialog = () => (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...options}
    />
  );

  return { confirm, ConfirmDialog };
};

interface UseAlertOptions {
  title: string;
  message: string | ReactNode;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const useAlert = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseAlertOptions>({
    title: '',
    message: '',
  });

  const alert = useCallback((opts: UseAlertOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const AlertDialog = () => (
    <AlertModal
      isOpen={isOpen}
      onClose={handleClose}
      {...options}
    />
  );

  return { alert, AlertDialog };
};

export default ConfirmModal;
