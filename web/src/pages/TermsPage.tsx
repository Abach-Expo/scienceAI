import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, Ban, CreditCard, Scale, RefreshCw } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TermsPage = () => {
  useDocumentTitle('Условия использования');
  const navigate = useNavigate();

  const sections = [
    {
      icon: <FileText size={24} />,
      title: '1. Общие положения',
      content: `Добро пожаловать в Science AI. Используя наш сервис, вы соглашаетесь с настоящими Условиями использования.

Science AI — это платформа для создания презентаций и научных работ с использованием искусственного интеллекта. Сервис предоставляется "как есть" и предназначен для личного и коммерческого использования.

Для использования сервиса вам должно быть не менее 16 лет или у вас должно быть разрешение родителей/опекунов.`
    },
    {
      icon: <AlertTriangle size={24} />,
      title: '2. Правила использования',
      content: `Вы соглашаетесь:
• Использовать сервис только в законных целях
• Не нарушать права интеллектуальной собственности
• Не распространять вредоносный или незаконный контент
• Не пытаться получить несанкционированный доступ
• Не перегружать сервис автоматизированными запросами

Вы несёте ответственность за:
• Безопасность вашего аккаунта
• Контент, который вы создаёте и публикуете
• Соблюдение авторских прав при использовании материалов`
    },
    {
      icon: <Ban size={24} />,
      title: '3. Запрещённый контент',
      content: `Запрещено использовать сервис для создания:
• Контента, нарушающего законодательство
• Материалов, пропагандирующих насилие или ненависть
• Ложной информации, выдаваемой за научную
• Контента, нарушающего авторские права
• Спама и фишинговых материалов
• Материалов сексуального характера с несовершеннолетними

Нарушение этих правил ведёт к немедленной блокировке аккаунта.`
    },
    {
      icon: <CreditCard size={24} />,
      title: '4. Оплата и подписка',
      content: `Условия оплаты:
• Бесплатный план — ограниченные функции без оплаты
• Платные планы — ежемесячная или годовая оплата
• Оплата производится через защищённые платёжные системы
• Цены указаны в долларах США без учёта налогов

Отмена подписки:
• Вы можете отменить подписку в любое время
• Доступ сохраняется до конца оплаченного периода
• Автоматическое продление можно отключить в настройках`
    },
    {
      icon: <RefreshCw size={24} />,
      title: '5. Возврат средств',
      content: `Политика возврата:
• Возврат возможен в течение 24 часов после оплаты
• Для возврата напишите на support@science-ai.app
• Возврат производится тем же способом, что и оплата
• Частичный возврат при отмене в середине периода не производится

Исключения:
• Возврат невозможен при нарушении правил использования
• Бонусные токены и акционные предложения не возвращаются`
    },
    {
      icon: <Scale size={24} />,
      title: '6. Ограничение ответственности',
      content: `Science AI не несёт ответственности за:
• Точность и достоверность сгенерированного контента
• Использование контента в научных публикациях без проверки
• Перебои в работе сервиса
• Потерю данных (рекомендуем делать резервные копии)
• Действия третьих лиц

AI-генерируемый контент требует проверки:
Сгенерированные тексты могут содержать неточности. Всегда проверяйте факты перед использованием в официальных документах.`
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border-primary">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-bg-tertiary hover:bg-bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold">Условия использования</h1>
            <p className="text-sm text-text-secondary">Последнее обновление: Февраль 2026</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <p className="text-lg text-text-secondary mb-8">
            Пожалуйста, внимательно ознакомьтесь с условиями использования сервиса Science AI перед началом работы. Используя сервис, вы подтверждаете согласие с этими условиями.
          </p>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-bg-secondary/50 border border-border-primary"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    {section.icon}
                  </div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </div>
                <div className="text-text-secondary whitespace-pre-line text-sm">
                  {section.content}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <h3 className="text-lg font-semibold mb-2">Изменения условий</h3>
            <p className="text-text-secondary text-sm">
              Мы можем обновлять эти условия. Существенные изменения будут сообщены на email. Продолжая использовать сервис после изменений, вы соглашаетесь с новыми условиями.
              <br /><br />
              Вопросы: <a href="mailto:legal@science-ai.app" className="text-blue-400 hover:underline">legal@science-ai.app</a>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TermsPage;
