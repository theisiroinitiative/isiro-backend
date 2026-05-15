/**
 * Squad API Integration
 * 
 * Environment variables required:
 *   SQUAD_SECRET_KEY   - Your Squad secret key (sandbox or production)
 *   SQUAD_BASE_URL     - https://sandbox-api-d.squadco.com (test) or https://api-d.squadco.com (production)
 *   SQUAD_MERCHANT_ID  - Your Squad merchant ID (required for transfer references)
 */

const getBaseUrl = () => process.env.SQUAD_BASE_URL || 'https://sandbox-api-d.squadco.com';
const getHeaders = () => ({
    'Authorization': `Bearer ${process.env.SQUAD_SECRET_KEY}`,
    'Content-Type': 'application/json'
});

// ─── Virtual Account Creation ────────────────────────────────────────────────

export const createSquadVirtualAccount = async (accountData) => {
    const url = `${getBaseUrl()}/virtual-account`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(accountData)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create virtual account with Squad API');
    }

    return data.data;
};

// ─── Account Lookup (Verify Recipient Before Transfer) ───────────────────────

export const lookupAccount = async (bank_code, account_number) => {
    const url = `${getBaseUrl()}/payout/account/lookup`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bank_code, account_number })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Account lookup failed');
    }

    return data.data; // { account_name: "JOHN DOE" }
};

// ─── Fund Transfer (Withdraw from Squad Ledger to Bank Account) ──────────────

export const fundTransfer = async ({ transaction_reference, amount, bank_code, account_number, account_name, remark }) => {
    const url = `${getBaseUrl()}/payout/transfer`;

    // Amount must be in kobo (1 Naira = 100 kobo)
    const amountInKobo = Math.round(amount * 100).toString();

    // Transaction reference must include Merchant ID prefix
    const merchantId = process.env.SQUAD_MERCHANT_ID || '';
    const fullRef = merchantId ? `${merchantId}_${transaction_reference}` : transaction_reference;

    const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            transaction_reference: fullRef,
            amount: amountInKobo,
            bank_code,
            account_number,
            account_name,
            currency_id: 'NGN',
            remark: remark || 'Isiro Withdrawal'
        })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Fund transfer failed');
    }

    return data.data;
};