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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = require("crypto");
const client_1 = require("@arcium-hq/client");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
async function main() {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.ConfidentialCrossChainExchange; // Use any to avoid type instantiation issues
    const provider = anchor.getProvider();
    const arciumEnv = (0, client_1.getArciumEnv)();
    console.log("Initializing computation definitions...");
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
    // Initialize comp defs for matching engine
    await initSubmitOrderCompDef(program, owner);
    await initMatchOrdersCompDef(program, owner);
    await initCancelOrderCompDef(program, owner);
    await initSettleMatchCompDef(program, owner);
    console.log("Keeper running... Monitoring for orders...");
    // For now, simulate by triggering a sample match every 10 seconds
    setInterval(async () => {
        try {
            await triggerSampleMatch(program, provider, arciumEnv, owner);
        }
        catch (e) {
            console.error("Error in match trigger:", e);
        }
    }, 10000);
}
async function initSubmitOrderCompDef(program, owner) {
    const offset = (0, client_1.getCompDefAccOffset)("submit_order");
    const compDefPDA = web3_js_1.PublicKey.findProgramAddressSync([(0, client_1.getArciumAccountBaseSeed)("ComputationDefinitionAccount"), program.programId.toBuffer(), offset], (0, client_1.getArciumProgAddress)())[0];
    try {
        await program.methods
            .initSubmitOrderCompDef()
            .accounts({
            compDefAccount: compDefPDA,
            payer: owner.publicKey,
            mxeAccount: (0, client_1.getMXEAccAddress)(program.programId),
        })
            .signers([owner])
            .rpc({ commitment: "confirmed" });
        console.log("Submit order comp def initialized");
    }
    catch (e) {
        console.log("Submit order comp def already initialized or error:", e.message);
    }
}
async function initMatchOrdersCompDef(program, owner) {
    const offset = (0, client_1.getCompDefAccOffset)("match_orders");
    const compDefPDA = web3_js_1.PublicKey.findProgramAddressSync([(0, client_1.getArciumAccountBaseSeed)("ComputationDefinitionAccount"), program.programId.toBuffer(), offset], (0, client_1.getArciumProgAddress)())[0];
    try {
        await program.methods
            .initMatchOrdersCompDef()
            .accounts({
            compDefAccount: compDefPDA,
            payer: owner.publicKey,
            mxeAccount: (0, client_1.getMXEAccAddress)(program.programId),
        })
            .signers([owner])
            .rpc({ commitment: "confirmed" });
        console.log("Match orders comp def initialized");
    }
    catch (e) {
        console.log("Match orders comp def already initialized or error:", e.message);
    }
}
async function initCancelOrderCompDef(program, owner) {
    const offset = (0, client_1.getCompDefAccOffset)("cancel_order");
    const compDefPDA = web3_js_1.PublicKey.findProgramAddressSync([(0, client_1.getArciumAccountBaseSeed)("ComputationDefinitionAccount"), program.programId.toBuffer(), offset], (0, client_1.getArciumProgAddress)())[0];
    try {
        await program.methods
            .initCancelOrderCompDef()
            .accounts({
            compDefAccount: compDefPDA,
            payer: owner.publicKey,
            mxeAccount: (0, client_1.getMXEAccAddress)(program.programId),
        })
            .signers([owner])
            .rpc({ commitment: "confirmed" });
        console.log("Cancel order comp def initialized");
    }
    catch (e) {
        console.log("Cancel order comp def already initialized or error:", e.message);
    }
}
async function initSettleMatchCompDef(program, owner) {
    const offset = (0, client_1.getCompDefAccOffset)("settle_match");
    const compDefPDA = web3_js_1.PublicKey.findProgramAddressSync([(0, client_1.getArciumAccountBaseSeed)("ComputationDefinitionAccount"), program.programId.toBuffer(), offset], (0, client_1.getArciumProgAddress)())[0];
    try {
        await program.methods
            .initSettleMatchCompDef()
            .accounts({
            compDefAccount: compDefPDA,
            payer: owner.publicKey,
            mxeAccount: (0, client_1.getMXEAccAddress)(program.programId),
        })
            .signers([owner])
            .rpc({ commitment: "confirmed" });
        console.log("Settle match comp def initialized");
    }
    catch (e) {
        console.log("Settle match comp def already initialized or error:", e.message);
    }
}
async function triggerSampleMatch(program, provider, arciumEnv, owner) {
    console.log("Triggering sample match...");
    const mxePublicKey = await (0, client_1.getMXEPublicKey)(provider, program.programId);
    const privateKey = client_1.x25519.utils.randomSecretKey();
    const publicKey = client_1.x25519.getPublicKey(privateKey);
    const sharedSecret = client_1.x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new client_1.RescueCipher(sharedSecret);
    // Sample orders: 2 buys and 2 sells (but we can only match 2 at a time)
    const orders = [
        { order_id: 1, side: 0, price: 100, size: 10 },
        { order_id: 2, side: 1, price: 100, size: 10 }, // sell (matching price)
    ];
    const plaintextOrders = orders.map(o => [BigInt(o.order_id), BigInt(o.side), BigInt(o.price), BigInt(o.size), BigInt(0)]); // expiry 0
    const nonce = (0, crypto_1.randomBytes)(16);
    const ciphertexts = plaintextOrders.map(pt => cipher.encrypt(pt, nonce));
    const computationOffset = new anchor.BN((0, crypto_1.randomBytes)(8), "hex");
    // Prepare encrypted inputs as fixed arrays of [u8;32]
    const encryptedOrderIds = [
        Array.from(ciphertexts[0][0]),
        Array.from(ciphertexts[1][0]), // order_id 2
    ];
    const encryptedSides = [
        Array.from(ciphertexts[0][1]),
        Array.from(ciphertexts[1][1]), // side 2
    ];
    const encryptedPrices = [
        Array.from(ciphertexts[0][2]),
        Array.from(ciphertexts[1][2]), // price 2
    ];
    const encryptedSizes = [
        Array.from(ciphertexts[0][3]),
        Array.from(ciphertexts[1][3]), // size 2
    ];
    const encryptedExpiries = [
        Array.from(ciphertexts[0][4]),
        Array.from(ciphertexts[1][4]), // expiry 2
    ];
    const queueSig = await program.methods
        .matchOrders(encryptedOrderIds, encryptedSides, encryptedPrices, encryptedSizes, encryptedExpiries, 2, // n_orders
    Array.from(publicKey), new anchor.BN((0, client_1.deserializeLE)(nonce).toString()))
        .accountsPartial({
        computationAccount: (0, client_1.getComputationAccAddress)(program.programId, computationOffset),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: (0, client_1.getMXEAccAddress)(program.programId),
        mempoolAccount: (0, client_1.getMempoolAccAddress)(program.programId),
        executingPool: (0, client_1.getExecutingPoolAccAddress)(program.programId),
        compDefAccount: (0, client_1.getCompDefAccAddress)(program.programId, Buffer.from((0, client_1.getCompDefAccOffset)("match_orders")).readUInt32LE()),
    })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Match queue sig:", queueSig);
    const finalizeSig = await (0, client_1.awaitComputationFinalization)(provider, computationOffset, program.programId, "confirmed");
    console.log("Match finalize sig:", finalizeSig);
    // Listen for callback event
    const eventListener = program.addEventListener("MatchOrdersEvent", async (event) => {
        console.log("Match result received:", event.ciphertexts.length, "ciphertexts");
        // Process matches and trigger settlements
        if (event.ciphertexts.length > 0) {
            console.log("Matches found! Triggering settlements...");
            // For each match ciphertext, trigger settle_match
            for (let i = 0; i < event.ciphertexts.length; i++) {
                try {
                    const matchCiphertext = event.ciphertexts[i];
                    await triggerSettleMatch(program, provider, arciumEnv, owner, matchCiphertext, computationOffset);
                }
                catch (e) {
                    console.error(`Error settling match ${i}:`, e);
                }
            }
        }
        program.removeEventListener(eventListener);
    });
}
async function triggerSettleMatch(program, provider, arciumEnv, owner, matchCiphertext, matchComputationOffset) {
    console.log("Triggering settle match for ciphertext:", matchCiphertext.slice(0, 8), "...");
    const computationOffset = new anchor.BN((0, crypto_1.randomBytes)(8), "hex");
    // The match ciphertext contains encrypted match data
    // In production, we'd decrypt and parse the match details
    // For now, we'll create mock encrypted data for the match
    const mxePublicKey = await (0, client_1.getMXEPublicKey)(provider, program.programId);
    if (!mxePublicKey) {
        throw new Error("Failed to get MXE public key");
    }
    const privateKey = client_1.x25519.utils.randomSecretKey();
    const publicKey = client_1.x25519.getPublicKey(privateKey);
    const sharedSecret = client_1.x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new client_1.RescueCipher(sharedSecret);
    // Mock match data: buy_order_id, sell_order_id, matched_price, matched_size
    const matchData = [
        BigInt(1),
        BigInt(2),
        BigInt(100),
        BigInt(10), // matched_size
    ];
    const nonce = (0, crypto_1.randomBytes)(16);
    const encryptedMatchData = matchData.map(pt => cipher.encrypt([pt], nonce));
    // Mock deposit proofs (4 proofs)
    const depositProofs = [
        new Uint8Array(32),
        new Uint8Array(32),
        new Uint8Array(32),
        new Uint8Array(32), // mock proof 4
    ];
    const queueSig = await program.methods
        .settleMatch(Array.from(encryptedMatchData[0][0]), // buy_order_id
    Array.from(encryptedMatchData[1][0]), // sell_order_id
    Array.from(encryptedMatchData[2][0]), // matched_price
    Array.from(encryptedMatchData[3][0]), // matched_size
    [
        Array.from(depositProofs[0]),
        Array.from(depositProofs[1]),
        Array.from(depositProofs[2]),
        Array.from(depositProofs[3]),
    ], // deposit_proofs
    4, // n_deposit_proofs
    Array.from(publicKey), new anchor.BN((0, client_1.deserializeLE)(nonce).toString()))
        .accountsPartial({
        computationAccount: (0, client_1.getComputationAccAddress)(program.programId, computationOffset),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: (0, client_1.getMXEAccAddress)(program.programId),
        mempoolAccount: (0, client_1.getMempoolAccAddress)(program.programId),
        executingPool: (0, client_1.getExecutingPoolAccAddress)(program.programId),
        compDefAccount: (0, client_1.getCompDefAccAddress)(program.programId, Buffer.from((0, client_1.getCompDefAccOffset)("settle_match")).readUInt32LE()),
    })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Settle match queue sig:", queueSig);
    const finalizeSig = await (0, client_1.awaitComputationFinalization)(provider, computationOffset, program.programId, "confirmed");
    console.log("Settle match finalize sig:", finalizeSig);
    // Listen for settlement completion
    const eventListener = program.addEventListener("SettleMatchEvent", (event) => {
        console.log("Settlement completed:", event.ciphertexts.length, "ciphertexts");
        program.removeEventListener(eventListener);
    });
}
function readKpJson(path) {
    const file = fs.readFileSync(path);
    return anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}
main().catch(console.error);
