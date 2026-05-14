import pkg, { DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import userServices from '../services/dbServices/userServices.js';
import { messageProcessor } from '../services/ai/ai-to-system-intepreter.js';
import { usePostgresAuthState } from '../models/whatsappSession.js';

const makeWASocket = pkg.default || pkg;

class WhatsAppBotService {
    constructor() {
        this.sock = null;
        this.authState = null; // Store state here once loaded
        this.saveCreds = null;
    }

    async init() {
        try {
            // Load Auth once
            const { state, saveCreds } = await usePostgresAuthState();
            this.authState = state;
            this.saveCreds = saveCreds;
            await this.connect();
        } catch (error) {
            console.error("Failed to initialize Auth State:", error);
        }
    }

    async connect() {
        console.log("Connecting to WhatsApp...");
        this.sock = makeWASocket({
            auth: this.authState,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '20.0.04']
        });

        this.sock.ev.on('creds.update', this.saveCreds);

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`Connection closed. Reason: ${statusCode}. Reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    // Timeout prevents the "freeze" loop
                    setTimeout(() => this.connect(), 5000);
                }
            } else if (connection === 'open') {
                console.log('WhatsApp bot is ready!');
            }
        });

        // Pairing Code Logic
        if (!this.sock.authState.creds.registered) {
            const phoneNumber = process.env.BOT_PHONE_NUMBER;
            if (phoneNumber) {
                setTimeout(async () => {
                    try {
                        const code = await this.sock.requestPairingCode(phoneNumber);
                        console.log(`\n=================================\nPAIRING CODE: ${code}\n=================================\n`);
                    } catch (err) {
                        console.error("Pairing code error:", err.message);
                    }
                }, 5000);
            }
        }

        // Message Listener
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            await this.receiveMessage(m);
        });
    }

    async sendMessage(to, text) {
        try {
            await this.sock.sendMessage(to, { text });
            console.log(`Message sent to ${to}: ${text}`);
        } catch (error) {
            console.error(`Failed to send message to ${to}:`, error.message);
        }
    }

    async receiveMessage(message) {
        const from = message.key.remoteJid;
        // Extract text depending on message type
        const body = message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            message.message.imageMessage?.caption ||
            message.message.videoMessage?.caption ||
            "";

        const hasMedia = !!(message.message.imageMessage || message.message.audioMessage || message.message.videoMessage || message.message.documentMessage);

        // Extract phone number from WhatsApp JID (e.g., '2348012345678@s.whatsapp.net' -> '2348012345678')
        const phoneNumber = from.split('@')[0];
        let bypass = true;

        // Check for WhatsApp Verification Code
        const user = await userServices.fetchUserDataByPhone(phoneNumber); // Need to implement this
        if (user && user.whatsappVerificationCode && body.trim().toUpperCase() === user.whatsappVerificationCode) {
            const verified = await userServices.verifyWhatsappCode(phoneNumber, body.trim().toUpperCase());
            if (verified) {
                await this.sendMessage(from, `Welcome to Haggle Proof Ledger, ${user.name}! 🎊\n\nI be your intelligent business assistant. I fit help you record sales, track inventory, and even help you get loans based on your business data.\n\nJust send me a message like "I sell 2 bread for 500" or "How much I get for my account?" and I go help you out!`);
                return;
            }
        }

        const userExists = await userServices.userExistsByPhone(phoneNumber);

        if (!userExists && !bypass) {
            await this.sendMessage(from, 'Your phone number is not registered. Please sign up first.');
            return;
        }

        if (body.toLowerCase() === 'ping') {
            await this.sendMessage(from, 'pong');
            return;
        }

        let aiInput = { text: body };

        // Process media using Baileys downloadMediaMessage
        if (hasMedia) {
            try {
                const buffer = await downloadMediaMessage(
                    message,
                    'buffer',
                    {},
                    {
                        logger: pino({ level: 'silent' }),
                        reuploadRequest: this.sock.updateMediaMessage
                    }
                );

                if (buffer) {
                    let mimeType = 'application/octet-stream';
                    if (message.message.imageMessage) mimeType = message.message.imageMessage.mimetype || 'image/jpeg';
                    if (message.message.audioMessage) mimeType = message.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';

                    if (mimeType.startsWith('image/')) {
                        aiInput.image = {
                            mimeType,
                            base64: buffer.toString('base64')
                        };
                    } else if (mimeType.startsWith('audio/')) {
                        aiInput.audio = {
                            mimeType,
                            base64: buffer.toString('base64')
                        };
                    }
                }
            } catch (err) {
                await this.sendMessage(from, 'Failed to process media. Please try again.');
                console.error('Media processing error:', err.message);
                return;
            }
        }

        // Send message to Gemini AI for processing
        try {
            const aiResult = await messageProcessor(aiInput, phoneNumber);
            console.log('AI Result:', aiResult);

            // Extract the natural language text
            const replyText = aiResult.raw ? aiResult.raw : JSON.stringify(aiResult, null, 2);

            await this.sendMessage(from, replyText);
        } catch (err) {
            await this.sendMessage(from, 'Sorry, there was an error processing your message.');
            console.error('AI processing error:', err.message);
        }
    }
}

const whatsappBotService = new WhatsAppBotService();


export default whatsappBotService;