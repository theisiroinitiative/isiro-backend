import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import { initAuthCreds, BufferJSON, proto } from "@whiskeysockets/baileys"

const WhatsAppSession = sequelize.define('wpsession', {
    sessionId: { type: DataTypes.STRING, primaryKey: true },
    sessionData: DataTypes.BLOB('long')
});

await WhatsAppSession.sync();

export const usePostgresAuthState = async () => {
    const writeData = async (data, key) => {
        const jsonStr = JSON.stringify(data, BufferJSON.replacer);
        await WhatsAppSession.upsert({ sessionId: key, sessionData: Buffer.from(jsonStr) });
    };

    const readData = async (key) => {
        const row = await WhatsAppSession.findByPk(key);
        if (row && row.sessionData) {
            return JSON.parse(row.sessionData.toString('utf-8'), BufferJSON.reviver);
        }
        return null;
    };

    const removeData = async (key) => {
        await WhatsAppSession.destroy({ where: { sessionId: key } });
    };

    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async id => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
};