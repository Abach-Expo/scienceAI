/**
 * Referral Program Component
 * Share your code and earn bonuses!
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Share2, Users, Sparkles } from 'lucide-react';
import { useSubscriptionStore } from '../store/subscriptionStore';

export default function ReferralProgram() {
  const { referral, getReferralCode, applyReferralBonus } = useSubscriptionStore();
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const referralCode = getReferralCode();
  const shareUrl = `https://science-ai.app/?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Science AI — AI для студентов',
          text: 'Попробуй Science AI — создавай диссертации, курсовые и презентации с помощью AI!',
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleApplyCode = () => {
    if (!friendCode.trim()) return;
    
    // In a real app, this would validate the code with the backend
    // For now, just apply the bonus locally
    try {
      applyReferralBonus(false); // false = user is the referred friend
      setApplyStatus('success');
      setFriendCode('');
      setTimeout(() => setApplyStatus('idle'), 3000);
    } catch {
      setApplyStatus('error');
      setTimeout(() => setApplyStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center">
          <Gift size={20} className="text-pink-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Реферальная программа</h3>
          <p className="text-sm text-text-muted">Приглашай друзей и получай бонусы</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-purple-400" />
            <span className="text-xs text-text-muted">Приглашено</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{referral.referralsCount}</p>
        </div>
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-xs text-text-muted">Бонус токенов</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">+{referral.bonusTokensEarned}</p>
        </div>
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={16} className="text-pink-400" />
            <span className="text-xs text-text-muted">Доп. презентации</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">+{referral.bonusLimitsEarned.presentations}</p>
        </div>
      </div>

      {/* Your Code */}
      <div className="bg-bg-secondary rounded-xl p-4 border border-border-primary">
        <p className="text-sm text-text-muted mb-3">Твой реферальный код:</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-bg-tertiary rounded-lg px-4 py-3 font-mono text-text-primary border border-border-primary">
            {referralCode}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center gap-2"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Скопировано!' : 'Копировать'}
          </motion.button>
        </div>
        
        <div className="mt-4 flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShare}
            className="flex-1 py-3 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary flex items-center justify-center gap-2 hover:bg-bg-primary transition-colors"
          >
            <Share2 size={18} />
            Поделиться ссылкой
          </motion.button>
        </div>
      </div>

      {/* Apply Friend's Code */}
      <div className="bg-bg-secondary rounded-xl p-4 border border-border-primary">
        <p className="text-sm text-text-muted mb-3">Есть код друга? Введи его:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            placeholder="SCI-XXXXXX"
            className="flex-1 bg-bg-tertiary rounded-lg px-4 py-3 font-mono text-text-primary border border-border-primary focus:border-purple-500 outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleApplyCode}
            disabled={!friendCode.trim()}
            className="px-4 py-3 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-primary transition-colors"
          >
            Применить
          </motion.button>
        </div>
        {applyStatus === 'success' && (
          <p className="mt-2 text-sm text-green-400">✓ Бонус применён! +500 токенов</p>
        )}
        {applyStatus === 'error' && (
          <p className="mt-2 text-sm text-red-400">✗ Неверный код или уже использован</p>
        )}
      </div>

      {/* Rewards Info */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
        <h4 className="font-semibold text-text-primary mb-2">🎁 Что получаешь:</h4>
        <ul className="space-y-2 text-sm text-text-muted">
          <li className="flex items-center gap-2">
            <span className="text-purple-400">•</span>
            <span><strong>+500 токенов</strong> за каждого друга</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-pink-400">•</span>
            <span><strong>+5 презентаций</strong> бонуса в месяц</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-400">•</span>
            <span><strong>+3 DALL-E изображения</strong> бонуса</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">•</span>
            <span>Друг тоже получает <strong>+500 токенов</strong>!</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
