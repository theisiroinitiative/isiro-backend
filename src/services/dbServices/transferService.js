import TransferHistory from "../../models/transferHistory.js";

class TransferService {
    async createTransfer(data) {
        return await TransferHistory.create(data);
    }

    async updateTransferStatus(id, status, squadResponse = null) {
        const transfer = await TransferHistory.findByPk(id);
        if (!transfer) throw new Error('Transfer not found');
        transfer.status = status;
        if (squadResponse) transfer.squad_response = squadResponse;
        await transfer.save();
        return transfer;
    }

    async getTransfersByUserId(userId) {
        return await TransferHistory.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
    }

    async getTransferByReference(transaction_reference) {
        return await TransferHistory.findOne({ where: { transaction_reference } });
    }
}

export default new TransferService();
