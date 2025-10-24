import { EncryptedOrder, Match } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class OrderBook {
  private buyOrders: Map<string, EncryptedOrder> = new Map();
  private sellOrders: Map<string, EncryptedOrder> = new Map();
  private dbPath: string;

  constructor(dbPath: string = './orderbook.json') {
    this.dbPath = dbPath;
    this.loadOrders();
  }

  async addOrder(order: EncryptedOrder): Promise<void> {
    // Add to in-memory map
    if (order.side === 'buy') {
      this.buyOrders.set(order.id, order);
    } else {
      this.sellOrders.set(order.id, order);
    }

    // Persist to file
    await this.saveOrders();

    console.log(`Added ${order.side} order: ${order.id}`);
  }

  async removeOrder(orderId: string): Promise<void> {
    this.buyOrders.delete(orderId);
    this.sellOrders.delete(orderId);

    await this.saveOrders();

    console.log(`Removed order: ${orderId}`);
  }

  getBuyOrders(): EncryptedOrder[] {
    return Array.from(this.buyOrders.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  getSellOrders(): EncryptedOrder[] {
    return Array.from(this.sellOrders.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Simple price-time priority matching (would need ZK for real confidentiality)
  findMatches(): Match[] {
    const matches: Match[] = [];
    const buyOrders = this.getBuyOrders();
    const sellOrders = this.getSellOrders();

    // This is a simplified matching - in reality, we'd use ZK to compare encrypted prices
    // For now, assume orders are submitted with some way to compare

    // TODO: Implement proper encrypted matching with ZK proofs

    return matches;
  }

  private loadOrders(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        const orders: EncryptedOrder[] = JSON.parse(data);

        for (const order of orders) {
          // Convert Uint8Array back from JSON
          order.price = new Uint8Array(order.price as any);
          order.size = new Uint8Array(order.size as any);
          order.expiry = new Uint8Array(order.expiry as any);

          if (order.side === 'buy') {
            this.buyOrders.set(order.id, order);
          } else {
            this.sellOrders.set(order.id, order);
          }
        }
      }
      console.log(`Loaded ${this.buyOrders.size} buy orders and ${this.sellOrders.size} sell orders`);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  private async saveOrders(): Promise<void> {
    try {
      const allOrders = [...this.buyOrders.values(), ...this.sellOrders.values()];
      fs.writeFileSync(this.dbPath, JSON.stringify(allOrders, null, 2));
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  }
}