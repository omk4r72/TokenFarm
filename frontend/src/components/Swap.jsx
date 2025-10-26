import React, { useState } from "react";
import StellarSdk from "stellar-sdk";

const Swap = ({ publicKey }) => {
  const [toAsset, setToAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const swapTokens = async () => {
    try {
      setStatus("Building transaction...");

      const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(publicKey);

      const fee = await server.fetchBaseFee();

      let destination = publicKey; // self swap for demo

      const toAssetObj =
        toAsset === "XLM"
          ? StellarSdk.Asset.native()
          : new StellarSdk.Asset(
              toAsset,
              "GA5ZSE7GVUWZJ4ZTLA6KQAF4JPVZQKLE6V7MVSRFB33NYP4T6KBN2P3Y" // USDC testnet issuer
            );

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination,
            asset: toAssetObj,
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      const xdr = transaction.toXDR();

      // Sign via Freighter
      const signedXdr = await window.freighterApi.signTransaction(xdr, {
        network: "TESTNET",
      });

      const tx = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        StellarSdk.Networks.TESTNET
      );

      const result = await server.submitTransaction(tx);
      console.log(result);
      setStatus(`✅ Swap complete! Hash: ${result.hash}`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-md text-center">
      <h2 className="text-2xl font-semibold mb-4 text-blue-400">Swap XLM → Token</h2>

      <p className="text-gray-400 text-sm mb-2">Connected Wallet: {publicKey}</p>

      <div className="flex flex-col space-y-3">
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2 rounded bg-gray-900 border border-gray-700"
        />

        <select
          value={toAsset}
          onChange={(e) => setToAsset(e.target.value)}
          className="p-2 rounded bg-gray-900 border border-gray-700"
        >
          <option value="USDC">USDC</option>
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
          <option value="XLM">XLM</option>
        </select>

        <button
          onClick={swapTokens}
          className="mt-4 bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-semibold"
        >
          Swap Now
        </button>

        <p className="mt-4 text-sm text-gray-300">{status}</p>
      </div>
    </div>
  );
};

export default Swap;
