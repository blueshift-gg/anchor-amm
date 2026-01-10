import { expect } from "chai";
import { LiteSVM } from "litesvm";
import anchor from "@coral-xyz/anchor";
import Idl from "../target/idl/blueshift_anchor_amm.json" with {type: "json"};
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { ACCOUNT_SIZE, AccountLayout, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, MINT_SIZE, MintLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";


describe("LiteSVM", () => {

    const svm = new LiteSVM();
    const programId = new PublicKey(Idl.address);
    const coder = new anchor.BorshCoder(Idl as anchor.Idl);

    const payer = Keypair.generate();
    svm.airdrop(payer.publicKey, BigInt(10 * 10 ** 9));

    const programPath = new URL("../target/deploy/blueshift_anchor_amm.so", import.meta.url).pathname;
    svm.addProgramFromFile(programId, programPath);

    const initializer = Keypair.generate(); //pool initializer
    const authority = Keypair.generate(); // pool authority
    svm.airdrop(authority.publicKey, BigInt(3 * 10 ** 9));
    svm.airdrop(initializer.publicKey, BigInt(3 * 10 ** 9));


    const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    const bonkMint = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
    const poolSeed = new anchor.BN(1);

    const [configPda] = PublicKey.findProgramAddressSync([
        Buffer.from("config"),
        poolSeed.toArrayLike(Buffer, "le", 8),
        usdcMint.toBuffer(),
        bonkMint.toBuffer()
    ], programId);

    const [lpMint] = PublicKey.findProgramAddressSync([
        Buffer.from("lp"),
        configPda.toBuffer()
    ], programId);


    const vaultXAta = getAssociatedTokenAddressSync(usdcMint, configPda, true);
    const vaultYAta = getAssociatedTokenAddressSync(bonkMint, configPda, true);
    const initializerXAta = getAssociatedTokenAddressSync(usdcMint, initializer.publicKey, true);
    const initializerYAta = getAssociatedTokenAddressSync(bonkMint, initializer.publicKey, true);
    const initializerLpAta = getAssociatedTokenAddressSync(lpMint, initializer.publicKey, true);

    const InitializerHaveUsdc = BigInt(1_000_000_000_000);
    const InitializerHaveBonk = BigInt(50_000_000_000);
    const initialAmountX = new anchor.BN(3000 * 10 ** 6); // USDC
    const initialAmountY = new anchor.BN(6000 * 10 ** 6); // BONK
    const poolFee = new anchor.BN(30) // 0.30%



    before("Initialized MINT token", () => {
        const usdcMintAuthority = PublicKey.unique();
        const bonkMintAuthority = PublicKey.unique();

        const usdcMintData = Buffer.alloc(MINT_SIZE);
        const bonkMintData = Buffer.alloc(MINT_SIZE);

        MintLayout.encode(
            {
                mintAuthorityOption: 1,
                mintAuthority: usdcMintAuthority,
                supply: BigInt(0),
                decimals: 6,
                isInitialized: true,
                freezeAuthorityOption: 0,
                freezeAuthority: PublicKey.default,
            },
            usdcMintData
        );

        MintLayout.encode(
            {
                mintAuthorityOption: 1,
                mintAuthority: bonkMintAuthority,
                supply: BigInt(0),
                decimals: 6,
                isInitialized: true,
                freezeAuthorityOption: 0,
                freezeAuthority: PublicKey.default,
            },
            bonkMintData
        );

        svm.setAccount(usdcMint, {
            lamports: 1_000_000_000,
            data: usdcMintData,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
        });

        svm.setAccount(bonkMint, {
            lamports: 1_000_000_000,
            data: bonkMintData,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
        });

        const bonkMintAcct = svm.getAccount(bonkMint);
        const bMintData = bonkMintAcct?.data;
        const bonkDecoded = MintLayout.decode(bMintData);
        expect(bonkMintAcct).to.not.be.null;
        expect(bMintData).to.not.be.undefined;
        expect(bonkDecoded.isInitialized).to.equal(true);
        expect(bonkDecoded.decimals).to.equal(6);

        const usdcMintAcct = svm.getAccount(usdcMint);
        const uMintData = usdcMintAcct?.data;
        const usdcDecoded = MintLayout.decode(uMintData);
        expect(usdcMintAcct).to.not.be.null;
        expect(uMintData).to.not.be.undefined;
        expect(usdcDecoded.isInitialized).to.equal(true);
        expect(usdcDecoded.decimals).to.equal(6);
    });

    before("Initialized ATA (Associated Token Account)", () => {
        const initializerUsdcAccData = Buffer.alloc(ACCOUNT_SIZE);
        const initializerBonkAccData = Buffer.alloc(ACCOUNT_SIZE);

        AccountLayout.encode(
            {
                mint: usdcMint,
                owner: initializer.publicKey,
                amount: InitializerHaveUsdc,
                delegateOption: 0,
                delegate: PublicKey.default,
                delegatedAmount: BigInt(0),
                state: 1, // 1 = Account is initialized (from SPL Token AccountLayout)
                isNativeOption: 0,
                isNative: BigInt(0),
                closeAuthorityOption: 0,
                closeAuthority: PublicKey.default,
            },
            initializerUsdcAccData,
        );

        svm.setAccount(initializerXAta, {
            lamports: 1_000_000_000,
            data: initializerUsdcAccData,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
        });

        AccountLayout.encode(
            {
                mint: bonkMint,
                owner: initializer.publicKey,
                amount: InitializerHaveBonk,
                delegateOption: 0,
                delegate: PublicKey.default,
                delegatedAmount: BigInt(0),
                state: 1,
                isNativeOption: 0,
                isNative: BigInt(0),
                closeAuthorityOption: 0,
                closeAuthority: PublicKey.default,
            },
            initializerBonkAccData,
        );

        svm.setAccount(initializerYAta, {
            lamports: 1_000_000_000,
            data: initializerBonkAccData,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
        });

        const InitializerRawAccountX = svm.getAccount(initializerXAta);
        const initializerDecoded = AccountLayout.decode(InitializerRawAccountX?.data);
        const InitializerRawAccountY = svm.getAccount(initializerYAta);
        const initializerDecodedY = AccountLayout.decode(InitializerRawAccountY?.data);

        expect(InitializerRawAccountX, "Initializer's ATA should exist after mint/ATA setup").to.not.be.null;
        expect(initializerDecoded.amount, "Maker's ATA should hold the correct initial USDC amount").to.eql(InitializerHaveUsdc);
        expect(InitializerRawAccountY, "Taker's ATA should exist after mint/ATA setup").to.not.be.null;
        expect(initializerDecodedY.amount, "Taker's ATA should hold the correct initial USDC amount").to.eql(InitializerHaveBonk);
    });

    it("Initialize pool", () => {
        const ixArgs = {
            seed: poolSeed,
            authority: authority.publicKey,
            fee: poolFee,
            init_amount_x: initialAmountX,
            init_amount_y: initialAmountY

        };

        const data = coder.instruction.encode("initialize", ixArgs);
        const ix = new TransactionInstruction({
            keys: [
                { pubkey: initializer.publicKey, isWritable: true, isSigner: true },
                { pubkey: usdcMint, isWritable: false, isSigner: false },
                { pubkey: bonkMint, isWritable: false, isSigner: false },
                { pubkey: lpMint, isWritable: true, isSigner: false },
                { pubkey: vaultXAta, isWritable: true, isSigner: false },
                { pubkey: vaultYAta, isWritable: true, isSigner: false },
                { pubkey: initializerXAta, isWritable: true, isSigner: false },
                { pubkey: initializerYAta, isWritable: true, isSigner: false },
                { pubkey: initializerLpAta, isWritable: true, isSigner: false },
                { pubkey: configPda, isWritable: true, isSigner: false },
                { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
                { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
                { pubkey: TOKEN_2022_PROGRAM_ID, isWritable: false, isSigner: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isWritable: false, isSigner: false }
            ],
            programId,
            data
        })

        const tx = new Transaction().add(ix);
        tx.feePayer = initializer.publicKey;
        tx.recentBlockhash = svm.latestBlockhash();
        tx.sign(initializer);
        svm.sendTransaction(tx);

        const configAccInfo = svm.getAccount(configPda);
        const config = coder.accounts.decode("Config", Buffer.from(configAccInfo.data));

        expect(config.seed.toString(), "Config 'seed' should match initial poolSeed")
            .to.equal(poolSeed.toString());
        expect(config.authority.toBase58(), "Config 'authority' should match pool authority")
            .to.equal(authority.publicKey.toBase58());
        expect(config.mint_x.toBase58(), "Config 'mint_x' should match USDC mint")
            .to.equal(usdcMint.toBase58());
        expect(config.mint_y.toBase58(), "Config 'mint_y' should match BONK mint")
            .to.equal(bonkMint.toBase58());
        expect(config.fee, "Config 'fee' should match input poolFee")
            .to.equal(Number(poolFee));
        expect(config.lp_bump, "Config 'lp_bump' should be a number").to.be.a("number");
        expect(config.bump, "Config 'bump' should be a number").to.be.a("number");
        expect(config.locked, "Config 'locked' should be a boolean").to.be.a("boolean");
        expect(config.locked, "Config 'locked' should default to false").to.be.false;
        expect(config.lp_bump).to.be.a("number");
        expect(config.bump).to.be.a("number");
    })
});

