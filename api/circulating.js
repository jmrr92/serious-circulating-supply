const MINT = "H6qnGp5anYgMJYAaPXKSqKVYa6mKDrn1ruAeK5Dmbonk";
const BUYBACK_WALLET = "D9FXcMojKz4HLtjWVJX25dK2QDE5mt6sPSSd3FXFoAQC";
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=93cda123-5b97-4689-a10a-c4f5859a5df4";

async function rpc(id, method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method} error: ${JSON.stringify(data.error)}`);
  return data.result;
}

async function getCirculatingSupply() {
  const supplyResult = await rpc(1, 'getTokenSupply', [MINT]);
  const total = parseFloat(supplyResult.value.uiAmountString);

  const ataResult = await rpc(2, 'getTokenAccountsByOwner', [
    BUYBACK_WALLET,
    { mint: MINT },
    { encoding: 'jsonParsed' }
  ]);

  let buyback = 0;
  if (ataResult.value.length > 0) {
    const ata = ataResult.value[0].pubkey;
    const balResult = await rpc(3, 'getTokenAccountBalance', [ata]);
    buyback = parseFloat(balResult.value.uiAmountString);
  }

  const circulating = total - buyback;
  return {
    mint: MINT,
    totalSupply: total,
    buybackWallet: BUYBACK_WALLET,
    buybackBalance: buyback,
    circulatingSupply: circulating,
    buybackPercentage: total > 0 ? ((buyback / total) * 100).toFixed(2) + '%' : '0%'
  };
}

module.exports = async function handler(req, res) {
  try {
    const data = await getCirculatingSupply();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
