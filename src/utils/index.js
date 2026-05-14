export const formatResponse = (status, message, data = null) => {
    return {
        status,
        message,
        data,
    };
};

export const handleError = (error) => {
    console.error(error);
    return formatResponse('error', error.message);
};