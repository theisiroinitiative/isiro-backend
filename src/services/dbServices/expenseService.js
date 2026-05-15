import expense from "../../models/expense.js";

class ExpenseService {
    async createExpense(expenseData) {
        const newExpense = await expense.create(expenseData);
        return newExpense;
    }

    async getExpenseById(expenseId) {
        const found = await expense.findByPk(expenseId);
        return found;
    }

    async getExpensesByUserId(userId) {
        const expenses = await expense.findAll({ where: { userId } });
        return expenses;
    }

    async updateExpense(expenseId, expenseData) {
        const existing = await expense.findByPk(expenseId);
        if (!existing) return null;
        existing.set(expenseData);
        await existing.save();
        return existing;
    }

    async deleteExpense(expenseId) {
        const existing = await expense.findByPk(expenseId);
        if (!existing) return null;
        await existing.destroy();
        return true;
    }
}

export default new ExpenseService();