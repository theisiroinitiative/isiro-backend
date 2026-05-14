import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import basicAuth from 'express-basic-auth';
import path from 'path';
import { fileURLToPath } from 'url';
import whatsappBotService from './whatsapp-agent/whatsappBotService.js';
import salesRoutes from './api/routes/salesRoutes.js';
import inventoryRoutes from './api/routes/inventoryRoutes.js';
import userRoutes from './api/routes/userRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// CORS configuration
const whitelist = [process.env.FRONTEND_URL_TEST, process.env.FRONTEND_URL_PROD];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Rate limiting middleware (e.g. 100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());

// Load Swagger YAML
const swaggerDocument = YAML.load(path.join(__dirname, '../api-docs/api-docs.yaml'));

// Basic Auth for Swagger
const swaggerAuth = basicAuth({
  users: { [process.env.SWAGGER_USER || 'admin']: process.env.SWAGGER_PASSWORD || 'password' },
  challenge: true,
});

app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
whatsappBotService.init();
const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});