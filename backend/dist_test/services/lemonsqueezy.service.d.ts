/**
 * 🍋 LEMONSQUEEZY SERVICE
 * Единственный платёжный провайдер для Science AI
 *
 * Документация: https://docs.lemonsqueezy.com/api
 */
declare const LEMONSQUEEZY_API_KEY: string;
declare const LEMONSQUEEZY_STORE_ID: string;
declare const LEMONSQUEEZY_WEBHOOK_SECRET: string;
export declare const LS_VARIANT_IDS: {
    starter_monthly: string;
    starter_annual: string;
    pro_monthly: string;
    pro_annual: string;
    premium_monthly: string;
    premium_annual: string;
};
declare const VARIANT_TO_PLAN: Record<string, {
    planId: string;
    period: string;
}>;
declare function initLemonSqueezy(): void;
export interface CreateCheckoutParams {
    planId: string;
    billingPeriod: 'monthly' | 'annual';
    userEmail: string;
    userId: string;
    userName?: string;
    successUrl?: string;
    cancelUrl?: string;
}
/**
 * Создание Checkout Session через LemonSqueezy API
 * Возвращает URL для перенаправления клиента
 */
export declare function createLSCheckout(params: CreateCheckoutParams): Promise<{
    url: string;
    checkoutId: string;
}>;
/**
 * Получить данные подписки по ID
 */
export declare function getLSSubscription(subscriptionId: string): Promise<{
    type: string;
    id: string;
    attributes: {
        store_id: number;
        customer_id: number;
        order_id: number;
        order_item_id: number;
        product_id: number;
        variant_id: number;
        product_name: string;
        variant_name: string;
        user_name: string;
        user_email: string;
        status: "pause" | "expired" | "cancelled" | "active" | "on_trial" | "paused" | "past_due" | "unpaid";
        status_formatted: string;
        card_brand: ("visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay") | null;
        card_last_four: string | null;
        pause: {
            mode: "void" | "free";
            resumes_at?: string | null;
        } | null;
        cancelled: boolean;
        trial_ends_at: string | null;
        billing_anchor: number;
        first_subscription_item: {
            id: number;
            subscription_id: number;
            price_id: number;
            quantity: number;
            is_usage_based: boolean;
            created_at: string;
            updated_at: string;
        } | null;
        urls: {
            update_payment_method: string;
            customer_portal: string;
            customer_portal_update_subscription: string;
        };
        renews_at: string;
        ends_at: string | null;
        created_at: string;
        updated_at: string;
        test_mode: boolean;
    };
    relationships: Pick<{
        store: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        product: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variant: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customer: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        order: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscription: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        price: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "price-model": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discount: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        stores: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customers: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        products: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variants: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        prices: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        files: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        orders: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscriptions: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-invoices": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "usage-records": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discounts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "discount-redemptions": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-keys": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key-instances": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        checkouts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        webhooks: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
    }, "store" | "product" | "variant" | "customer" | "order" | "order-item" | "subscription-invoices" | "subscription-items">;
    links: {
        self: string;
    };
}>;
/**
 * Отменить подписку (в конце периода)
 */
export declare function cancelLSSubscription(subscriptionId: string): Promise<{
    type: string;
    id: string;
    attributes: {
        store_id: number;
        customer_id: number;
        order_id: number;
        order_item_id: number;
        product_id: number;
        variant_id: number;
        product_name: string;
        variant_name: string;
        user_name: string;
        user_email: string;
        status: "pause" | "expired" | "cancelled" | "active" | "on_trial" | "paused" | "past_due" | "unpaid";
        status_formatted: string;
        card_brand: ("visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay") | null;
        card_last_four: string | null;
        pause: {
            mode: "void" | "free";
            resumes_at?: string | null;
        } | null;
        cancelled: boolean;
        trial_ends_at: string | null;
        billing_anchor: number;
        first_subscription_item: {
            id: number;
            subscription_id: number;
            price_id: number;
            quantity: number;
            is_usage_based: boolean;
            created_at: string;
            updated_at: string;
        } | null;
        urls: {
            update_payment_method: string;
            customer_portal: string;
            customer_portal_update_subscription: string;
        };
        renews_at: string;
        ends_at: string | null;
        created_at: string;
        updated_at: string;
        test_mode: boolean;
    };
    relationships: Pick<{
        store: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        product: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variant: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customer: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        order: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscription: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        price: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "price-model": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discount: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        stores: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customers: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        products: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variants: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        prices: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        files: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        orders: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscriptions: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-invoices": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "usage-records": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discounts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "discount-redemptions": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-keys": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key-instances": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        checkouts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        webhooks: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
    }, "store" | "product" | "variant" | "customer" | "order" | "order-item" | "subscription-invoices" | "subscription-items">;
    links: {
        self: string;
    };
}>;
/**
 * Возобновить подписку (если отменена, но ещё не истекла)
 */
export declare function resumeLSSubscription(subscriptionId: string): Promise<{
    type: string;
    id: string;
    attributes: {
        store_id: number;
        customer_id: number;
        order_id: number;
        order_item_id: number;
        product_id: number;
        variant_id: number;
        product_name: string;
        variant_name: string;
        user_name: string;
        user_email: string;
        status: "pause" | "expired" | "cancelled" | "active" | "on_trial" | "paused" | "past_due" | "unpaid";
        status_formatted: string;
        card_brand: ("visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay") | null;
        card_last_four: string | null;
        pause: {
            mode: "void" | "free";
            resumes_at?: string | null;
        } | null;
        cancelled: boolean;
        trial_ends_at: string | null;
        billing_anchor: number;
        first_subscription_item: {
            id: number;
            subscription_id: number;
            price_id: number;
            quantity: number;
            is_usage_based: boolean;
            created_at: string;
            updated_at: string;
        } | null;
        urls: {
            update_payment_method: string;
            customer_portal: string;
            customer_portal_update_subscription: string;
        };
        renews_at: string;
        ends_at: string | null;
        created_at: string;
        updated_at: string;
        test_mode: boolean;
    };
    relationships: Pick<{
        store: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        product: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variant: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customer: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        order: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscription: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        price: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "price-model": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discount: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        stores: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customers: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        products: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variants: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        prices: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        files: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        orders: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscriptions: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-invoices": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "usage-records": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discounts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "discount-redemptions": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-keys": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key-instances": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        checkouts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        webhooks: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
    }, "store" | "product" | "variant" | "customer" | "order" | "order-item" | "subscription-invoices" | "subscription-items">;
    links: {
        self: string;
    };
}>;
/**
 * Сменить план (upgrade/downgrade)
 */
export declare function changeLSPlan(subscriptionId: string, newPlanId: string, newPeriod: string): Promise<{
    type: string;
    id: string;
    attributes: {
        store_id: number;
        customer_id: number;
        order_id: number;
        order_item_id: number;
        product_id: number;
        variant_id: number;
        product_name: string;
        variant_name: string;
        user_name: string;
        user_email: string;
        status: "pause" | "expired" | "cancelled" | "active" | "on_trial" | "paused" | "past_due" | "unpaid";
        status_formatted: string;
        card_brand: ("visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay") | null;
        card_last_four: string | null;
        pause: {
            mode: "void" | "free";
            resumes_at?: string | null;
        } | null;
        cancelled: boolean;
        trial_ends_at: string | null;
        billing_anchor: number;
        first_subscription_item: {
            id: number;
            subscription_id: number;
            price_id: number;
            quantity: number;
            is_usage_based: boolean;
            created_at: string;
            updated_at: string;
        } | null;
        urls: {
            update_payment_method: string;
            customer_portal: string;
            customer_portal_update_subscription: string;
        };
        renews_at: string;
        ends_at: string | null;
        created_at: string;
        updated_at: string;
        test_mode: boolean;
    };
    relationships: Pick<{
        store: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        product: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variant: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customer: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        order: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscription: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        price: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "price-model": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-item": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discount: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        stores: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        customers: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        products: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        variants: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        prices: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        files: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        orders: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "order-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        subscriptions: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-invoices": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "subscription-items": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "usage-records": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        discounts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "discount-redemptions": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-keys": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        "license-key-instances": {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        checkouts: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
        webhooks: {
            links: {
                related: string;
                self: string;
            };
            data?: {
                id: string;
                type: "stores" | "customers" | "products" | "variants" | "prices" | "files" | "orders" | "order-items" | "subscriptions" | "subscription-invoices" | "subscription-items" | "usage-records" | "discounts" | "discount-redemptions" | "license-keys" | "license-key-instances" | "checkouts" | "webhooks";
            }[];
        };
    }, "store" | "product" | "variant" | "customer" | "order" | "order-item" | "subscription-invoices" | "subscription-items">;
    links: {
        self: string;
    };
}>;
/**
 * Проверка подписи вебхука LemonSqueezy
 */
export declare function verifyWebhookSignature(rawBody: string, signature: string): boolean;
/**
 * Получить planId из webhook event (через variant_id или custom data)
 */
export declare function getPlanFromWebhook(eventData: {
    meta?: {
        custom_data?: Record<string, string>;
    };
    data?: {
        attributes?: Record<string, unknown> & {
            variant_id?: string;
            first_subscription_item?: {
                variant_id?: string;
            };
        };
    };
    [key: string]: unknown;
}): {
    planId: string;
    period: string;
} | null;
export { LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET, VARIANT_TO_PLAN, initLemonSqueezy, };
//# sourceMappingURL=lemonsqueezy.service.d.ts.map