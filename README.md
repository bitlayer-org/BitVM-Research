# Bitvm-research
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


```
cp .env-tpl .env
```

**REMEMBER to modify the private key**

## Bitvm
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

## SatoishVM
If you want to run the complete process of SatoishVM, you can execute the following command:
```
yarn run start_savm_bit_commitment_tx
```