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
            account.balance = parseFloat(account.balance) + parseFloat(amount);
            await account.save();
            return account;
        } catch (error) {
            throw new Error(`Error crediting account: ${error.message}`);
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
}

export default new AccountService();