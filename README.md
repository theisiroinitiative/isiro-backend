# WhatsApp Trading Backend

This project is a backend application built with Express.js that connects to a WhatsApp bot, allowing traders to record sales and update inventory directly from their WhatsApp chat.

## Features

- Record sales through WhatsApp messages.
- Update inventory directly from WhatsApp.
- Retrieve sales and inventory data via API.

## Project Structure

```
whatsapp-trading-backend
├── src
│   ├── app.js                  # Entry point of the application
│   ├── config
│   │   └── index.js            # Configuration settings
│   ├── controllers
│   │   ├── salesController.js   # Handles sales-related operations
│   │   └── inventoryController.js # Handles inventory-related operations
│   ├── routes
│   │   ├── salesRoutes.js       # Defines sales-related routes
│   │   └── inventoryRoutes.js    # Defines inventory-related routes
│   ├── services
│   │   ├── whatsappBotService.js # Manages WhatsApp bot communication
│   │   └── inventoryService.js   # Manages inventory operations
│   ├── models
│   │   ├── sale.js              # Defines the Sale model
│   │   └── inventory.js         # Defines the Inventory model
│   └── utils
│       └── index.js             # Utility functions
├── package.json                 # NPM configuration file
├── .env                         # Environment variables
└── README.md                    # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd whatsapp-trading-backend
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root directory and add your environment variables.

## Usage

To start the application, run:
```
npm start
```

## API Endpoints

- **Sales**
  - `POST /sales` - Record a new sale
  - `GET /sales` - Retrieve all sales

- **Inventory**
  - `PUT /inventory` - Update inventory
  - `GET /inventory` - Retrieve inventory data

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes. 

## License

This project is licensed under the MIT License.# isiro-backend
