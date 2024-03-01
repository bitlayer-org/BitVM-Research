# BitVM-Research
## Overview
Currently, this repository has implemented the complete processes of BitVM, which can help you understand them faster.

## Article link

https://bitlayerlabs.notion.site/Experiment-of-BitVM-White-Paper-ef87e719001e4e2d83765c68f1bb8443

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
https://faucet.bitvmcn.xyz/
https://testnet.help/en/btcfaucet/testnet#log
https://coinfaucet.eu/en/
https://bitcoinfaucet.uo1.net/send.php
```

### BitVM
If you want to run the normal process of BitVM, you can execute the following command:
```
yarn run start_process_trace
```
If you want to run the case where the Prover is penalized for equivocation in BitVM, you can execute the following command:
```
yarn run start_process_trace_with_equivocation
```
If you want to execute a single bitvalue_commitment in BitVM, you can run the following command:
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


