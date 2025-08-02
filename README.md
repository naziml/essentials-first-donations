# Donation Meter Web App

A real-time donation meter web application built with Node.js, Express, and Socket.IO. This application displays a live donation thermometer that updates in real-time across all connected clients without requiring page refreshes.

## Features

- **Real-time Updates**: WebSocket-based communication ensures all clients see updates instantly
- **Responsive Design**: Mobile-friendly Bootstrap 5 interface
- **Admin Controls**: Easy-to-use form controls for updating donation data
- **Celebration Effects**: Confetti animation when donation goal is reached
- **Connection Status**: Visual indicator showing real-time connection status
- **Containerized**: Docker-ready for easy deployment
- **Azure Container Apps Ready**: Configured for deployment to Azure Container Apps

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Real-time Communication**: WebSockets via Socket.IO
- **Containerization**: Docker
- **Cloud Platform**: Azure Container Apps
- **Infrastructure**: Bicep (Infrastructure as Code)

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd essentials-first-donations
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Production Build

To run in production mode:
```bash
npm start
```

## Docker Deployment

### Build and Run Locally

1. Build the Docker image:
   ```bash
   docker build -t donation-meter .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 donation-meter
   ```

3. Access the application at `http://localhost:3000`

## Azure Container Apps Deployment

This application is configured for deployment to Azure Container Apps using Azure Developer CLI (azd).

### Prerequisites

- Azure CLI
- Azure Developer CLI (azd)
- Docker (for building container images)

### Deployment Steps

1. Initialize the Azure Developer environment:
   ```bash
   azd auth login
   azd init
   ```

2. Deploy to Azure:
   ```bash
   azd up
   ```

This will:
- Create all necessary Azure resources (Container Registry, Container Apps Environment, etc.)
- Build and push the Docker image to Azure Container Registry
- Deploy the container app to Azure Container Apps
- Configure networking, security, and monitoring

### Infrastructure

The application uses the following Azure resources:

- **Azure Container Registry**: For storing container images
- **Azure Container Apps Environment**: Runtime environment for containers
- **Azure Container App**: The main application service
- **Log Analytics Workspace**: For monitoring and logging
- **Application Insights**: For application performance monitoring
- **Managed Identity**: For secure access between Azure services

## Application Architecture

### Real-time Communication

The application uses WebSockets (Socket.IO) for real-time communication between clients and server:

- **Connection Management**: Automatic reconnection and connection status indicators
- **Data Synchronization**: All donation updates are broadcast to all connected clients
- **Event Handling**: Separate events for different types of updates (donations, quick adds, resets)

### Security Features

- **Helmet.js**: Security headers and CORS protection
- **Input Validation**: Server-side validation of all incoming data
- **Rate Limiting**: Built-in protection against excessive requests
- **Managed Identity**: Secure authentication for Azure services

### Scalability

- **Horizontal Scaling**: Azure Container Apps can automatically scale based on demand
- **Connection Pooling**: Efficient WebSocket connection management
- **Stateless Design**: Application state is managed in-memory (can be extended to use external storage)

## Environment Variables

- `PORT`: Application port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## API Endpoints

- `GET /`: Main application page
- `GET /health`: Health check endpoint
- `GET /api/donation`: Get current donation data
- `WebSocket /`: Real-time communication endpoint

## WebSocket Events

### Client to Server

- `updateDonation`: Update donation data
- `quickAdd`: Add a quick donation amount
- `reset`: Reset all data to defaults

### Server to Client

- `donationUpdate`: Broadcast updated donation data
- `error`: Error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.
