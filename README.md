# BitVM-research
## Overview
Currently, this repository has implemented the complete processes of Bitvm and SatoishVM, which can help you understand them faster.

## Usage

* node version
> use nvm to switch node version
```
nvm install v12.22.9
nvm use v12.22.9
```

* .env file

***REMEMBER* to modify the private key**

```
cp .env-tpl .env
```

testnet faucet:
```
https://testnet.help/en/btcfaucet/testnet#log
https://coinfaucet.eu/en/
https://bitcoinfaucet.uo1.net/send.php
```

### Bitvm
If you want to run the normal process of Bitvm, you can execute the following command:
```
yarn run start_process_trace
```
If you want to run the case where the Prover is penalized for equivocation in Bitvm, you can execute the following command:
```
yarn run start_process_trace_with_equivocation
```
If you want to execute a single bitvalue_commitment in bitvm, you can run the following command:
```
yarn run start_bitvm_bitvalue_commitment
```
If you want to execute a single NAND_gate in bitvm, you can run the following command:
```
yarn run start_bitvm_NAND_gate
```

#### Transfer sats to the taproot address corresponding to the program

When you meeting `Waiting till UTXO is detected at addr: tb1pqnvkahjv98sl9m28mpyhejx23jequp4ehvsy844yrd6au8q88hxquk3zxl`,
you need to transfer some satoishs to this account.

The consumption of each transaction is 250 Sats.

The consumption of programs: 
start_process_trace: 2000 sats. 
start_process_trace_with_equivocation: 2500 sats
start_bitvm_nand_gate: 500 sats
start_bitvm_bitvalue_commitment: 500 sats


## SatoishVM
If you want to run the complete process of SatoishVM, you can execute the following command:
```
yarn run start_savm_bit_commitment_tx
```

#### Transfer sats to the taproot address corresponding to the program

When you meeting `Waiting till UTXO is detected at addr: tb1pqnvkahjv98sl9m28mpyhejx23jequp4ehvsy844yrd6au8q88hxquk3zxl`,
you need to transfer some satoishs to this account.

start_savm_bit_commitment_tx: 750 sats.

