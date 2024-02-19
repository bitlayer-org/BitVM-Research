import axios, { AxiosResponse } from "axios";

const blockstream = new axios.Axios({
  baseURL: `https://blockstream.info/testnet/api`,
});

export async function waitUntilUTXO(address: string, minValue?: number) {
  return new Promise<IUTXO[]>((resolve, reject) => {
    let intervalId: any;
    const checkForUtxo = async () => {
      try {
        const response: AxiosResponse<string> = await blockstream.get(
          `/address/${address}/utxo`,
        );
        const data: IUTXO[] = response.data
          ? JSON.parse(response.data)
          : undefined;
        console.log(`unspent utxos:`, data);
        if (data.length > 0) {
          if (minValue !== undefined) {
            const utxo = data.find((utxo) => utxo.value >= minValue);
            if (utxo) {
              resolve([utxo]);
              clearInterval(intervalId);
            }
          } else {
            resolve(data);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        reject(error);
        clearInterval(intervalId);
      }
    };
    intervalId = setInterval(checkForUtxo, 10000);
  });
}

export async function broadcast(txHex: string) {
  const response: AxiosResponse<string> = await blockstream.post("/tx", txHex);
  return response.data;
}

interface IUTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}
