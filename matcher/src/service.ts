import express, { Request, Response } from 'express';
import WebSocket from 'ws';
import { OrderBook } from './orderbook';
import { EncryptedOrder, Match } from './types';
import { PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import * as crypto from 'crypto';

export class MatcherService {
  private app: express.Application;
  private wss: WebSocket.Server;
  private orderBook: OrderBook;
  private port: number;
  private clients: Set<WebSocket> = new Set();
  private connection: Connection;
  private programId: PublicKey;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.orderBook = new OrderBook();

    // Initialize Solana connection (use localnet for development)
    this.connection = new Connection('http://localhost:8899', 'confirmed');
    this.programId = new PublicKey('DzueqW4xsJRhv5pQdcwTsWgeKcV2xfEoKRALN4Ma8dHd');

    this.wss = new WebSocket.Server({ port: port + 1 });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        orders: this.orderBook.getBuyOrders().length + this.orderBook.getSellOrders().length,
        timestamp: new Date().toISOString()
      });
    });

    // Get order book summary
    this.app.get('/orders', (req: Request, res: Response) => {
      res.json({
        buyOrders: this.orderBook.getBuyOrders().length,
        sellOrders: this.orderBook.getSellOrders().length,
        lastUpdate: Date.now()
      });
    });

    // Submit encrypted order
    this.app.post('/orders', async (req: Request, res: Response) => {
      try {
        const order: EncryptedOrder = {
          id: req.body.id,
          side: req.body.side === 0 ? 'buy' : 'sell',
          price: new Uint8Array(req.body.price),
          size: new Uint8Array(req.body.size),
          expiry: new Uint8Array(req.body.expiry),
          owner: req.body.owner,
          timestamp: Date.now(),
          chain: req.body.chain || 'solana'
        };

        // Validate order
        if (!this.validateOrder(order)) {
          return res.status(400).json({ error: 'Invalid order format' });
        }

        await this.orderBook.addOrder(order);

        // Attempt matching with ZK proof generation
        const matches = await this.findMatches(order);
        let matchesFound = 0;

        for (const match of matches) {
          await this.processMatch(match);
          matchesFound++;
        }

        // Broadcast order book update
        this.broadcastUpdate();

        res.json({
          success: true,
          orderId: order.id,
          matchesFound
        });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    });

    // Get match details for settlement
    this.app.get('/matches/:matchId', (req: Request, res: Response) => {
      // In production: return encrypted match data with ZK proof
      res.json({ error: 'Match details endpoint not implemented yet' });
    });

    // Manual matching trigger (for testing)
    this.app.post('/match', async (req: Request, res: Response) => {
      try {
        const matches = await this.performBatchMatching();
        res.json({
          success: true,
          matchesFound: matches.length,
          matches: matches.map(m => ({
            buyOrderId: m.buyOrder.id,
            sellOrderId: m.sellOrder.id,
            timestamp: m.timestamp
          }))
        });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');
      this.clients.add(ws);

      // Send initial order book state
      ws.send(JSON.stringify({
        type: 'orderbook',
        data: {
          buyOrders: this.orderBook.getBuyOrders().length,
          sellOrders: this.orderBook.getSellOrders().length
        }
      }));

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          // Handle real-time order updates or subscriptions
          console.log('Received:', data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });
    });
  }

  private validateOrder(order: EncryptedOrder): boolean {
    return !!(
      order.id &&
      typeof order.side === 'number' &&
      order.price && order.price.length === 32 &&
      order.size && order.size.length === 32 &&
      order.owner
    );
  }

  private async findMatches(newOrder: EncryptedOrder): Promise<Match[]> {
    const matches: Match[] = [];

    // Get opposite side orders
    const oppositeOrders = newOrder.side === 'buy' ?
      this.orderBook.getSellOrders() : this.orderBook.getBuyOrders();

    // Confidential matching logic with ZK proof simulation
    for (const existingOrder of oppositeOrders) {
      if (await this.verifyPriceCompatibility(newOrder, existingOrder)) {
        const match: Match = {
          id: crypto.randomUUID(),
          buyOrder: newOrder.side === 'buy' ? newOrder : existingOrder,
          sellOrder: newOrder.side === 'sell' ? newOrder : existingOrder,
          matchedPrice: this.calculateMatchedPrice(newOrder, existingOrder),
          matchedSize: this.calculateMatchedSize(newOrder, existingOrder),
          zkProof: this.generateZKProof(newOrder, existingOrder),
          timestamp: Date.now()
        };
        matches.push(match);
        break; // Match with first compatible order
      }
    }

    return matches;
  }

  private async verifyPriceCompatibility(order1: EncryptedOrder, order2: EncryptedOrder): Promise<boolean> {
    // In production: Use Arcium ZK circuits to verify price compatibility
    // without revealing actual prices to the matcher

    // For now: Simulate price compatibility check
    // Buy price >= Sell price for a valid match
    const buyPrice = order1.side === 'buy' ? order1.price : order2.price;
    const sellPrice = order1.side === 'sell' ? order1.price : order2.price;

    // Simulate homomorphic comparison (in production: ZK proof)
    return this.simulateHomomorphicComparison(buyPrice, sellPrice);
  }

  private simulateHomomorphicComparison(buyPrice: Uint8Array, sellPrice: Uint8Array): boolean {
    // In production: This would use homomorphic encryption to compare
    // encrypted prices without decryption

    // For demo: 40% chance of match (simulating price compatibility)
    return Math.random() > 0.6;
  }

  private calculateMatchedPrice(buyOrder: EncryptedOrder, sellOrder: EncryptedOrder): Uint8Array {
    // In production: Use homomorphic operations to calculate agreed price
    // For now: Return buy order price as matched price
    return buyOrder.side === 'buy' ? buyOrder.price : sellOrder.price;
  }

  private calculateMatchedSize(buyOrder: EncryptedOrder, sellOrder: EncryptedOrder): Uint8Array {
    // In production: Calculate minimum of available sizes using homomorphic operations
    // For now: Return smaller size
    return buyOrder.size.length <= sellOrder.size.length ? buyOrder.size : sellOrder.size;
  }

  private generateZKProof(buyOrder: EncryptedOrder, sellOrder: EncryptedOrder): Uint8Array {
    // In production: Generate ZK proof using Arcium circuits that proves:
    // 1. Buy price >= Sell price
    // 2. Matched size <= both order sizes
    // 3. Orders are valid and not expired
    // Without revealing actual prices or sizes

    // For now: Generate mock proof
    return crypto.randomBytes(64); // 512-bit proof
  }

  private async processMatch(match: Match) {
    console.log(`Processing match ${match.id} between ${match.buyOrder.id} and ${match.sellOrder.id}`);

    // Remove matched orders from order book
    this.orderBook.removeOrder(match.buyOrder.id);
    this.orderBook.removeOrder(match.sellOrder.id);

    // Submit settlement transaction to on-chain program
    try {
      await this.submitSettlement(match);
      console.log(`Settlement submitted for match ${match.id}`);
    } catch (error) {
      console.error(`Failed to submit settlement for match ${match.id}:`, error);
      // In production: Add retry logic and error handling
    }
  }

  private async submitSettlement(match: Match) {
    // In production: This would construct and submit a transaction to the
    // settle_with_proof instruction with the ZK proof

    console.log('Submitting settlement transaction...');

    // Mock settlement submission (in production: use actual Solana transaction)
    // The transaction would include:
    // - Buy order ID (encrypted)
    // - Sell order ID (encrypted)
    // - Matched price (encrypted)
    // - Matched size (encrypted)
    // - ZK proof
    // - Deposit proofs (from escrow accounts)

    // Simulate transaction submission
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Settlement transaction submitted successfully');
  }

  private async performBatchMatching(): Promise<Match[]> {
    const allMatches: Match[] = [];
    const buyOrders = this.orderBook.getBuyOrders();
    const sellOrders = this.orderBook.getSellOrders();

    // Cross-match all buy and sell orders
    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        if (await this.verifyPriceCompatibility(buyOrder, sellOrder)) {
          const match: Match = {
            id: crypto.randomUUID(),
            buyOrder,
            sellOrder,
            matchedPrice: this.calculateMatchedPrice(buyOrder, sellOrder),
            matchedSize: this.calculateMatchedSize(buyOrder, sellOrder),
            zkProof: this.generateZKProof(buyOrder, sellOrder),
            timestamp: Date.now()
          };
          allMatches.push(match);
          await this.processMatch(match);
          break; // Move to next buy order
        }
      }
    }

    return allMatches;
  }

  private broadcastUpdate() {
    const update = {
      type: 'orderbook',
      data: {
        buyOrders: this.orderBook.getBuyOrders().length,
        sellOrders: this.orderBook.getSellOrders().length,
        timestamp: Date.now()
      }
    };

    const message = JSON.stringify(update);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Confidential Cross-Chain Exchange Matcher started`);
      console.log(`Matcher service listening on port ${this.port}`);
      console.log(`WebSocket server on port ${this.port + 1}`);
    });

    // Load existing orders (done automatically in OrderBook constructor)
    // this.orderBook.loadFromDisk();

    // Periodic batch matching (in production, this would be more sophisticated)
    setInterval(async () => {
      const totalOrders = this.orderBook.getBuyOrders().length + this.orderBook.getSellOrders().length;
      if (totalOrders >= 2) {
        console.log(`Running batch matching on ${totalOrders} orders...`);
        const matches = await this.performBatchMatching();
        if (matches.length > 0) {
          console.log(`Found ${matches.length} matches`);
          this.broadcastUpdate();
        }
      }
    }, 30000); // Run every 30 seconds
  }
}