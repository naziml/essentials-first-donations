const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS settings for Azure Container Apps
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, replace with your specific domain
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Enable compression
app.use(compression());

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for donation data (in production, use a database)
let donationData = {
  goal: 50000,
  current: 0,
  title: 'Essentials First Youth Fundraising Campaign',
  slogan: 'Help us reach our goal!',
  image: 'https://www.filepicker.io/api/file/jHiKQ5SZQxWKWNZAR9Ud'
};

// Donorbox configuration
const DONORBOX_URL = 'https://donorbox.org/essentials-first-august-2nd-fundraiser';

// Function to fetch data from Donorbox
async function fetchDonorboxData() {
    try {
        console.log('Fetching data from Donorbox...');
        const response = await axios.get(DONORBOX_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        // Try multiple selectors to find the raised amount
        let raisedAmount = 0;
        let goalAmount = 50000;
        
        // Method 1: Look for specific patterns in the text
        const pageText = $.text();
        console.log(`Full page text length: ${pageText.length}`);
        
        // Enhanced regex patterns for finding amounts (including decimals)
        const raisedPatterns = [
            /\$([0-9,]+(?:\.[0-9]{2})?)\s*raised/i,
            /\$([0-9,]+(?:\.[0-9]{2})?)\s*Raised/,
            /raised[\s:]*\$([0-9,]+(?:\.[0-9]{2})?)/i,
            /([0-9,]+(?:\.[0-9]{2})?)\s*raised/i,
            /total[\s:]*\$([0-9,]+(?:\.[0-9]{2})?)/i
        ];
        
        const goalPatterns = [
            /\$([0-9,]+(?:\.[0-9]{2})?)\s*goal/i,
            /\$([0-9,]+(?:\.[0-9]{2})?)\s*Goal/,
            /goal[\s:]*\$([0-9,]+(?:\.[0-9]{2})?)/i,
            /target[\s:]*\$([0-9,]+(?:\.[0-9]{2})?)/i
        ];
        
        // Try each pattern for raised amount
        for (const pattern of raisedPatterns) {
            const match = pageText.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(amount) && amount > 0) {
                    raisedAmount = amount;
                    console.log(`Found raised amount with pattern ${pattern}: $${raisedAmount}`);
                    break;
                }
            }
        }
        
        // Try each pattern for goal amount
        for (const pattern of goalPatterns) {
            const match = pageText.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(amount) && amount > 0) {
                    goalAmount = amount;
                    console.log(`Found goal amount with pattern ${pattern}: $${goalAmount}`);
                    break;
                }
            }
        }
        
        // Method 2: Look for common Donorbox CSS selectors
        if (raisedAmount === 0) {
            const possibleSelectors = [
                '.campaign-progress-amount',
                '.amount-raised',
                '.raised-amount',
                '.campaign-amount',
                '[data-testid="raised-amount"]',
                '.progress-amount',
                '.total-raised'
            ];
            
            for (const selector of possibleSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    const text = element.text().trim();
                    const match = text.match(/\$?([0-9,]+(?:\.[0-9]{2})?)/);
                    if (match) {
                        const amount = parseFloat(match[1].replace(/,/g, ''));
                        if (!isNaN(amount) && amount > 0) {
                            raisedAmount = amount;
                            console.log(`Found raised amount with selector ${selector}: $${raisedAmount}`);
                            break;
                        }
                    }
                }
            }
        }
        
        // Method 3: Look for script tags with data
        if (raisedAmount === 0) {
            $('script').each((i, elem) => {
                const scriptContent = $(elem).html();
                if (scriptContent) {
                    // Look for JSON data in scripts
                    const raisedMatch = scriptContent.match(/"raised_amount["\s:]*([0-9,]+(?:\.[0-9]{2})?)/i);
                    const goalMatch = scriptContent.match(/"goal_amount["\s:]*([0-9,]+(?:\.[0-9]{2})?)/i);
                    
                    if (raisedMatch) {
                        const amount = parseFloat(raisedMatch[1].replace(/,/g, ''));
                        if (!isNaN(amount) && amount > 0) {
                            raisedAmount = amount;
                            console.log(`Found raised amount in script: $${raisedAmount}`);
                        }
                    }
                    
                    if (goalMatch) {
                        const amount = parseFloat(goalMatch[1].replace(/,/g, ''));
                        if (!isNaN(amount) && amount > 0) {
                            goalAmount = amount;
                            console.log(`Found goal amount in script: $${goalAmount}`);
                        }
                    }
                }
            });
        }
        
        // Method 4: Generic dollar amount search (fallback)
        if (raisedAmount === 0) {
            const dollarAmounts = [];
            $('*').each((i, elem) => {
                const text = $(elem).text().trim();
                const match = text.match(/^\$([0-9,]+(?:\.[0-9]{2})?)$/);
                if (match) {
                    const amount = parseFloat(match[1].replace(/,/g, ''));
                    if (!isNaN(amount) && amount > 0 && amount < 100000) {
                        dollarAmounts.push(amount);
                    }
                }
            });
            
            // Sort amounts and pick a reasonable one
            dollarAmounts.sort((a, b) => b - a);
            if (dollarAmounts.length > 0) {
                // Usually the raised amount is smaller than the goal
                for (const amount of dollarAmounts) {
                    if (amount < goalAmount) {
                        raisedAmount = amount;
                        console.log(`Found raised amount via generic search: $${raisedAmount}`);
                        break;
                    }
                }
            }
        }
        
        console.log(`Donorbox parsing results: Raised=$${raisedAmount}, Goal=$${goalAmount}`);
        console.log(`Page text snippet: ${pageText.substring(0, 200)}...`);
        
        // Update donation data only if we found valid amounts
        if (raisedAmount > 0) {
            donationData.current = raisedAmount;
        }
        if (goalAmount > 0 && goalAmount !== 50000) { // Only update if different from default
            donationData.goal = goalAmount;
        }
        
        return {
            current: raisedAmount,
            goal: goalAmount,
            success: raisedAmount > 0
        };
    } catch (error) {
        console.error('Error fetching Donorbox data:', error.message);
        return {
            current: donationData.current,
            goal: donationData.goal,
            success: false,
            error: error.message
        };
    }
}

// Sync with Donorbox on startup
fetchDonorboxData();

// Set up periodic sync every 5 minutes
setInterval(async () => {
    const result = await fetchDonorboxData();
    if (result.success) {
        // Broadcast updated data to all connected clients
        io.emit('donationUpdate', donationData);
    }
}, 5 * 60 * 1000); // 5 minutes

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current data to newly connected client
  socket.emit('donationUpdate', donationData);

  // Handle donation data updates
  socket.on('updateDonation', (data) => {
    try {
      // Validate and sanitize input data
      if (data.goal !== undefined && !isNaN(data.goal) && data.goal >= 0) {
        donationData.goal = parseFloat(data.goal);
      }
      if (data.current !== undefined && !isNaN(data.current) && data.current >= 0) {
        donationData.current = parseFloat(data.current);
      }
      if (data.title && typeof data.title === 'string' && data.title.trim().length > 0) {
        donationData.title = data.title.trim().substring(0, 200); // Limit length
      }
      if (data.slogan && typeof data.slogan === 'string') {
        donationData.slogan = data.slogan.trim().substring(0, 200); // Limit length
      }
      if (data.image && typeof data.image === 'string') {
        donationData.image = data.image.trim().substring(0, 500); // Limit length
      }

      console.log('Donation data updated:', donationData);

      // Broadcast updated data to all connected clients
      io.emit('donationUpdate', donationData);
    } catch (error) {
      console.error('Error updating donation data:', error);
      socket.emit('error', { message: 'Invalid data provided' });
    }
  });

  // Handle quick add donations
  socket.on('quickAdd', (amount) => {
    try {
      const addAmount = parseFloat(amount);
      if (!isNaN(addAmount) && addAmount > 0 && addAmount <= 10000) { // Reasonable limit
        donationData.current += addAmount;
        console.log(`Quick add: $${addAmount}, new total: $${donationData.current}`);
        
        // Broadcast updated data to all connected clients
        io.emit('donationUpdate', donationData);
      } else {
        socket.emit('error', { message: 'Invalid amount for quick add' });
      }
    } catch (error) {
      console.error('Error in quick add:', error);
      socket.emit('error', { message: 'Error processing quick add' });
    }
  });

  // Handle manual Donorbox sync
  socket.on('syncDonorbox', async () => {
    try {
      console.log('Manual Donorbox sync requested by client:', socket.id);
      const result = await fetchDonorboxData();
      
      if (result.success) {
        console.log(`Manual sync successful - Raised: $${result.current}, Goal: $${result.goal}`);
        // Broadcast updated data to all connected clients
        io.emit('donationUpdate', donationData);
        
        // Send success feedback to the requesting client
        socket.emit('syncResult', { 
          success: true, 
          message: `Successfully synced! Raised: $${result.current}`,
          data: donationData 
        });
      } else {
        console.log('Manual sync failed:', result.error);
        socket.emit('syncResult', { 
          success: false, 
          message: 'Failed to sync with Donorbox: ' + (result.error || 'Unknown error')
        });
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
      socket.emit('syncResult', { 
        success: false, 
        message: 'Error syncing with Donorbox: ' + error.message 
      });
    }
  });

  // Handle reset
  socket.on('reset', () => {
    try {
      donationData = {
        goal: 50000,
        current: 0,
        title: 'Essentials First Youth Fundraising Campaign',
        slogan: 'Help us reach our goal!',
        image: 'https://www.filepicker.io/api/file/jHiKQ5SZQxWKWNZAR9Ud'
      };
      
      console.log('Donation data reset to defaults');
      
      // Broadcast reset data to all connected clients
      io.emit('donationUpdate', donationData);
    } catch (error) {
      console.error('Error resetting data:', error);
      socket.emit('error', { message: 'Error resetting data' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API endpoints for health checks and data retrieval
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/donation', (req, res) => {
  res.json(donationData);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Get port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
