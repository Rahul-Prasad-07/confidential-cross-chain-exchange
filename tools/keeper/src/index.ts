import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
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

async function main() {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.ConfidentialCrossChainExchange as any; // Use any to avoid type instantiation issues
  const provider = anchor.getProvider();

  const arciumEnv = getArciumEnv();

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
      await triggerSampleMatch(program, provider as anchor.AnchorProvider, arciumEnv, owner);
    } catch (e) {
      console.error("Error in match trigger:", e);
    }
  }, 10000);
}

async function initSubmitOrderCompDef(
  program: any,
  owner: anchor.web3.Keypair
) {
  const offset = getCompDefAccOffset("submit_order");
  const compDefPDA = PublicKey.findProgramAddressSync(
    [getArciumAccountBaseSeed("ComputationDefinitionAccount"), program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  try {
    await program.methods
      .initSubmitOrderCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Submit order comp def initialized");
  } catch (e: any) {
    console.log("Submit order comp def already initialized or error:", e.message);
  }
}

async function initMatchOrdersCompDef(
  program: any,
  owner: anchor.web3.Keypair
) {
  const offset = getCompDefAccOffset("match_orders");
  const compDefPDA = PublicKey.findProgramAddressSync(
    [getArciumAccountBaseSeed("ComputationDefinitionAccount"), program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  try {
    await program.methods
      .initMatchOrdersCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Match orders comp def initialized");
  } catch (e: any) {
    console.log("Match orders comp def already initialized or error:", e.message);     
  }
}

async function initCancelOrderCompDef(
  program: any,
  owner: anchor.web3.Keypair
) {
  const offset = getCompDefAccOffset("cancel_order");
  const compDefPDA = PublicKey.findProgramAddressSync(
    [getArciumAccountBaseSeed("ComputationDefinitionAccount"), program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  try {
    await program.methods
      .initCancelOrderCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Cancel order comp def initialized");
  } catch (e: any) {
    console.log("Cancel order comp def already initialized or error:", e.message);     
  }
}

async function initSettleMatchCompDef(
  program: any,
  owner: anchor.web3.Keypair
) {
  const offset = getCompDefAccOffset("settle_match");
  const compDefPDA = PublicKey.findProgramAddressSync(
    [getArciumAccountBaseSeed("ComputationDefinitionAccount"), program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  try {
    await program.methods
      .initSettleMatchCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("Settle match comp def initialized");
  } catch (e: any) {
    console.log("Settle match comp def already initialized or error:", e.message);     
  }
}

async function triggerSampleMatch(
  program: any,
  provider: anchor.AnchorProvider,
  arciumEnv: any,
  owner: anchor.web3.Keypair
) {
  console.log("Triggering sample match...");

  const mxePublicKey = await getMXEPublicKey(provider, program.programId);

  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  // Sample orders: 2 buys and 2 sells (but we can only match 2 at a time)
  const orders = [
    { order_id: 1, side: 0, price: 100, size: 10 }, // buy
    { order_id: 2, side: 1, price: 100, size: 10 }, // sell (matching price)
  ];

  const plaintextOrders = orders.map(o => [BigInt(o.order_id), BigInt(o.side), BigInt(o.price), BigInt(o.size), BigInt(0)]); // expiry 0
  const nonce = randomBytes(16);
  const ciphertexts = plaintextOrders.map(pt => cipher.encrypt(pt, nonce));

  const computationOffset = new anchor.BN(randomBytes(8), "hex");

  // Prepare encrypted inputs as fixed arrays of [u8;32]
  const encryptedOrderIds: [number[], number[]] = [
    Array.from(ciphertexts[0][0]), // order_id 1
    Array.from(ciphertexts[1][0]), // order_id 2
  ];
  const encryptedSides: [number[], number[]] = [
    Array.from(ciphertexts[0][1]), // side 1
    Array.from(ciphertexts[1][1]), // side 2
  ];
  const encryptedPrices: [number[], number[]] = [
    Array.from(ciphertexts[0][2]), // price 1
    Array.from(ciphertexts[1][2]), // price 2
  ];
  const encryptedSizes: [number[], number[]] = [
    Array.from(ciphertexts[0][3]), // size 1
    Array.from(ciphertexts[1][3]), // size 2
  ];
  const encryptedExpiries: [number[], number[]] = [
    Array.from(ciphertexts[0][4]), // expiry 1
    Array.from(ciphertexts[1][4]), // expiry 2
  ];

  const queueSig = await program.methods
    .matchOrders(
      encryptedOrderIds,
      encryptedSides,
      encryptedPrices,
      encryptedSizes,
      encryptedExpiries,
      2, // n_orders
      Array.from(publicKey),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(program.programId, computationOffset),
      clusterAccount: arciumEnv.arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("match_orders")).readUInt32LE()
      ),
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  console.log("Match queue sig:", queueSig);

  const finalizeSig = await awaitComputationFinalization(
    provider,
    computationOffset,
    program.programId,
    "confirmed"
  );
  console.log("Match finalize sig:", finalizeSig);

  // Listen for callback event
  const eventListener = program.addEventListener("MatchOrdersEvent", async (event: any) => {
    console.log("Match result received:", event.ciphertexts.length, "ciphertexts");

    // Process matches and trigger settlements
    if (event.ciphertexts.length > 0) {
      console.log("Matches found! Triggering settlements...");

      // For each match ciphertext, trigger settle_match
      for (let i = 0; i < event.ciphertexts.length; i++) {
        try {
          const matchCiphertext = event.ciphertexts[i];
          await triggerSettleMatch(program, provider, arciumEnv, owner, matchCiphertext, computationOffset);
        } catch (e: any) {
          console.error(`Error settling match ${i}:`, e);
        }
      }
    }

    program.removeEventListener(eventListener);
  });
}

async function triggerSettleMatch(
  program: any,
  provider: anchor.AnchorProvider,
  arciumEnv: any,
  owner: anchor.web3.Keypair,
  matchCiphertext: number[],
  matchComputationOffset: anchor.BN
) {
  console.log("Triggering settle match for ciphertext:", matchCiphertext.slice(0, 8), "...");

  const computationOffset = new anchor.BN(randomBytes(8), "hex");

  // The match ciphertext contains encrypted match data
  // In production, we'd decrypt and parse the match details
  // For now, we'll create mock encrypted data for the match

  const mxePublicKey = await getMXEPublicKey(provider, program.programId);
  if (!mxePublicKey) {
    throw new Error("Failed to get MXE public key");
  }

  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  // Mock match data: buy_order_id, sell_order_id, matched_price, matched_size
  const matchData = [
    BigInt(1), // buy_order_id
    BigInt(2), // sell_order_id
    BigInt(100), // matched_price
    BigInt(10), // matched_size
  ];

  const nonce = randomBytes(16);
  const encryptedMatchData = matchData.map(pt => cipher.encrypt([pt], nonce));

  // Mock deposit proofs (4 proofs)
  const depositProofs = [
    new Uint8Array(32), // mock proof 1
    new Uint8Array(32), // mock proof 2
    new Uint8Array(32), // mock proof 3
    new Uint8Array(32), // mock proof 4
  ];

  const queueSig = await program.methods
    .settleMatch(
      Array.from(encryptedMatchData[0][0]), // buy_order_id
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
      Array.from(publicKey),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(program.programId, computationOffset),
      clusterAccount: arciumEnv.arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("settle_match")).readUInt32LE()
      ),
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  console.log("Settle match queue sig:", queueSig);

  const finalizeSig = await awaitComputationFinalization(
    provider,
    computationOffset,
    program.programId,
    "confirmed"
  );
  console.log("Settle match finalize sig:", finalizeSig);

  // Listen for settlement completion
  const eventListener = program.addEventListener("SettleMatchEvent", (event: any) => {
    console.log("Settlement completed:", event.ciphertexts.length, "ciphertexts");
    program.removeEventListener(eventListener);
  });
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}

main().catch(console.error);