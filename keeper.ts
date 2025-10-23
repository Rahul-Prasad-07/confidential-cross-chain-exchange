import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { ConfidentialCrossChainExchange } from "./target/types/confidential_cross_chain_exchange";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  uploadCircuit,
  buildFinalizeCompDefTx,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

class MatchingEngineKeeper {
  private program: Program<ConfidentialCrossChainExchange>;
  private provider: anchor.AnchorProvider;
  private arciumEnv = getArciumEnv();
  private mxePublicKey: Uint8Array | null = null;

  constructor(program: Program<ConfidentialCrossChainExchange>, provider: anchor.AnchorProvider) {
    this.program = program;
    this.provider = provider;
  }

  async initialize() {
    this.mxePublicKey = await this.getMXEPublicKeyWithRetry();
    console.log("Keeper initialized with MXE public key:", this.mxePublicKey);
  }

  async runKeeperLoop() {
    console.log("Starting matching engine keeper loop...");
    while (true) {
      try {
        await this.checkAndTriggerMatches();
        await this.checkAndSettleMatches();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      } catch (error) {
        console.error("Keeper loop error:", error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
      }
    }
  }

  private async checkAndTriggerMatches() {
    // In a real implementation, this would query the order book state
    // For now, simulate with dummy orders
    const orders = this.generateDummyOrders();
    if (orders.length < 2) return;

    console.log(`Triggering match for ${orders.length} orders`);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, this.mxePublicKey!);
    const cipher = new RescueCipher(sharedSecret);

    const plaintextOrders = orders.map(o => [BigInt(o.orderId), BigInt(o.side), BigInt(o.price), BigInt(o.size)]);
    const nonce = randomBytes(16);
    const ciphertextOrders = plaintextOrders.map(order => cipher.encrypt(order, nonce));

    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await this.program.methods
      .matchOrders(
        computationOffset,
        ciphertextOrders.map(c => Array.from(c[0])), // Only first ciphertext per order for simplicity
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          this.program.programId,
          computationOffset
        ),
        clusterAccount: this.arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(this.program.programId),
        mempoolAccount: getMempoolAccAddress(this.program.programId),
        executingPool: getExecutingPoolAccAddress(this.program.programId),
        compDefAccount: getCompDefAccAddress(
          this.program.programId,
          Buffer.from(getCompDefAccOffset("match_orders")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("Match queue sig:", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      this.provider as anchor.AnchorProvider,
      computationOffset,
      this.program.programId,
      "confirmed"
    );
    console.log("Match finalize sig:", finalizeSig);
  }

  private async checkAndSettleMatches() {
    // Listen for match events and trigger settlements
    // In production, this would use event listeners or query PDAs for pending matches
    // For now, simulate triggering settlement after a match
    console.log("Checking for pending settlements...");

    // Simulate a match result
    const matchDetails = {
      buyOrderId: 1n,
      sellOrderId: 2n,
      matchedPrice: 100n,
      matchedSize: 10n,
    };

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, this.mxePublicKey!);
    const cipher = new RescueCipher(sharedSecret);

    const plaintext = [matchDetails.buyOrderId, matchDetails.sellOrderId, matchDetails.matchedPrice, matchDetails.matchedSize];
    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await this.program.methods
      .settleMatch(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(ciphertext[2]),
        Array.from(ciphertext[3]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          this.program.programId,
          computationOffset
        ),
        clusterAccount: this.arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(this.program.programId),
        mempoolAccount: getMempoolAccAddress(this.program.programId),
        executingPool: getExecutingPoolAccAddress(this.program.programId),
        compDefAccount: getCompDefAccAddress(
          this.program.programId,
          Buffer.from(getCompDefAccOffset("settle_match")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("Settlement queue sig:", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      this.provider as anchor.AnchorProvider,
      computationOffset,
      this.program.programId,
      "confirmed"
    );
    console.log("Settlement finalize sig:", finalizeSig);

    // After settlement, trigger relayer for cross-chain
    await this.relaySettlement(matchDetails);
  }

  private generateDummyOrders() {
    // Generate some dummy orders for testing
    return [
      { orderId: 1, side: 0, price: 100, size: 10 }, // Buy
      { orderId: 2, side: 1, price: 100, size: 10 }, // Sell
    ];
  }

  private async getMXEPublicKeyWithRetry(maxRetries: number = 10): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const mxePublicKey = await getMXEPublicKey(this.provider, this.program.programId);
        if (mxePublicKey) return mxePublicKey;
      } catch (error) {
        console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
  }
}

// Usage example
async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.ConfidentialCrossChainExchange as Program<ConfidentialCrossChainExchange>;
  const provider = anchor.getProvider();

  const keeper = new MatchingEngineKeeper(program, provider as anchor.AnchorProvider);
  await keeper.initialize();
  await keeper.runKeeperLoop();
}

if (require.main === module) {
  main().catch(console.error);
}

export { MatchingEngineKeeper };