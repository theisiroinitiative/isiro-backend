import virtualAccount from "../../models/virtual-accounts.js";

class AccountService {
    async createAccount(info) {
        try {
            const account = await virtualAccount.create(info);
            return account;
        } catch (error) {
            throw new Error(`Error creating virtual account: ${error.message}`);
        }
    }

    async updateBalance(accountId, newBalance) {
        try {
            const account = await virtualAccount.findByPk(accountId);
            if (!account) {
                throw new Error('Virtual account not found');
            }
            account.balance = newBalance;
            await account.save();
            return account;
        } catch (error) {
            throw new Error(`Error updating account balance: ${error.message}`);
        }
    }

    async creditAccountByAccountNumber(accountNumber, amount) {
        try {
            const account = await virtualAccount.findOne({ where: { accountNumber } });
            if (!account) {
                throw new Error('Virtual account not found');
            }
            await account.increment('balance', { by: parseFloat(amount) });
            await account.reload();
            return account;
        } catch (error) {
            throw new Error(`Error crediting account: ${error.message}`);
        }
    }

    async creditAccount(accountId, amount) {
        try {
            const account = await virtualAccount.findByPk(accountId);
            if (!account) {
                throw new Error('Virtual account not found');
            }
            await account.increment('balance', { by: parseFloat(amount) });
            await account.reload();
            return account;
        } catch (error) {
            throw new Error(`Error crediting account by ID: ${error.message}`);
        }
    }

    async updateAccountInfo(accountId, info) {
        try {
            const account = await virtualAccount.findByPk(accountId);
            if (!account) {
                throw new Error('Virtual account not found');
            }

            const updatableFields = ['account_description', 'accountName', 'bankName'];
            for (const field of updatableFields) {
                if (info[field] !== undefined) {
                    account[field] = info[field];
                }
            }

            await account.save();
            return account;
        } catch (error) {
            throw new Error(`Error updating account info: ${error.message}`);
        }
    }

    async deleteAccount(accountId) {
        try {
            const account = await virtualAccount.findByPk(accountId);
            if (!account) {
                throw new Error('Virtual account not found');
            }
            await account.destroy();
            return true;
        } catch (error) {
            throw new Error(`Error deleting virtual account: ${error.message}`);
        }
    }

    async getAccountByUserId(userId) {
        try {
            return await virtualAccount.findOne({ where: { userId } });
        } catch (error) {
            throw new Error(`Error fetching virtual account: ${error.message}`);
        }
    }

    async debitAccount(accountId, amount) {
        try {
            const account = await virtualAccount.findByPk(accountId);
            if (!account) {
                throw new Error('Virtual account not found');
            }
            const currentBalance = parseFloat(account.balance);
            const debitAmount = parseFloat(amount);
            if (currentBalance < debitAmount) {
                throw new Error('Insufficient balance');
            }
            
            // Atomic decrement
            await account.decrement('balance', { by: debitAmount });
            await account.reload();
            return account;
        } catch (error) {
            throw new Error(`Error debiting account: ${error.message}`);
        }
    }
}

export default new AccountService();