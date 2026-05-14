import expense from "../../models/expense.js";

class ExpenseService {
    async createExpense(expenseData) {
        const expense = await expense.create(expenseData);
        return expense;
    }

    async getExpenseById(expenseId) {
        const expense = await expense.findByPk(expenseId);
        return expense;
    }

    async getExpensesByUserId(userId) {
        const expenses = await expense.findAll({ where: { userId } });
        return expenses;
    }

    async updateExpense(expenseId, expenseData) {
        const expense = await expense.findByPk(expenseId);
        if (!expense) return null;
        expense.set(expenseData);
        await expense.save();
        return expense;
    }

    async deleteExpense(expenseId) {
        const expense = await expense.findByPk(expenseId);
        if (!expense) return null;
        await expense.destroy();
        return true;
    }
}

export default new ExpenseService();