import React, { useState, useEffect } from "react";
import "./App.css";
import BlockchainBackground from "./BlockchainBackground";
import { Line } from "react-chartjs-2";
import { FaCheckCircle } from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const BASE_RESERVE = 0.5;
const HORIZON_URL = "https://horizon-testnet.stellar.org";

// Conversion rates: XLM → token
const TOKEN_RATES = {
  STELLAR: 1,      // 1 XLM = 1 STELLAR
  USDC: 0.5,       // 1 XLM = 0.5 USDC
  BTC: 0.00005,    // 1 XLM = 0.00005 BTC
  ETH: 0.001,      // 1 XLM = 0.001 ETH
  SOL: 0.02        // 1 XLM = 0.02 SOL
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [balances, setBalances] = useState({});
  const [nativeBalance, setNativeBalance] = useState(0);
  const [subentryCount, setSubentryCount] = useState(0);
  const [manualKey, setManualKey] = useState("");
  const [ledger, setLedger] = useState([]);
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapFrom, setSwapFrom] = useState("");
  const [swapTo, setSwapTo] = useState("");
  const [apy, setApy] = useState(null);
  const [rewards, setRewards] = useState([0, 10, 25, 40, 60, 80, 100]);
  const [toasts, setToasts] = useState([]);

  const demoTokens = ["STELLAR", "USDC", "BTC", "ETH", "SOL"];

  const minReserve = (2 + (subentryCount || 0)) * BASE_RESERVE;
  const totalNative = Number(nativeBalance || 0);
  const reservedBalance = Number(minReserve.toFixed(7));
  const stakedXLM = Object.keys(balances)
    .filter((k) => k.endsWith("_STAKED"))
    .reduce((sum, k) => sum + Number(balances[k]), 0);
  const availableNative = Number(Math.max(0, totalNative - reservedBalance - stakedXLM).toFixed(7));

  const showToast = (message, type = "info", ttl = 4500) => {
    const id = Date.now() + Math.random();
    const t = { id, type, message };
    setToasts((s) => [t, ...s].slice(0, 6));
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), ttl);
  };

  const fetchAccountInfo = async (publicKey) => {
    try {
      const resp = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
      if (!resp.ok) throw new Error(`Horizon fetch failed: ${resp.status}`);
      const data = await resp.json();
      const parsed = {};
      let native = 0;
      data.balances.forEach((b) => {
        if (b.asset_type === "native") native = parseFloat(b.balance);
      });

      parsed["STELLAR"] = 0; // staked balances handled separately
      parsed["USDC"] = parsed["USDC"] ?? 0;
      parsed["BTC"] = parsed["BTC"] ?? 0;
      parsed["ETH"] = parsed["ETH"] ?? 0;
      parsed["SOL"] = parsed["SOL"] ?? 0;

      setBalances(parsed);
      setNativeBalance(native || 10000);
      setSubentryCount(data.subentry_count || 0);

      if (!selectedToken) setSelectedToken("STELLAR");
      if (!swapFrom) setSwapFrom("STELLAR");
      if (!swapTo) setSwapTo("USDC");

      showToast("Account balances loaded", "success");
    } catch (err) {
      showToast("Failed to fetch account info: " + err.message, "error");
    }
  };

  const connectFreighter = async () => {
    if (window.freighterApi) {
      try {
        const pk = await window.freighterApi.getPublicKey();
        setWalletAddress(pk);
        await fetchAccountInfo(pk);
        showToast("Freighter connected", "success");
      } catch (err) {
        showToast("Freighter connect failed: " + err.message, "error");
      }
    } else showToast("Freighter not detected. Use manual key.", "error");
  };

  const connectManual = () => {
    if (!manualKey || !manualKey.startsWith("G")) {
      showToast("Paste a valid Stellar public key (starts with G...)", "error");
      return;
    }
    setWalletAddress(manualKey);
    fetchAccountInfo(manualKey);
    showToast("Manual key connected", "success");
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setBalances({});
    setNativeBalance(0);
    setSwapAmount("");
    setAmount("");
    showToast("Disconnected", "info");
  };

  const refreshBalances = () => {
    if (!walletAddress) return showToast("Connect wallet first", "error");
    fetchAccountInfo(walletAddress);
  };

  const addLedgerEntry = (action, token, amount, txHash = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLedger((prev) => [{ action, token, amount, timestamp, txHash }, ...prev]);
  };

  const handleStake = () => {
    if (!walletAddress) return showToast("Connect wallet first", "error");
    const amt = Number(amount);
    if (!amt || amt <= 0) return showToast("Enter valid amount", "error");

    const xlmCost = amt / (TOKEN_RATES[selectedToken] || 1);
    if (xlmCost > availableNative) return showToast("Insufficient available XLM to stake", "error");

    const txHash = Math.random().toString(36).substring(2, 10).toUpperCase();

    setBalances((prev) => ({
      ...prev,
      [selectedToken + "_STAKED"]: Number(((prev[selectedToken + "_STAKED"] || 0) + amt).toFixed(7))
    }));
    setNativeBalance((prev) => Number((prev - xlmCost).toFixed(7)));

    addLedgerEntry("Stake", selectedToken, amt, txHash);
    setAmount("");
    calculateAPY();
    showToast(`Staked ${amt} ${selectedToken} (cost ${xlmCost.toFixed(7)} XLM)`, "success");
  };

  const handleSwap = () => {
    if (!walletAddress) return showToast("Connect wallet first", "error");
    if (swapFrom === swapTo) return showToast("Cannot swap same token", "error");

    const amt = Number(swapAmount);
    if (!amt || amt <= 0) return showToast("Enter valid swap amount", "error");
    if ((balances[swapFrom] || 0) < amt) return showToast("Insufficient balance for swap", "error");

    const xlmEquivalent = amt / (TOKEN_RATES[swapFrom] || 1);
    const received = +(xlmEquivalent * (TOKEN_RATES[swapTo] || 1) * 0.95).toFixed(7);
    const txHash = Math.random().toString(36).substring(2, 10).toUpperCase();

    setBalances((prev) => ({
      ...prev,
      [swapFrom]: Number((prev[swapFrom] - amt).toFixed(7)),
      [swapTo]: Number(((prev[swapTo] || 0) + received).toFixed(7))
    }));

    addLedgerEntry("Swap", `${swapFrom} → ${swapTo}`, amt, txHash);
    setSwapAmount("");
    showToast(`Swapped ${amt} ${swapFrom} → ${received} ${swapTo}`, "success");
  };

  const calculateAPY = () => {
    const base = { USDC: 0.05, STELLAR: 0.08, BTC: 0.04, ETH: 0.06, SOL: 0.07 };
    const stakeAmt = Number(amount || 0);
    if (!stakeAmt) {
      setApy(null);
      return;
    }
    setApy((stakeAmt * (base[selectedToken] || 0)).toFixed(6));
  };

  useEffect(() => {
    const id = setInterval(() => {
      setRewards((prev) => prev.map((v) => +(v + Math.random() * 2).toFixed(2)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const chartData = {
    labels: ["0s", "5s", "10s", "15s", "20s", "25s", "30s"],
    datasets: [
      {
        label: "Estimated Rewards",
        data: rewards,
        borderColor: "#00f0ff",
        backgroundColor: "rgba(0,240,255,0.12)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#ddd" } } },
    scales: { x: { ticks: { color: "#bbb" } }, y: { ticks: { color: "#bbb" } } },
  };

  return (
    <div className="app">
      <BlockchainBackground />
      <div className="container">
        <h1>TokenFarm </h1>

        <div className="wallet-section">
          {!walletAddress ? (
            <>
              <button onClick={connectFreighter} className="connect-btn">Connect Freighter</button>
              <input
                type="text"
                className="manual-input"
                placeholder="Manual Stellar Key (G... )"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
              />
              <button onClick={connectManual} className="connect-btn">Connect Manual</button>
            </>
          ) : (
            <>
              <p className="connected">
                <FaCheckCircle className="green-tick" /> Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
              </p>
              <button onClick={refreshBalances} className="connect-btn">Refresh Balances</button>
              <button onClick={disconnectWallet} className="connect-btn">Disconnect</button>
            </>
          )}
        </div>

        {walletAddress && (
          <>
            <div className="account-summary">
              <div className="asset-row main">
                <div className="asset-left">
                  <div className="asset-icon">XLM</div>
                  <div className="asset-meta">
                    <div>Stellar (XLM)</div>
                    <div>Network: Testnet</div>
                  </div>
                </div>
                <div className="asset-right">
                  <div className="asset-balance">{totalNative.toFixed(7)} XLM</div>
                  <div className="asset-value">Value: --</div>
                </div>
              </div>

              <div className="summary-stats">
                <div className="stat">
                  <div className="stat-label">Total Balance</div>
                  <div className="stat-value">{totalNative.toFixed(7)} XLM</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Minimum Reserve</div>
                  <div className="stat-value">{reservedBalance} XLM</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Staked</div>
                  <div className="stat-value">{stakedXLM.toFixed(7)} XLM</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Available</div>
                  <div className="stat-value">{availableNative} XLM</div>
                </div>
              </div>
            </div>

            <div className="stake-section">
              <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
                {demoTokens.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={calculateAPY}
                max={availableNative}
              />
              <button onClick={handleStake} disabled={amount > availableNative}>Stake</button>
            </div>

            <div className="stake-section">
              <select value={swapFrom} onChange={(e) => setSwapFrom(e.target.value)}>
                {demoTokens.map((t) => (<option key={t}>{t}</option>))}
              </select>
              <span className="arrow">→</span>
              <select value={swapTo} onChange={(e) => setSwapTo(e.target.value)}>
                {demoTokens.map((t) => (<option key={t}>{t}</option>))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                max={balances[swapFrom] || 0}
              />
              <button onClick={handleSwap} disabled={swapAmount > (balances[swapFrom] || 0)}>Swap</button>
            </div>

            <div className="chart-section">
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="ledger-section">
              <h3>Recent Activity</h3>
              <div className="ledger-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Token/Note</th>
                      <th>Amount</th>
                      <th>TxHash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.slice(0, 8).map((row, i) => (
                      <tr key={i}>
                        <td>{row.timestamp}</td>
                        <td>{row.action}</td>
                        <td>{row.token}</td>
                        <td>{row.amount}</td>
                        <td>
                          {row.txHash ? (
                            <a href={`https://stellar.expert/explorer/testnet/tx/${row.txHash}`} target="_blank" rel="noopener noreferrer">
                              {row.txHash}
                            </a>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", opacity: 0.7 }}>No activity yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-msg">{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
