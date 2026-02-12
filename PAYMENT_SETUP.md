# 💳 Настройка платёжных систем Science AI

## 🍋 LEMONSQUEEZY (РЕКОМЕНДУЕТСЯ!)

**Почему LemonSqueezy лучший выбор:**
- ✅ Работает из ЛЮБОЙ страны (Узбекистан, Россия, Казахстан и др.)
- ✅ Они — Merchant of Record (берут на себя налоги и юридическую часть)
- ✅ Принимает карты, PayPal, Apple Pay, Google Pay
- ✅ Вывод на Payoneer, PayPal, банковский перевод
- 💰 Комиссия: 5% + $0.50 за транзакцию

### Шаг 1: Регистрация
1. Перейди на https://lemonsqueezy.com
2. Нажми **"Get started free"**
3. Заполни форму и подтверди email

### Шаг 2: Настрой магазин
1. https://app.lemonsqueezy.com/settings/general
2. Store Name: `Science AI`
3. Store URL: `science-ai` (это будет твой Store ID)

### Шаг 3: Создай Products
1. https://app.lemonsqueezy.com/products → **"New Product"**

**Создай 3 продукта с вариантами:**

#### Product 1: Science AI Starter
- Variant 1: Monthly - $5.99/month (Subscription)
- Variant 2: Annual - $57.50/year (Subscription, скидка 20%)
→ Скопируй Variant IDs

#### Product 2: Science AI Pro
- Variant 1: Monthly - $12.99/month
- Variant 2: Annual - $124.70/year
→ Скопируй Variant IDs

#### Product 3: Science AI Premium
- Variant 1: Monthly - $24.99/month
- Variant 2: Annual - $239.90/year
→ Скопируй Variant IDs

### Шаг 4: Обнови backend/.env

```env
LEMONSQUEEZY_API_KEY=твой_api_key_из_настроек
LEMONSQUEEZY_STORE_ID=твой_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=твой_webhook_secret

# Variant IDs (из Шага 3)
LS_VARIANT_STARTER_MONTHLY=123456
LS_VARIANT_STARTER_ANNUAL=123457
LS_VARIANT_PRO_MONTHLY=123458
LS_VARIANT_PRO_ANNUAL=123459
LS_VARIANT_PREMIUM_MONTHLY=123460
LS_VARIANT_PREMIUM_ANNUAL=123461
```

### Шаг 5: Обнови web/.env (опционально)

```env
VITE_PAYMENT_MODE=live
```

### Шаг 5: Настрой Webhook
1. https://app.lemonsqueezy.com/settings/webhooks
2. **"Add endpoint"**
3. URL: `https://ТВОЙ_ДОМЕН/api/payments/webhook`
4. Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_resumed`

### Шаг 6: Настрой вывод денег
1. https://app.lemonsqueezy.com/settings/payouts
2. Добавь Payoneer или PayPal аккаунт
3. Минимальный вывод: $50

---

## 🟣 STRIPE (только для США, ЕС, UK и др.)

### Шаг 1: Регистрация
1. Перейди на https://dashboard.stripe.com/register
2. Заполни форму (email, пароль)
3. Подтверди email

### Шаг 2: Включи Test Mode
- В правом верхнем углу есть переключатель **"Test mode"**
- Убедись что он **ВКЛЮЧЁН** (оранжевый)

### Шаг 3: Получи API ключи
1. Перейди https://dashboard.stripe.com/test/apikeys
2. Скопируй ключи:

```
Publishable key: pk_test_XXXXXXXXXXXX  → для frontend (web/.env)
Secret key:      sk_test_XXXXXXXXXXXX  → для backend (backend/.env)
```

### Шаг 4: Создай Products (Продукты)
1. Перейди https://dashboard.stripe.com/test/products
2. Нажми **"+ Add product"**

**Создай 3 продукта:**

#### Product 1: Starter
- Name: `Science AI Starter`
- Description: `10,000 tokens, 15 presentations, 20 dissertation generations`
- Pricing:
  - Price 1: `$4.99` / month (Recurring) → скопируй Price ID
  - Price 2: `$47.90` / year (Recurring) → скопируй Price ID

#### Product 2: Pro  
- Name: `Science AI Pro`
- Description: `30,000 tokens, 50 presentations, unlimited dissertations`
- Pricing:
  - Price 1: `$9.99` / month → скопируй Price ID
  - Price 2: `$95.90` / year → скопируй Price ID

#### Product 3: Maximum
- Name: `Science AI Maximum`  
- Description: `Unlimited tokens, unlimited everything`
- Pricing:
  - Price 1: `$19.99` / month → скопируй Price ID
  - Price 2: `$191.90` / year → скопируй Price ID

### Шаг 5: Обнови backend/.env

```env
STRIPE_SECRET_KEY=sk_test_ТВОЙ_СЕКРЕТНЫЙ_КЛЮЧ

# Месячные планы (Price IDs с шага 4)
STRIPE_PRICE_STARTER_MONTHLY=price_1XXXXXXXXXX
STRIPE_PRICE_PRO_MONTHLY=price_1XXXXXXXXXX
STRIPE_PRICE_UNLIMITED_MONTHLY=price_1XXXXXXXXXX

# Годовые планы
STRIPE_PRICE_STARTER_ANNUAL=price_1XXXXXXXXXX
STRIPE_PRICE_PRO_ANNUAL=price_1XXXXXXXXXX
STRIPE_PRICE_UNLIMITED_ANNUAL=price_1XXXXXXXXXX
```

### Шаг 6: Обнови web/.env

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_ТВОЙ_ПУБЛИЧНЫЙ_КЛЮЧ
```

### Шаг 7: Настрой Webhook (для проd)
1. https://dashboard.stripe.com/test/webhooks
2. **"+ Add endpoint"**
3. URL: `https://ТВОЙ_ДОМЕН/api/payments/webhook/stripe`
4. Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Скопируй Webhook Secret → `STRIPE_WEBHOOK_SECRET` в backend/.env

---

## 🔵 PAYPAL

### Шаг 1: Создай Developer аккаунт
1. https://developer.paypal.com
2. Войди или создай аккаунт PayPal

### Шаг 2: Создай приложение
1. https://developer.paypal.com/dashboard/applications
2. **"Create App"**
3. Название: `Science AI Assistant`
4. Тип: **Merchant** (Продавец)

### Шаг 3: Получи ключи
- **Client ID** → для backend и frontend
- **Secret** → только для backend

### Шаг 4: Создай Subscription Plans
1. https://developer.paypal.com/dashboard/applications → твоё приложение
2. В разделе **Billing** → **Subscriptions**
3. Создай планы аналогично Stripe

### Шаг 5: Обнови .env файлы

**backend/.env:**
```env
PAYPAL_CLIENT_ID=ТВОЙ_CLIENT_ID
PAYPAL_CLIENT_SECRET=ТВОЙ_SECRET
PAYPAL_MODE=sandbox

# Plan IDs
PAYPAL_PLAN_STARTER_MONTHLY=P-XXXXXXXXXX
PAYPAL_PLAN_PRO_MONTHLY=P-XXXXXXXXXX
PAYPAL_PLAN_UNLIMITED_MONTHLY=P-XXXXXXXXXX
```

**web/.env:**
```env
VITE_PAYPAL_CLIENT_ID=ТВОЙ_CLIENT_ID
VITE_PAYPAL_MODE=sandbox
```

---

## 🧪 Тестирование

### Stripe Test Cards:
```
Успешная оплата: 4242 4242 4242 4242
Отклонённая:     4000 0000 0000 0002
3D Secure:       4000 0025 0000 3155

Expiry: любая будущая дата (12/34)
CVC: любые 3 цифры (123)
```

### PayPal Sandbox:
1. https://developer.paypal.com/dashboard/accounts
2. Создай тестовый аккаунт покупателя
3. Используй эти данные для тестовых покупок

---

## ✅ Чеклист перед запуском в Production

- [ ] Получены production ключи Stripe
- [ ] Получены production ключи PayPal  
- [ ] Созданы реальные Products/Prices
- [ ] Настроены Webhooks
- [ ] Протестировано в sandbox режиме
- [ ] Убран demo mode из PaymentModal.tsx
- [ ] HTTPS настроен на сервере

---

## 🚀 Переключение на Production

1. В Stripe Dashboard отключи Test Mode
2. Получи новые production ключи
3. Создай заново Products с теми же ценами
4. Обнови все .env файлы с production ключами
5. В PayPal измени `PAYPAL_MODE=live`

---

## ❓ Проблемы?

### "Stripe not configured"
→ Установи stripe: `cd backend && npm install stripe`

### "Failed to create checkout session"  
→ Проверь что STRIPE_SECRET_KEY правильный и Price IDs существуют

### PayPal не работает
→ Убедись что PAYPAL_CLIENT_ID и PAYPAL_CLIENT_SECRET заполнены
