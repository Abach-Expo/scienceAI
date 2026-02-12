import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Server, UserCheck, Mail } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const PrivacyPage = () => {
  useDocumentTitle('Политика конфиденциальности');
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Shield size={24} />,
      title: '1. Сбор информации',
      content: `Мы собираем следующую информацию:
• Email адрес — для авторизации и связи с вами
• Имя — для персонализации сервиса
• Данные профиля — организация, должность (опционально)
• Информация об использовании — для улучшения сервиса
• Созданный контент — презентации, документы, чаты

Мы НЕ собираем:
• Платёжные данные (обрабатываются через защищённые платёжные системы)
• Данные из других приложений
• Геолокацию в реальном времени`
    },
    {
      icon: <Lock size={24} />,
      title: '2. Использование данных',
      content: `Ваши данные используются для:
• Предоставления и улучшения сервиса Science AI
• Персонализации контента и рекомендаций
• Технической поддержки и коммуникации
• Анализа использования для улучшения продукта
• Выполнения юридических обязательств

Мы НЕ используем ваши данные для:
• Продажи третьим лицам
• Таргетированной рекламы
• Обучения AI-моделей без вашего согласия`
    },
    {
      icon: <Server size={24} />,
      title: '3. Хранение и защита',
      content: `Безопасность ваших данных — наш приоритет:
• Шифрование данных при передаче (TLS 1.3)
• Шифрование данных при хранении (AES-256)
• Регулярные аудиты безопасности
• Двухфакторная аутентификация (опционально)
• Серверы расположены в защищённых дата-центрах

Срок хранения:
• Данные аккаунта — пока аккаунт активен
• После удаления аккаунта — до 30 дней (для возможности восстановления)
• Логи использования — до 90 дней`
    },
    {
      icon: <Eye size={24} />,
      title: '4. Передача третьим лицам',
      content: `Мы можем передавать данные только:
• Платёжным провайдерам — для обработки оплаты
• Провайдерам AI — для генерации контента (без персональных данных)
• Правоохранительным органам — при наличии законного запроса

Мы НЕ передаём:
• Содержимое ваших документов без согласия
• Персональные данные рекламодателям
• Данные для маркетинговых целей третьих лиц`
    },
    {
      icon: <UserCheck size={24} />,
      title: '5. Ваши права',
      content: `Вы имеете право:
• Получить копию всех ваших данных (экспорт)
• Исправить неточные данные
• Удалить ваш аккаунт и все данные
• Отозвать согласие на обработку
• Подать жалобу в надзорный орган

Для реализации прав напишите на privacy@science-ai.app`
    },
    {
      icon: <Mail size={24} />,
      title: '6. Cookies и аналитика',
      content: `Мы используем:
• Технические cookies — для работы авторизации
• Аналитические cookies — для понимания использования сервиса

Вы можете отключить cookies в настройках браузера, но некоторые функции могут работать некорректно.`
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
            <h1 className="text-xl font-bold">Политика конфиденциальности</h1>
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
            Science AI ("мы", "наш", "сервис") уважает вашу конфиденциальность и стремится защитить ваши персональные данные. Эта политика объясняет, как мы собираем, используем и защищаем вашу информацию.
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
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
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

          <div className="mt-12 p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30">
            <h3 className="text-lg font-semibold mb-2">Вопросы?</h3>
            <p className="text-text-secondary text-sm">
              Если у вас есть вопросы о нашей политике конфиденциальности, свяжитесь с нами:
              <br />
              Email: <a href="mailto:privacy@science-ai.app" className="text-purple-400 hover:underline">privacy@science-ai.app</a>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PrivacyPage;
