# 💳 Настройка платёжной системы Science AI (LemonSqueezy)

## Обзор

Science AI использует **LemonSqueezy** как единственный платёжный провайдер.
LemonSqueezy выступает Merchant of Record — берёт на себя налоги и юридическую часть.

**Комиссия:** 5% + $0.50 за транзакцию  
**Вывод:** Payoneer, PayPal, банковский перевод  
**Минимальный вывод:** $50

---

## Планы подписок

| План | Monthly | Annual | Annual/мес |
|------|---------|--------|------------|
| Free | $0 | $0 | — |
| Starter | $5.99 | $57.50 | $4.79 |
| Pro | $12.99 | $124.70 | $10.39 |
| Maximum | $24.99 | $239.90 | $19.99 |

### Лимиты по планам

| Ресурс | Free | Starter | Pro | Maximum |
|--------|------|---------|-----|---------|
| Эссе/мес | 3 | 40 | 90 | 200 |
| Рефераты/мес | 1 | 15 | 35 | 80 |
| Курсовые/мес | 0 | 5 | 15 | 30 |
| AI-анализы | 5 | 50 | 120 | 200 |
| Презентации/мес | 2 | 30 | 70 | 150 |
| DALL-E изображения | 0 | 10 | 25 | 50 |
| Чат сообщений/день | 10 | 500 | ∞ | ∞ |
| Генерации диссертаций | 0 | 30 | 100 | 300 |
| Полные диссертации | ❌ | ❌ | 1/мес | 3/мес |
| Anti-AI Detection | ❌ | ✅ | ✅ v3 | ✅ v3 |
| Антиплагиат | ❌ | 10 | 30 | 100 |
| Экспорт | PDF | PDF/PPTX/DOCX | PDF/PPTX/DOCX | PDF/PPTX/DOCX |
| Приоритетная поддержка | ❌ | ❌ | ✅ | ✅ |

---

## Шаг 1: Регистрация в LemonSqueezy

1. Перейди на https://lemonsqueezy.com
2. Нажми **"Get started free"**
3. Заполни форму и подтверди email

## Шаг 2: Настрой магазин

1. https://app.lemonsqueezy.com/settings/general
2. Store Name: `Science AI`
3. Store URL: `science-ai`

## Шаг 3: Создай Products

Перейди: https://app.lemonsqueezy.com/products → **"New Product"**

### Product 1: Science AI Starter
- Variant 1: Monthly — $5.99/month (Subscription)
- Variant 2: Annual — $57.50/year (Subscription)
→ Запиши оба Variant ID

### Product 2: Science AI Pro  
- Variant 1: Monthly — $12.99/month (Subscription)
- Variant 2: Annual — $124.70/year (Subscription)
→ Запиши оба Variant ID

### Product 3: Science AI Maximum
- Variant 1: Monthly — $24.99/month (Subscription)
- Variant 2: Annual — $239.90/year (Subscription)
→ Запиши оба Variant ID

## Шаг 4: Настрой Webhook

1. https://app.lemonsqueezy.com/settings/webhooks
2. **"Add endpoint"**
3. URL: `https://api.science-ai.app/api/payments/webhook`
4. Signing Secret: генерируй случайную строку (32+ символов)
5. Events (выбери все):
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
   - `subscription_resumed`
   - `subscription_payment_success`
   - `subscription_payment_failed`

## Шаг 5: Обнови backend/.env

```env
# === LemonSqueezy ===
LEMONSQUEEZY_API_KEY=твой_api_key
LEMONSQUEEZY_STORE_ID=твой_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=твой_webhook_signing_secret

# Variant IDs (из Шага 3)
LS_VARIANT_STARTER_MONTHLY=variant_id_1
LS_VARIANT_STARTER_ANNUAL=variant_id_2
LS_VARIANT_PRO_MONTHLY=variant_id_3
LS_VARIANT_PRO_ANNUAL=variant_id_4
LS_VARIANT_PREMIUM_MONTHLY=variant_id_5
LS_VARIANT_PREMIUM_ANNUAL=variant_id_6

# Frontend URL (для redirect после оплаты)
FRONTEND_URL=https://science-ai.app
```

## Шаг 6: Настрой вывод денег

1. https://app.lemonsqueezy.com/settings/payouts
2. Добавь Payoneer или PayPal аккаунт
3. Для банковского перевода — настрой реквизиты в LemonSqueezy dashboard

---

## Потоки оплаты

### Покупка подписки:
```
Пользователь → Кнопка "Выбрать план" (PricingPage)
  → POST /api/payments/create-checkout {planId, billingPeriod, email}
  → Backend создаёт LemonSqueezy Checkout Session
  → Redirect на hosted checkout page
  → Пользователь оплачивает
  → Redirect на /settings?payment=success
  → Webhook subscription_created → Backend обновляет User в БД
```

### Отмена подписки:
```
POST /api/payments/cancel {subscriptionId}
  → LemonSqueezy cancels at period end
  → Webhook subscription_cancelled → status='cancelled'
  → При истечении: subscription_expired → downgrade to 'free'
```

### Смена плана:
```
POST /api/payments/change-plan {subscriptionId, newPlanId, newPeriod}
  → LemonSqueezy variant swap (proration applied)
  → Webhook subscription_updated → plan updated in DB
```

---

## Тестирование

LemonSqueezy Test Mode:
1. В dashboard переключи на **Test Mode**
2. Используй тестовую карту: `4242 4242 4242 4242`
3. Expiry: любая будущая дата, CVC: любые 3 цифры

---

## ✅ Чеклист перед Production

- [ ] API Key получен (Production, не Test)
- [ ] Store ID правильный
- [ ] Все 6 Variant IDs заполнены
- [ ] Webhook URL указан правильно
- [ ] Webhook Secret настроен
- [ ] Все webhook events выбраны
- [ ] Вывод денег настроен (Payoneer/PayPal)
- [ ] Протестировано в Test Mode
- [ ] HTTPS настроен

---

## ❓ Частые проблемы

### "Failed to create checkout"
→ Проверь `LEMONSQUEEZY_API_KEY` и Variant IDs в `.env`

### Webhook не приходит
→ Проверь URL webhook в LemonSqueezy dashboard, убедись что HTTPS работает

### Подписка не активируется
→ Проверь `LEMONSQUEEZY_WEBHOOK_SECRET` совпадает с настройкой в dashboard
