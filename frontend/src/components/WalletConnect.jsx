import React from "react";

const WalletConnect = ({ setPublicKey }) => {
  const connectWallet = async () => {
    if (!window.freighterApi) {
      alert("Freighter Wallet not detected! Install it from https://www.freighter.app");
      return;
    }

    try {
      const pubKey = await window.freighterApi.getPublicKey();
      setPublicKey(pubKey);
      alert(`Wallet Connected: ${pubKey}`);
    } catch (error) {
      console.error(error);
      alert("Failed to connect wallet!");
    }
  };

  return (
    <div className="text-center">
      <p className="mb-4">Connect your Freighter Wallet to start swapping tokens.</p>
      <button
        onClick={connectWallet}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
      >
        Connect Freighter Wallet
      </button>
    </div>
  );
};

export default WalletConnect;
