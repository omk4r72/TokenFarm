import { buildUnsigned, signWithFreighter, submitSigned } from './api.js';

const walletStatus = document.getElementById('walletStatus');
const connectBtn = document.getElementById('connectBtn');
const stakeBtn = document.getElementById('stakeBtn');
const claimBtn = document.getElementById('claimBtn');
const amountInput = document.getElementById('amount');
const poolSelectContainer = document.getElementById('poolSelectContainer');
const selectedDiv = poolSelectContainer.querySelector('.selected');
const optionsDiv = poolSelectContainer.querySelector('.options');
const apyValue = document.getElementById('apyValue');
const rewardsList = document.getElementById('rewardsList');
const resultDiv = document.getElementById('result');
const txTableBody = document.querySelector('#txHistory tbody');
const dashboardTableBody = document.querySelector('#dashboardTable tbody');
const proposalSelect = document.getElementById('proposalSelect');
const voteBtn = document.getElementById('voteBtn');
const voteResultsDiv = document.getElementById('voteResults');

let connectedPublicKey = null;
let selectedPool = null;
let rewards = {};
let totalStaked = {};
let txHistory = [];
let voteCounts = { proposal1: 0, proposal2: 0 };

const pools = [
  { id:'pool1', name:'USDC', apy:12, icon:'https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024' },
  { id:'pool2', name:'STELLAR', apy:8, icon:'https://cryptologos.cc/logos/stellar-xlm-logo.png?v=024' },
  { id:'pool3', name:'XYZ Token', apy:15, icon:'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=024' },
];
pools.forEach(p => {
    rewards[p.id]=0;
    totalStaked[p.id]=0;
});

// DAO proposals
const proposals = ['Increase Pool Rewards','Add New Pool'];
proposals.forEach((p,i)=>{
  const opt = document.createElement('option');
  opt.value='proposal'+(i+1); 
  opt.textContent=p;
  proposalSelect.appendChild(opt);
});

// Populate token dropdown
pools.forEach(p => {
    const div = document.createElement('div');
    div.className = 'option';
    div.innerHTML = `<img src="${p.icon}" alt="${p.name}"> ${p.name}`;
    div.addEventListener('click', () => {
        selectedPool = p.id;
        selectedDiv.innerHTML = `<img src="${p.icon}" alt="${p.name}"> ${p.name}`;
        poolSelectContainer.classList.remove('active');
        updateAPY();
    });
    optionsDiv.appendChild(div);
});
selectedDiv.addEventListener('click', () => poolSelectContainer.classList.toggle('active'));

// Chart setup
const ctx = document.getElementById('rewardsChart').getContext('2d');
const rewardsChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: pools.map(p=>p.name),
        datasets: [{
            label: 'Rewards',
            data: pools.map(p=>rewards[p.id]),
            backgroundColor: ['#00ff9d','#00c0ff','#ff4e50']
        }]
    },
    options: { responsive:true, scales: { y: { beginAtZero:true } } }
});

// Utility functions
function updateAPY() {
    if(!selectedPool) return;
    const pool = pools.find(p=>p.id===selectedPool);
    const stakeAmt = parseFloat(amountInput.value)||0;
    const estimated = (stakeAmt*(pool.apy/100/12)).toFixed(2);
    apyValue.textContent = `${pool.apy}% (Est. ${estimated})`;
}

function updateRewards() {
    rewardsList.innerHTML='';
    pools.forEach(p=>{
        const li = document.createElement('li');
        li.textContent=`${p.name}: ${rewards[p.id].toFixed(2)}`;
        rewardsList.appendChild(li);
    });
    rewardsChart.data.datasets[0].data = pools.map(p=>rewards[p.id]);
    rewardsChart.update();
}

function updateTxHistory() {
    txTableBody.innerHTML='';
    txHistory.slice(-5).reverse().forEach(tx=>{
        const tr = document.createElement('tr');
        tr.innerHTML=`<td>${pools.find(p=>p.id===tx.pool).name}</td><td>${tx.amount}</td><td>${tx.status}</td>`;
        txTableBody.appendChild(tr);
    });
}

// 🧮 Live Dashboard Update
function updateDashboard() {
    dashboardTableBody.innerHTML='';
    pools.forEach(p=>{
        const monthlyReward = (totalStaked[p.id] * (p.apy/100/12)).toFixed(2);
        const tr = document.createElement('tr');
        tr.innerHTML=`
            <td><img src="${p.icon}" width="20"> ${p.name}</td>
            <td>${totalStaked[p.id].toFixed(2)}</td>
            <td>${p.apy}%</td>
            <td>${monthlyReward}</td>`;
        dashboardTableBody.appendChild(tr);
    });
}

function updateVoteResults() {
    voteResultsDiv.innerHTML='';
    Object.keys(voteCounts).forEach(p=>{
        const div = document.createElement('div');
        div.textContent=`${p}: ${voteCounts[p]} votes`;
        voteResultsDiv.appendChild(div);
    });
}

// Connect wallet
connectBtn.addEventListener('click', ()=>{
  const pk = prompt('Paste your public key for demo','GAALM4XW42RQLII4XWGQCS4AIKEHRFTGKQ5NN7CFFQEW53454DYSQ7CN');
  if(pk){ connectedPublicKey=pk; walletStatus.textContent='Connected'; walletStatus.classList.add('connected'); }
});

// Stake
stakeBtn.addEventListener('click', async ()=>{
  if(!connectedPublicKey || !selectedPool) return alert('Connect wallet & select a token first!');
  const pool = selectedPool;
  const amount = parseFloat(amountInput.value)||0;
  resultDiv.textContent='Building unsigned transaction...';
  const build = await buildUnsigned('stake', amount, pool, connectedPublicKey);
  resultDiv.textContent='Signing...';
  const signed = await signWithFreighter(build.unsigned_xdr, build.network_passphrase);
  resultDiv.textContent='Submitting...';
  const submit = await submitSigned(signed);
  if(submit.ok){
    resultDiv.textContent=`✅ Success! TX hash: ${submit.hash}`;
    rewards[pool] += (amount*(pools.find(p=>p.id===pool).apy/100/12));
    totalStaked[pool] += amount;
    txHistory.push({pool,amount,status:'Success'});
    updateRewards(); updateTxHistory(); updateDashboard();
  }else{
    resultDiv.textContent=`❌ Submission failed: ${JSON.stringify(submit)}`;
    txHistory.push({pool,amount,status:'Failed'});
    updateTxHistory();
  }
});

// Claim
claimBtn.addEventListener('click', ()=>{
  alert('Rewards claimed (demo only)');
  Object.keys(rewards).forEach(k=>rewards[k]=0);
  updateRewards(); updateDashboard();
});

// DAO Voting
voteBtn.addEventListener('click', ()=>{
  if(!selectedPool) return alert('Select token first!');
  const v = proposalSelect.value;
  const weight = totalStaked[selectedPool] || 1;
  voteCounts[v] += weight;
  updateVoteResults();
});

amountInput.addEventListener('input', updateAPY);
