"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderBook = void 0;
const fs = __importStar(require("fs"));
class OrderBook {
    constructor(dbPath = './orderbook.json') {
        this.buyOrders = new Map();
        this.sellOrders = new Map();
        this.dbPath = dbPath;
        this.loadOrders();
    }
    async addOrder(order) {
        // Add to in-memory map
        if (order.side === 'buy') {
            this.buyOrders.set(order.id, order);
        }
        else {
            this.sellOrders.set(order.id, order);
        }
        // Persist to file
        await this.saveOrders();
        console.log(`Added ${order.side} order: ${order.id}`);
    }
    async removeOrder(orderId) {
        this.buyOrders.delete(orderId);
        this.sellOrders.delete(orderId);
        await this.saveOrders();
        console.log(`Removed order: ${orderId}`);
    }
    getBuyOrders() {
        return Array.from(this.buyOrders.values()).sort((a, b) => b.timestamp - a.timestamp);
    }
    getSellOrders() {
        return Array.from(this.sellOrders.values()).sort((a, b) => a.timestamp - b.timestamp);
    }
    // Simple price-time priority matching (would need ZK for real confidentiality)
    findMatches() {
        const matches = [];
        const buyOrders = this.getBuyOrders();
        const sellOrders = this.getSellOrders();
        // This is a simplified matching - in reality, we'd use ZK to compare encrypted prices
        // For now, assume orders are submitted with some way to compare
        // TODO: Implement proper encrypted matching with ZK proofs
        return matches;
    }
    loadOrders() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                const orders = JSON.parse(data);
                for (const order of orders) {
                    // Convert Uint8Array back from JSON
                    order.price = new Uint8Array(order.price);
                    order.size = new Uint8Array(order.size);
                    order.expiry = new Uint8Array(order.expiry);
                    if (order.side === 'buy') {
                        this.buyOrders.set(order.id, order);
                    }
                    else {
                        this.sellOrders.set(order.id, order);
                    }
                }
            }
            console.log(`Loaded ${this.buyOrders.size} buy orders and ${this.sellOrders.size} sell orders`);
        }
        catch (error) {
            console.error('Error loading orders:', error);
        }
    }
    async saveOrders() {
        try {
            const allOrders = [...this.buyOrders.values(), ...this.sellOrders.values()];
            fs.writeFileSync(this.dbPath, JSON.stringify(allOrders, null, 2));
        }
        catch (error) {
            console.error('Error saving orders:', error);
        }
    }
}
exports.OrderBook = OrderBook;
//# sourceMappingURL=orderbook.js.map