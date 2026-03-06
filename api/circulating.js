const MINT = "H6qnGp5anYgMJYAaPXKSqKVYa6mKDrn1ruAeK5Dmbonk";
const BUYBACK_WALLET = "D9FXcMojKz4HLtjWVJX25dK2QDE5mt6sPSSd3FXFoAQC";
const RPC_URL = "https://api.mainnet-beta.solana.com";

async function getCirculatingSupply() {
  // Total supply
  const totalRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getTokenSupply',
      params: [MINT, { encoding: 'jsonParsed' }]
    })
  });
  const totalData = await totalRes.json();
  const total = parseFloat(totalData.result?.value?.uiAmount || 0);

  // ATA buyback
  const ataRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 2,
      method: 'getTokenAccountsByOwner',
      params: [BUYBACK_WALLET, {
        mint: MINT,
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
      }, { encoding: 'jsonParsed' }]
    })
  });
  const ataData = await ataRes.json();
  let buyback = 0;
  if (ataData.result?.value?.length > 0) {
    const balanceRes = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 3,
        method: 'getTokenAccountBalance',
        params: [ataData.result.value[0].pubkey]
      })
    });
    const balanceData = await balanceRes.json();
    buyback = parseFloat(balanceData.result?.value?.uiAmount || 0);
  }

  const circulating = total - buyback;
  return {
    mint: MINT,
    totalSupply: total,
    buybackBalance: buyback,
    circulatingSupply: circulating,
    buybackPercentage: total > 0 ? ((buyback / total) * 100).toFixed(2) + '%' : '0%'
  };
}

export default async function handler(req, res) {
  try {
    const data = await getCirculatingSupply();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
