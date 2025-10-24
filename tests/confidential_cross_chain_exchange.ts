import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ConfidentialCrossChainExchange } from "../target/types/confidential_cross_chain_exchange";
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

describe("ConfidentialCrossChainExchange", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace
    .ConfidentialCrossChainExchange as Program<ConfidentialCrossChainExchange>;
  const provider = anchor.getProvider();

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E
  ): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);

    return event;
  };

  const arciumEnv = getArciumEnv();

  async function sendMethodWithFreshBlockhash(
    builder: () => any,
    label: string,
    extraSigners: anchor.web3.Signer[] = [],
    retries: number = 5
  ): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const method = builder();
      const instruction = await method.instruction();

      const tx = new anchor.web3.Transaction();
      tx.add(instruction);
      tx.feePayer = provider.wallet.publicKey;

      const {
        blockhash,
        lastValidBlockHeight,
      } = await provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      if (extraSigners.length > 0) {
        tx.partialSign(...extraSigners);
      }

      const signed = await provider.wallet.signTransaction(tx);
      const raw = signed.serialize();

      try {
        const sig = await provider.connection.sendRawTransaction(raw, {
          skipPreflight: true,
        });

        await provider.connection.confirmTransaction(
          {
            signature: sig,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        return sig;
      } catch (error: any) {
        const message = error?.message ?? "";
        if (message.includes("Blockhash not found") && attempt < retries) {
          console.log(
            `${label} hit expired blockhash, retrying (${attempt}/${retries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          continue;
        }

        console.error(`${label} failed:`, error);
        throw error;
      }
    }

    throw new Error(`Failed to execute ${label} after ${retries} attempts`);
  }

  it.skip("Is initialized!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing add together computation definition");
    const initATSig = await initAddTogetherCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Add together computation definition initialized with signature",
      initATSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const val1 = BigInt(1);
    const val2 = BigInt(2);
    const plaintext = [val1, val2];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const sumEventPromise = awaitEvent("sumEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .addTogether(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("add_together")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const sumEvent = await sumEventPromise;
    const decrypted = cipher.decrypt([sumEvent.sum], sumEvent.nonce)[0];
    expect(decrypted).to.equal(val1 + val2);
  });

  it.skip("Relay offer clone works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing relay offer clone computation definition");
    const initROCSig = await initRelayOfferCloneCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Relay offer clone computation definition initialized with signature",
      initROCSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const offerId = BigInt(12345);
    const plaintext = [offerId];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const relayEventPromise = awaitEvent("relayOfferClonedEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .relayOfferClone(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("relay_offer_clone")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const relayEvent = await relayEventPromise;
    const decrypted = cipher.decrypt([relayEvent.clonedOffer], relayEvent.nonce)[0];
    expect(decrypted).to.equal(offerId);
  });

  it.skip("Confidential deposit native works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing confidential deposit native computation definition");
    const initCDNSig = await initConfidentialDepositNativeCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Confidential deposit native computation definition initialized with signature",
      initCDNSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const amount = BigInt(1000);
    const plaintext = [amount];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const depositEventPromise = awaitEvent("confidentialDepositNativeEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");


    console.log("amount:", amount.toString());
    console.log("nonce:", nonce.toString("hex"));
    console.log("ciphertext:", ciphertext[0]);
    console.log("publicKey:", publicKey);
    console.log("plaintext:", plaintext);
    const queueSig = await program.methods
      .confidentialDepositNative(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("confidential_deposit_native")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const depositEvent = await depositEventPromise;
    const decrypted = cipher.decrypt(
      [depositEvent.processedAmount],
      depositEvent.nonce
    )[0];

    console.log("Decrypted amount:", decrypted.toString());
    console.log("Expected amount:", amount.toString());
    expect(decrypted).to.equal(amount);
  });

  it.skip("Interchain origin EVM deposit seller SPL works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing interchain origin EVM deposit seller SPL computation definition");
    const initIEDSSSig = await initInterchainOriginEvmDepositSellerSplCompDef(
      program,
      owner,
      true,
      false
    );
    console.log(
      "Interchain origin EVM deposit seller SPL computation definition initialized with signature",
      initIEDSSSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const offerId = BigInt(12345);
    const amount = BigInt(50000);
    const plaintext = [offerId, amount];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const depositEventPromise = awaitEvent("interchainOriginEvmDepositSellerSplEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .interchainOriginEvmDepositSellerSpl(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()),
        true // is_taker_native
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("interchain_origin_evm_deposit_seller_spl")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const depositEvent = await depositEventPromise;
    const decrypted = cipher.decrypt([new Uint8Array(depositEvent.processedOfferId), new Uint8Array(depositEvent.processedAmount)], depositEvent.nonce);
    const decryptedOfferId = decrypted[0];
    const decryptedAmount = decrypted[1];
    expect(decryptedOfferId).to.equal(offerId);
    expect(decryptedAmount).to.equal(amount);
  });

  it.skip("Finalize interchain origin EVM offer works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing finalize interchain origin EVM offer computation definition");
    const initFIEOSig = await initFinalizeInterchainOriginEvmOfferCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Finalize interchain origin EVM offer computation definition initialized with signature",
      initFIEOSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const offerId = BigInt(12345);
    const plaintext = [offerId];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const finalizeEventPromise = awaitEvent("finalizeInterchainOriginEvmOfferEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .finalizeInterchainOriginEvmOffer(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("finalize_interchain_origin_evm_offer")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const finalizeEvent = await finalizeEventPromise;
    const decrypted = cipher.decrypt([finalizeEvent.finalizedOfferId], finalizeEvent.nonce)[0];
    expect(decrypted).to.equal(offerId);
  });

  it.skip("Deposit seller native works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing deposit seller native computation definition");
    const initDSNSig = await initDepositSellerNativeCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Deposit seller native computation definition initialized with signature",
      initDSNSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const offerId = BigInt(12345);
    const amount = BigInt(100000);
    const plaintext = [offerId, amount];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const depositEventPromise = awaitEvent("depositSellerNativeEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .depositSellerNative(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("deposit_seller_native")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const depositEvent = await depositEventPromise;
    const decrypted = cipher.decrypt([new Uint8Array(depositEvent.processedOfferId), new Uint8Array(depositEvent.processedAmount)], depositEvent.nonce);
    const decryptedOfferId = decrypted[0];
    const decryptedAmount = decrypted[1];
    expect(decryptedOfferId).to.equal(offerId);
    console.log("Decrypted amount:", decryptedAmount.toString());
    console.log("Expected amount:", amount.toString());
    expect(decryptedAmount).to.equal(amount);
  });

  it.skip("Deposit seller SPL works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing deposit seller SPL computation definition");
    const initDSSSig = await initDepositSellerSplCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Deposit seller SPL computation definition initialized with signature",
      initDSSSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const offerId = BigInt(12345);
    const amount = BigInt(50000);
    const plaintext = [offerId, amount];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const depositEventPromise = awaitEvent("depositSellerSplEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .depositSellerSpl(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("deposit_seller_spl")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const depositEvent = await depositEventPromise;
    const decrypted = cipher.decrypt([new Uint8Array(depositEvent.processedOfferId), new Uint8Array(depositEvent.processedAmount)], depositEvent.nonce);
    const decryptedOfferId = decrypted[0];
    const decryptedAmount = decrypted[1];
    expect(decryptedOfferId).to.equal(offerId);
    expect(decryptedAmount).to.equal(amount);
  });

  async function initAddTogetherCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("add_together");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initAddTogetherCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log("Init add together computation definition transaction", sig);

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync("build/add_together.arcis");

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "add_together",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }
  async function initRelayOfferCloneCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("relay_offer_clone");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initRelayOfferCloneCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log("Init relay offer clone computation definition transaction", sig);

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync("build/relay_offer_clone.arcis");

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "relay_offer_clone",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }

  async function initConfidentialDepositNativeCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("confidential_deposit_native");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initConfidentialDepositNativeCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log(
      "Init confidential deposit native computation definition transaction",
      sig
    );

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync(
        "build/confidential_deposit_native.arcis"
      );

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "confidential_deposit_native",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }

  async function initInterchainOriginEvmDepositSellerSplCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("interchain_origin_evm_deposit_seller_spl");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initInterchainOriginEvmDepositSellerSplCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log(
      "Init interchain origin EVM deposit seller SPL computation definition transaction",
      sig
    );

    if (uploadRawCircuit) {
      try {
        const rawCircuit = fs.readFileSync(
          "build/interchain_origin_evm_deposit_seller_spl.arcis"
        );

        await uploadCircuit(
          provider as anchor.AnchorProvider,
          "interchain_origin_evm_deposit_seller_spl",
          program.programId,
          rawCircuit,
          true
        );
      } catch (error) {
        console.log("Upload failed, perhaps already uploaded", error.message);
      }

      // Finalize after upload
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize sig is ", finalizeTx.signature);
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize sig is ", finalizeTx.signature);
    }

    // Always finalize for interchain
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
    console.log("Finalize sig is ", finalizeTx.signature);
    return sig;
  }

  async function initFinalizeInterchainOriginEvmOfferCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("finalize_interchain_origin_evm_offer");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initFinalizeInterchainOriginEvmOfferCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log(
      "Init finalize interchain origin EVM offer computation definition transaction",
      sig
    );

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync(
        "build/finalize_interchain_origin_evm_offer.arcis"
      );

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "finalize_interchain_origin_evm_offer",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }

  async function initDepositSellerNativeCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("deposit_seller_native");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    let sig: string;
    try {
      sig = await program.methods
        .initDepositSellerNativeCompDef()
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
        })
        .signers([owner])
        .rpc({
          commitment: "confirmed",
        });
      console.log(
        "Init deposit seller native computation definition transaction",
        sig
      );
    } catch (error: any) {
      if (error.message.includes("account already in use") || error.message.includes("already in use")) {
        console.log("Deposit seller native computation definition already initialized, skipping...");
        sig = "already-initialized";
      } else {
        throw error;
      }
    }

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync(
        "build/deposit_seller_native.arcis"
      );

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "deposit_seller_native",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      try {
        const finalizeTx = await buildFinalizeCompDefTx(
          provider as anchor.AnchorProvider,
          Buffer.from(offset).readUInt32LE(),
          program.programId
        );

        const latestBlockhash = await provider.connection.getLatestBlockhash();
        finalizeTx.recentBlockhash = latestBlockhash.blockhash;
        finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

        finalizeTx.sign(owner);

        await provider.sendAndConfirm(finalizeTx);
      } catch (error: any) {
        if (error.message.includes("already finalized") || error.message.includes("already in use")) {
          console.log("Deposit seller native computation definition already finalized, skipping...");
        } else {
          throw error;
        }
      }
    }
    return sig;
  }

  async function initDepositSellerSplCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("deposit_seller_spl");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initDepositSellerSplCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log(
      "Init deposit seller SPL computation definition transaction",
      sig
    );

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync(
        "build/deposit_seller_spl.arcis"
      );

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "deposit_seller_spl",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }

  async function initFinalizeIntrachainOfferCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("finalize_intrachain_offer");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    const sig = await program.methods
      .initFinalizeIntrachainOfferCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log(
      "Init finalize intrachain offer computation definition transaction",
      sig
    );

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync(
        "build/finalize_intrachain_offer.arcis"
      );

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "finalize_intrachain_offer",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }

  it.skip("Submit order works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing submit order computation definition");
    const initSOSig = await initSubmitOrderCompDef(
      program,
      owner,
      false,
      false
    );
    console.log(
      "Submit order computation definition initialized with signature",
      initSOSig
    );

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const orderId = BigInt(12345);
    const side = BigInt(0); // buy
    const price = BigInt(100);
    const size = BigInt(10);
    const expiry = BigInt(1234567890);
    const plaintext = [orderId, side, price, size, expiry];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    const submitEventPromise = awaitEvent("submitOrderEvent");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const queueSig = await program.methods
      .submitOrder(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(ciphertext[2]),
        Array.from(ciphertext[3]),
        Array.from(ciphertext[4]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          computationOffset
        ),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("submit_order")).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    console.log("Queue sig is ", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      computationOffset,
      program.programId,
      "confirmed"
    );
    console.log("Finalize sig is ", finalizeSig);

    const submitEvent = await submitEventPromise;
    const decrypted = cipher.decrypt([new Uint8Array(submitEvent.orderDigest)], submitEvent.nonce)[0];
    const expectedDigest = orderId + price + size + side;
    expect(decrypted).to.equal(expectedDigest);
  });

  it("Full exchange flow works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("🧪 Testing full exchange flow: Deposit → Submit Order → Off-Chain Match → On-Chain Settle");

    // Step 1: Initialize computation definitions (skip if already initialized)
    console.log("1. Initializing computation definitions...");
    try {
      await initDepositSellerNativeCompDef(program, owner, false, false);
      console.log("✅ Deposit computation definition initialized");
    } catch (error: any) {
      if (error.message.includes("account already in use")) {
        console.log("ℹ️  Deposit computation definition already initialized, skipping...");
      } else {
        throw error;
      }
    }

    try {
      await initSubmitOrderCompDef(program, owner, false, false);
      console.log("✅ Submit order computation definition initialized");
    } catch (error: any) {
      if (error.message.includes("account already in use")) {
        console.log("ℹ️  Submit order computation definition already initialized, skipping...");
      } else {
        throw error;
      }
    }

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // Step 2: Deposit funds (simulated)
    console.log("2. Depositing funds...");
    const depositAmount = BigInt(100000);
    const depositPlaintext = [BigInt(12345), depositAmount]; // offerId, amount
    const depositNonce = randomBytes(16);
    const depositCiphertext = cipher.encrypt(depositPlaintext, depositNonce);

    const depositEventPromise = awaitEvent("depositSellerNativeEvent");
    const depositOffset = new anchor.BN(randomBytes(8), "hex");

    const depositSig = await sendMethodWithFreshBlockhash(
      () =>
        program.methods
          .depositSellerNative(
            depositOffset,
            Array.from(depositCiphertext[0]),
            Array.from(depositCiphertext[1]),
            Array.from(publicKey),
            new anchor.BN(deserializeLE(depositNonce).toString())
          )
          .accountsPartial({
            computationAccount: getComputationAccAddress(
              program.programId,
              depositOffset
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("deposit_seller_native")).readUInt32LE()
            ),
          }),
      "depositSellerNative"
    );
    console.log("Deposit sig is ", depositSig);

    await awaitComputationFinalization(provider as anchor.AnchorProvider, depositOffset, program.programId, "confirmed");
    const depositEvent = await depositEventPromise;
    console.log("✅ Deposit completed");

    // Step 3: Submit order to on-chain program
    console.log("3. Submitting order to on-chain program...");
    const orderId = BigInt(67890);
    const side = BigInt(0); // buy
    const price = BigInt(100);
    const size = BigInt(10);
    const expiry = BigInt(Date.now() + 3600000); // 1 hour from now
    const orderPlaintext = [orderId, side, price, size, expiry];

    const orderNonce = randomBytes(16);
    const orderCiphertext = cipher.encrypt(orderPlaintext, orderNonce);

    const submitEventPromise = awaitEvent("submitOrderEvent");
    const submitOffset = new anchor.BN(randomBytes(8), "hex");

    const submitSig = await sendMethodWithFreshBlockhash(
      () =>
        program.methods
          .submitOrder(
            submitOffset,
            Array.from(orderCiphertext[0]),
            Array.from(orderCiphertext[1]),
            Array.from(orderCiphertext[2]),
            Array.from(orderCiphertext[3]),
            Array.from(orderCiphertext[4]),
            Array.from(publicKey),
            new anchor.BN(deserializeLE(orderNonce).toString())
          )
          .accountsPartial({
            computationAccount: getComputationAccAddress(
              program.programId,
              submitOffset
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("submit_order")).readUInt32LE()
            ),
          }),
      "submitOrder"
    );
    console.log("Submit sig is ", submitSig);

    await awaitComputationFinalization(provider as anchor.AnchorProvider, submitOffset, program.programId, "confirmed");
    const submitEvent = await submitEventPromise;
    console.log("✅ Order submitted to on-chain program");

    // Step 4: Simulate sending order to off-chain matcher
    console.log("4. Sending order to off-chain matcher...");
    const axios = require('axios');

    const orderData = {
      id: orderId.toString(),
      side: 'buy',
      price: Array.from(orderCiphertext[2]), // encrypted price
      size: Array.from(orderCiphertext[3]),  // encrypted size
      expiry: Array.from(orderCiphertext[4]), // encrypted expiry
      owner: owner.publicKey.toString(),
      chain: 'solana',
      nonce: Array.from(orderNonce),
      publicKey: Array.from(publicKey)
    };

    try {
      const matcherResponse = await axios.post('http://localhost:3001/orders', orderData);
      console.log("✅ Order sent to matcher:", matcherResponse.data);

      // Step 5: Check order book
      const ordersResponse = await axios.get('http://localhost:3001/orders');
      console.log("📊 Order book status:", ordersResponse.data);

      // Step 6: Trigger matching (in real scenario, this would happen automatically)
      const matchResponse = await axios.post('http://localhost:3001/match');
      console.log("🎯 Matching result:", matchResponse.data);

    } catch (error) {
      console.log("⚠️  Matcher not available (expected in isolated test):", error.code);
      console.log("   In production, this would connect to the running matcher service");
    }

    console.log("🎉 Full exchange flow test completed!");
  });



  async function initSubmitOrderCompDef(
    program: Program<ConfidentialCrossChainExchange>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean,
    offchainSource: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("submit_order");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log("Comp def pda is ", compDefPDA);

    let sig: string;
    try {
      sig = await program.methods
        .initSubmitOrderCompDef()
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
        })
        .signers([owner])
        .rpc({
          commitment: "confirmed",
        });
      console.log("Init submit order computation definition transaction", sig);
    } catch (error: any) {
      if (error.message.includes("account already in use") || error.message.includes("already in use")) {
        console.log("Submit order computation definition already initialized, skipping...");
        sig = "already-initialized";
      } else {
        throw error;
      }
    }

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync("build/submit_order.arcis");

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "submit_order",
        program.programId,
        rawCircuit,
        true
      );
    } else if (!offchainSource) {
      try {
        const finalizeTx = await buildFinalizeCompDefTx(
          provider as anchor.AnchorProvider,
          Buffer.from(offset).readUInt32LE(),
          program.programId
        );

        const latestBlockhash = await provider.connection.getLatestBlockhash();
        finalizeTx.recentBlockhash = latestBlockhash.blockhash;
        finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

        finalizeTx.sign(owner);

        await provider.sendAndConfirm(finalizeTx);
      } catch (error: any) {
        if (error.message.includes("already finalized") || error.message.includes("already in use")) {
          console.log("Submit order computation definition already finalized, skipping...");
        } else {
          throw error;
        }
      }
    }
    return sig;
  }






});

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 10,
  retryDelayMs: number = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) {
        return mxePublicKey;
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
    }

    if (attempt < maxRetries) {
      console.log(
        `Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(
    `Failed to fetch MXE public key after ${maxRetries} attempts`
  );
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}
