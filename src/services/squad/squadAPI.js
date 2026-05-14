export const createSquadVirtualAccount = async (accountData) => {
    const url = `${process.env.SQUAD_BASE_URL || 'https://sandbox-api-d.squadco.com'}/virtual-account`;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.SQUAD_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create virtual account with Squad API');
    }

    return data.data;
};