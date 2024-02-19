import {
  initEccLib,
  networks,
  script,
  Signer,
  payments,
  crypto,
  Psbt,
} from "bitcoinjs-lib";
import { broadcast, waitUntilUTXO } from "./blockstream_utils";
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface } from "ecpair";
import { Taptree, Tapleaf } from "bitcoinjs-lib/src/types";
import { witnessStackToScriptWitness } from "./witness_stack_to_script_witness";

const tinysecp: TinySecp256k1Interface = require("tiny-secp256k1");
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.testnet;

import {
  bitvm_NAND_gate,
  bitvm_bitvalue_commitment,
  bitvm_bitvalue_commitment_with_sig,
  process_trace_with_equivocation,
  process_trace
} from "./bitvm"

import {
  toXOnly
} from "./utils";
import { exit } from "process";

async function start(args:string[]) {
  // const keypair = ECPair.makeRandom({ network });
  // const keypair = ECPair.fromWIF("cPjFHxt8kDNjxheAYbyCkHaecbUE67Jy6XZjfG8cJoFANvCfyQF9",network);
  const keypair = ECPair.fromPrivateKey(
    Buffer.from(
      "40122b41f42eefb4989f9563f1d21688f69d74048cbb92e396ac4c7c6d30b2ab",
      "hex",
    ),
    { network },
  );

  // 根据参数执行相应的函数
  switch (args[0]) {
    case 'start_taptree':
      await start_taptree(keypair);
      break;
    case 'start_taptree_p2pk_script':
      await start_taptree_p2pk_script(keypair);
      break;
    case 'start_taptree_hash_lock_script':
      await start_taptree_hash_lock_script(keypair);
      break;
    case 'start_p2pktr':
      await start_p2pktr(keypair);
      break;
    case 'process_trace_with_equivocation':
      await process_trace_with_equivocation(keypair);
      break;
    case 'process_trace':
      await process_trace(keypair);
      break;
    case 'NAND_gate':
      await bitvm_NAND_gate(keypair);
    case 'bitvm_bitvalue_commitment':
      await bitvm_bitvalue_commitment(keypair);
    case 'bitvm_bitvalue_commitment_with_sig':
      await bitvm_bitvalue_commitment_with_sig(keypair);
    default:
      console.log('No function is executed. Please specify a function to run (A, B, C, or D).');
  }
}
// 获取命令行参数
const args = process.argv.slice(2);
start(args).then(()=>exit());

// // Notice & Todo: If a leaf of a tree has been revealed in a previous round, it cannot be used as a leaf of the challenge taproot tree to
// // prevent Prover from deliberately reusing the leaf to unlock the Response Taproot Tree.
// function construct_challenge_taptree(
//   gate_1_hash_lock_script: string,
//   gate_2_hash_lock_script: string,
//   gate_3_hash_lock_script: string,
// ) {
//   const parity_tree: Taptree = [
//     {
//       output: script.fromASM(gate_1_hash_lock_script),
//     },
//     {
//       output: script.fromASM(gate_2_hash_lock_script),
//     },
//   ];

//   const challenge_taproot_tree: Taptree = [
//     parity_tree,
//     { output: script.fromASM(gate_3_hash_lock_script) },
//   ];
//   return challenge_taproot_tree;
// }

// function construct_response_taptree(
//   script1: string,
//   script2: string,
//   script3: string,
// ) {
//   const response_tree: Taptree = [
//     {
//       output: script.fromASM(script1),
//     },
//     {
//       output: script.fromASM(script2),
//     },
//   ];

//   const response_taproot_tree: Taptree = [
//     response_tree,
//     { output: script.fromASM(script3) },
//   ];
//   return response_taproot_tree;
// }

// function construct_scripts_taptree(script_list: string[]): Taptree {
//   let leaves = convert_script_to_tapnode(script_list);
//   let next_layer_nodes: Taptree[] = leaves;
//   while (true) {
//     next_layer_nodes = construct_taptree_one_layer(next_layer_nodes);
//     if (next_layer_nodes.length == 1) {
//       break;
//     }
//   }
//   return next_layer_nodes[0];
// }

// function convert_script_to_tapnode(script_list: string[]): Taptree[] {
//   const leaves = script_list.map((value, index, array) => {
//     let leaf: Taptree = { output: script.fromASM(value) };
//     return leaf;
//   });
//   return leaves;
// }

// function construct_taptree_one_layer(script_list: Taptree[]): Taptree[] {
//   const next_layer_nodes: Taptree[] = [];
//   const leaves = script_list.forEach((value, index, array) => {
//     // Notice: the program no consider the specific case that array length equals to 1,
//     // which maybe leading to loop forever when constructing taptree
//     if (index + 1 == array.length && index % 2 == 0) {
//       next_layer_nodes.push(value);
//       return value;
//     }
//     if (index % 2 != 0) {
//       const next_layer_node: Taptree = [value, array[index - 1]];
//       next_layer_nodes.push(next_layer_node);
//     }
//     return value;
//   });
//   return next_layer_nodes;
// }
// function generate_hash_lock_script(hash: Buffer): string {
//   const script = `OP_HASH160 ${hash.toString("hex")} OP_EQUALVERIFY`;
//   return script;
// }

// function generate_equivocation_script(hash0: Buffer, hash1: Buffer): string {
//   // the verifier can unlock the utxo when he has the two preimage for hash1 and hash0
//   // the input is [preimage0, preimage1]
//   const bitvalue_script_asm = `OP_HASH160 ${hash1.toString(
//     "hex",
//   )} OP_EQUALVERIFY OP_HASH160 ${hash0.toString("hex")} OP_EQUALVERIFY OP_1`;
//   return bitvalue_script_asm;
// }

// function generate_bitcommitment_script(hash0: Buffer, hash1: Buffer): string {
//   const bitvalue_script_asm = `OP_IF OP_HASH160 ${hash1.toString(
//     "hex",
//   )} OP_EQUALVERIFY OP_1 OP_ELSE OP_HASH160 ${hash0.toString(
//     "hex",
//   )} OP_EQUALVERIFY OP_0 OP_ENDIF`;
//   return bitvalue_script_asm;
// }

// function generate_NAND_gate_script(
//   left_operator_0_hash: Buffer,
//   left_operator_1_hash: Buffer,
//   right_operator_0_hash: Buffer,
//   right_operator_1_hash: Buffer,
//   result_0_hash: Buffer,
//   result_1_hash: Buffer,
// ): string {
//   const C_bitvalue_script = generate_bitcommitment_script(
//     result_0_hash,
//     result_1_hash,
//   );
//   const B_bitvalue_script = generate_bitcommitment_script(
//     right_operator_0_hash,
//     right_operator_1_hash,
//   );
//   const A_bitvalue_script = generate_bitcommitment_script(
//     left_operator_0_hash,
//     left_operator_1_hash,
//   );
//   const complete_script_asm = `${C_bitvalue_script} OP_TOALTSTACK ${B_bitvalue_script} OP_TOALTSTACK ${A_bitvalue_script} OP_FROMALTSTACK OP_BOOLAND OP_NOT OP_FROMALTSTACK OP_EQUALVERIFY OP_1`;
//   return complete_script_asm;
// }

// function one_round_challenge_and_response(
//   gate_hash_lock_script: string,
//   challenge_tree: Taptree,
//   gate_hashlock_and_gate_script: string,
//   response_taptree: Taptree,
//   keypair: Signer,
// ) {
//   // send the challenge NAND2 transaction
//   const challenge_script_redeem = {
//     output: script.fromASM(gate_hash_lock_script),
//     redeemVersion: 192,
//   };

//   const challenge_p2tr = payments.p2tr({
//     internalPubkey: toXOnly(keypair.publicKey),
//     scriptTree: challenge_tree,
//     redeem: challenge_script_redeem,
//     network,
//   });
//   // prover can response the challenge by entering the preimage
//   // which can be found from the and reveal the input and output for the NAND gate
//   const response_script_redeem = {
//     output: script.fromASM(gate_hashlock_and_gate_script),
//     redeemVersion: 192,
//   };

//   const response_p2tr = payments.p2tr({
//     internalPubkey: toXOnly(keypair.publicKey),
//     scriptTree: response_taptree,
//     redeem: response_script_redeem,
//     network,
//   });

//   return { challenge_p2tr, response_p2tr };
// }

// async function send_tx(
//   txname: string,
//   p2tr: payments.Payment,
//   to_addr: string,
//   inputs: any[],
//   keypair: Signer,
// ) {
//   const challenge_script_redeem: payments.Payment = p2tr.redeem!;

//   // taproot address generated by taptree + keypair
//   const challenge_addr = p2tr.address ?? "";
//   console.log(
//     `[TxName:${txname}]_script:${challenge_script_redeem.output!.toString(
//       "hex",
//     )}`,
//   );
//   console.log(
//     `[TxName:${txname}] Waiting till UTXO is detected at addr: ${challenge_addr}`,
//   );
//   let miner_fee: number = 250;
//   let utxos = await waitUntilUTXO(challenge_addr, miner_fee);
//   console.log(
//     `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
//   );

//   const tapLeafScript = {
//     leafVersion: challenge_script_redeem.redeemVersion!,
//     script: challenge_script_redeem.output!,
//     controlBlock: p2tr.witness![p2tr.witness!.length - 1],
//   };

//   const psbt = new Psbt({ network });
//   let utxo_with_maxvalue = utxos[0];
//   if (utxos.length > 1) {
//     utxos.forEach((utxo, index, array) => {
//       if (utxo.value > utxo_with_maxvalue.value) {
//         utxo_with_maxvalue = utxo;
//       }
//     });
//   }
//   psbt.addInput({
//     hash: utxo_with_maxvalue.txid,
//     index: utxo_with_maxvalue.vout,
//     witnessUtxo: { value: utxo_with_maxvalue.value, script: p2tr.output! },
//     tapLeafScript: [tapLeafScript],
//   });

//   psbt.addOutput({
//     address: to_addr, // acount1 address
//     value: utxo_with_maxvalue.value - miner_fee, // We need to provide enough fee to miner (1stoash/1byte)
//   });

//   const customFinalizer = (_inputIndex: number, input: any) => {
//     const scriptSolution = inputs;
//     const witness = scriptSolution
//       .concat(tapLeafScript.script)
//       .concat(tapLeafScript.controlBlock);

//     return {
//       finalScriptWitness: witnessStackToScriptWitness(witness),
//     };
//   };

//   psbt.finalizeInput(0, customFinalizer);
//   let tx = psbt.extractTransaction();
//   let txHex = tx.toHex();
//   console.warn(
//     `Transaction Length:${txHex.length / 2}; ${tx.byteLength(
//       true,
//     )}; ${tx.byteLength(false)}; ${tx.byteLength()}`,
//   );
//   console.log(`Broadcasting Transaction Hex: ${txHex}`);

//   //   tx.outs[0].value = utxo_with_maxvalue.value - txHex.length/2;

//   let txid = await broadcast(tx.toHex());
//   console.log(`Success! Txid is ${txid}`);
// }

// // A NAND B = E; C NAND D = F; E NAND F = H;
// // 1 NAND 0 = 1; 1 NAND 1 = 0; 0 NAND 1 = 1;
// async function process_trace(keypair: Signer) {
//   const A0 = Buffer.from([0x68]);
//   const A1 = Buffer.from([0x69]);

//   const B0 = Buffer.from([0x66]);
//   const B1 = Buffer.from([0x67]);

//   const C0 = Buffer.from([0x64]); // set to
//   const C1 = Buffer.from([0x65]); // set to

//   const D0 = Buffer.from([0x63]); // set to
//   const D1 = Buffer.from([0x62]); // set to

//   const E0 = Buffer.from([0x70]); // set to
//   const E1 = Buffer.from([0x71]); // set to

//   const F0 = Buffer.from([0x72]); // set to
//   const F1 = Buffer.from([0x73]); // set to

//   const G0 = Buffer.from([0x74]); // set to
//   const G1 = Buffer.from([0x75]); // set to

//   const A0_hash = crypto.hash160(A0);
//   const A1_hash = crypto.hash160(A1);

//   const B0_hash = crypto.hash160(B0);
//   const B1_hash = crypto.hash160(B1);

//   const C0_hash = crypto.hash160(C0);
//   const C1_hash = crypto.hash160(C1);

//   const D0_hash = crypto.hash160(D0);
//   const D1_hash = crypto.hash160(D1);

//   const E0_hash = crypto.hash160(E0);
//   const E1_hash = crypto.hash160(E1);

//   const F0_hash = crypto.hash160(F0);
//   const F1_hash = crypto.hash160(F1);

//   const G0_hash = crypto.hash160(G0);
//   const G1_hash = crypto.hash160(G1);

//   // NAND script construct
//   let NAND_1_script = generate_NAND_gate_script(
//     A0_hash,
//     A1_hash,
//     B0_hash,
//     B1_hash,
//     E0_hash,
//     E1_hash,
//   );
//   let NAND_2_script = generate_NAND_gate_script(
//     C0_hash,
//     C1_hash,
//     D0_hash,
//     D1_hash,
//     F0_hash,
//     F1_hash,
//   );
//   let NAND_3_script = generate_NAND_gate_script(
//     E0_hash,
//     E1_hash,
//     F0_hash,
//     F1_hash,
//     G0_hash,
//     G1_hash,
//   );

//   // equivocation_script
//   let A_equivocation_script = generate_equivocation_script(A0_hash, A1_hash);
//   let B_equivocation_script = generate_equivocation_script(B0_hash, B1_hash);
//   let C_equivocation_script = generate_equivocation_script(C0_hash, C1_hash);
//   let D_equivocation_script = generate_equivocation_script(D0_hash, D1_hash);
//   let E_equivocation_script = generate_equivocation_script(E0_hash, E1_hash);
//   let F_equivocation_script = generate_equivocation_script(F0_hash, F1_hash);
//   let G_equivocation_script = generate_equivocation_script(G0_hash, G1_hash);

//   // hash lock script
//   const NAND_1_challenge_preimage = Buffer.from([0x1]);
//   const NAND_1_challenge_hash = crypto.hash160(NAND_1_challenge_preimage);

//   const NAND_2_challenge_preimage = Buffer.from([0x2]);
//   const NAND_2_challenge_hash = crypto.hash160(NAND_2_challenge_preimage);

//   const NAND_3_challenge_preimage = Buffer.from([0x3]);
//   const NAND_3_challenge_hash = crypto.hash160(NAND_3_challenge_preimage);

//   const NAND_1_hash_lock_script = generate_hash_lock_script(
//     NAND_1_challenge_hash,
//   );
//   const NAND_2_hash_lock_script = generate_hash_lock_script(
//     NAND_2_challenge_hash,
//   );
//   const NAND_3_hash_lock_script = generate_hash_lock_script(
//     NAND_3_challenge_hash,
//   );

//   // todo: construct challenge taproot tree
//   let challenge_tree = construct_challenge_taptree(
//     NAND_1_hash_lock_script,
//     NAND_2_hash_lock_script,
//     NAND_3_hash_lock_script,
//   );

//   // todo: construct Responses taproot tree
//   let hash_lock_and_NAND_1_script = `${NAND_1_hash_lock_script} ${NAND_1_script}`;
//   let hash_lock_and_NAND_2_script = `${NAND_2_hash_lock_script} ${NAND_2_script}`;
//   let hash_lock_and_NAND_3_script = `${NAND_3_hash_lock_script} ${NAND_3_script}`;
//   let response_taptree = construct_response_taptree(
//     hash_lock_and_NAND_1_script,
//     hash_lock_and_NAND_2_script,
//     hash_lock_and_NAND_3_script,
//   );

//   // todo: construct equivocation_script taproot tree
//   let equivocation_taptree = construct_scripts_taptree([
//     A_equivocation_script,
//     B_equivocation_script,
//     C_equivocation_script,
//     D_equivocation_script,
//     E_equivocation_script,
//     F_equivocation_script,
//     G_equivocation_script,
//   ]);

//   // --- challenge and response process ---
//   // A,B,C,D is the inputs for the program and the G is the output for the program
//   // 1. verifer challenge NAND1 through revealing the `NAND_1_challenge_preimage`
//   // 2. prover response NAND1 through enter the `NAND_1_challenge_preimage` and `reveal the input and output for NAND1`
//   // 3. verifer challenge NAND2 through revealing the `NAND_2_challenge_preimage`
//   // 4. prover response NAND2 through enter the `NAND_2_challenge_preimage` and `reveal the input and output for NAND2`
//   // 5. verifer challenge NAND3 through revealing the `NAND_3_challenge_preimage`
//   // 6. prover response NAND3 through enter the `NAND_3_challenge_preimage` and `reveal the input and output for NAND3`

//   // ======== the first round =======
//   // send the challenge NAND1 transaction
//   const NAND_1_challenge_inputs = [
//     Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//     NAND_1_challenge_preimage,
//   ];

//   // prover can response the challenge by entering the preimage which can be found from the and reveal the input and output for the NAND gate
//   const NAND1_response_inputs = [
//     // A = 1
//     A1,
//     Buffer.from([0x01]), // OP_IF solution
//     //B = 0
//     B0,
//     Buffer.from([]), // OP_ELSE solution
//     //C = 1
//     E1,
//     Buffer.from([0x01]), // OP_IF solution
//     NAND_1_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//   ];
//   let gate1_p2trs = one_round_challenge_and_response(
//     NAND_1_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_1_script,
//     response_taptree,
//     keypair,
//   );

//   let gate1 = {
//     p2tr: gate1_p2trs,
//     inputs: {
//       challenge_inputs: NAND_1_challenge_inputs,
//       response_inputs: NAND1_response_inputs,
//     },
//   };

//   // ======== the second round =======
//   let gate2_p2trs = one_round_challenge_and_response(
//     NAND_2_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_2_script,
//     response_taptree,
//     keypair,
//   );
//   let gate2 = {
//     p2tr: gate2_p2trs,
//     inputs: {
//       challenge_inputs: [
//         Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//         NAND_2_challenge_preimage,
//       ],
//       response_inputs: [
//         C1,
//         Buffer.from([0x01]), // OP_IF solution
//         D1,
//         Buffer.from([0x01]), // OP_IF solution
//         F0,
//         Buffer.from([]), // OP_ELSE solution
//         NAND_2_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//       ],
//     },
//   };

//   // ======== the third round =======
//   let gate3_p2trs = one_round_challenge_and_response(
//     NAND_3_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_3_script,
//     response_taptree,
//     keypair,
//   );
//   let gate3 = {
//     p2tr: gate3_p2trs,
//     inputs: {
//       challenge_inputs: [
//         Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//         NAND_3_challenge_preimage,
//       ],
//       response_inputs: [
//         E1,
//         Buffer.from([0x01]), // OP_IF solution
//         F0,
//         Buffer.from([]), // OP_ELSE solution
//         G1,
//         Buffer.from([0x01]), // OP_IF solution
//         NAND_3_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//       ],
//     },
//   };

//   await send_tx(
//     "First Round Challenge",
//     gate1.p2tr.challenge_p2tr,
//     gate1.p2tr.response_p2tr.address!,
//     NAND_1_challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "First Round Response",
//     gate1.p2tr.response_p2tr,
//     gate2.p2tr.challenge_p2tr.address!,
//     NAND1_response_inputs,
//     keypair,
//   );

//   await send_tx(
//     "Second Round Challenge",
//     gate2.p2tr.challenge_p2tr,
//     gate2.p2tr.response_p2tr.address!,
//     gate2.inputs.challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "Second Round Response",
//     gate2.p2tr.response_p2tr,
//     gate3.p2tr.challenge_p2tr.address!,
//     gate2.inputs.response_inputs,
//     keypair,
//   );

//   await send_tx(
//     "Third Round Challenge",
//     gate3.p2tr.challenge_p2tr,
//     gate3.p2tr.response_p2tr.address!,
//     gate3.inputs.challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "Third Round Response",
//     gate3.p2tr.response_p2tr,
//     "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz", // prover addr
//     gate3.inputs.response_inputs,
//     keypair,
//   );
// }

// // A NAND B = E; C NAND D = F; E NAND F = G; G NAND D = H;
// // 1 NAND 0 = 1; 1 NAND 1 = 0; 0 NAND 1 = 1;
// async function process_trace_with_equivocation(keypair: Signer) {
//   const A0 = Buffer.from([0x68]);
//   const A1 = Buffer.from([0x69]);

//   const B0 = Buffer.from([0x66]);
//   const B1 = Buffer.from([0x67]);

//   const C0 = Buffer.from([0x64]); // set to
//   const C1 = Buffer.from([0x65]); // set to

//   const D0 = Buffer.from([0x63]); // set to
//   const D1 = Buffer.from([0x62]); // set to

//   const E0 = Buffer.from([0x70]); // set to
//   const E1 = Buffer.from([0x71]); // set to

//   const F0 = Buffer.from([0x72]); // set to
//   const F1 = Buffer.from([0x73]); // set to

//   const G0 = Buffer.from([0x74]); // set to
//   const G1 = Buffer.from([0x75]); // set to

//   const H0 = Buffer.from([0x76]); // set to
//   const H1 = Buffer.from([0x77]); // set to

//   const A0_hash = crypto.hash160(A0);
//   const A1_hash = crypto.hash160(A1);

//   const B0_hash = crypto.hash160(B0);
//   const B1_hash = crypto.hash160(B1);

//   const C0_hash = crypto.hash160(C0);
//   const C1_hash = crypto.hash160(C1);

//   const D0_hash = crypto.hash160(D0);
//   const D1_hash = crypto.hash160(D1);

//   const E0_hash = crypto.hash160(E0);
//   const E1_hash = crypto.hash160(E1);

//   const F0_hash = crypto.hash160(F0);
//   const F1_hash = crypto.hash160(F1);

//   const G0_hash = crypto.hash160(G0);
//   const G1_hash = crypto.hash160(G1);

//   const H0_hash = crypto.hash160(H0);
//   const H1_hash = crypto.hash160(H1);

//   // NAND script construct
//   let NAND_1_script = generate_NAND_gate_script(
//     A0_hash,
//     A1_hash,
//     B0_hash,
//     B1_hash,
//     E0_hash,
//     E1_hash,
//   );
//   let NAND_2_script = generate_NAND_gate_script(
//     C0_hash,
//     C1_hash,
//     D0_hash,
//     D1_hash,
//     F0_hash,
//     F1_hash,
//   );
//   let NAND_3_script = generate_NAND_gate_script(
//     E0_hash,
//     E1_hash,
//     F0_hash,
//     F1_hash,
//     G0_hash,
//     G1_hash,
//   );
//   let NAND_4_script = generate_NAND_gate_script(
//     G0_hash,
//     G1_hash,
//     F0_hash,
//     F1_hash,
//     H0_hash,
//     H1_hash,
//   );

//   // equivocation_script
//   let A_equivocation_script = generate_equivocation_script(A0_hash, A1_hash);
//   let B_equivocation_script = generate_equivocation_script(B0_hash, B1_hash);
//   let C_equivocation_script = generate_equivocation_script(C0_hash, C1_hash);
//   let D_equivocation_script = generate_equivocation_script(D0_hash, D1_hash);
//   let E_equivocation_script = generate_equivocation_script(E0_hash, E1_hash);
//   let F_equivocation_script = generate_equivocation_script(F0_hash, F1_hash);
//   let G_equivocation_script = generate_equivocation_script(G0_hash, G1_hash);
//   let H_equivocation_script = generate_equivocation_script(H0_hash, H1_hash);

//   // hash lock script
//   const NAND_1_challenge_preimage = Buffer.from([0x1]);
//   const NAND_1_challenge_hash = crypto.hash160(NAND_1_challenge_preimage);

//   const NAND_2_challenge_preimage = Buffer.from([0x2]);
//   const NAND_2_challenge_hash = crypto.hash160(NAND_2_challenge_preimage);

//   const NAND_3_challenge_preimage = Buffer.from([0x3]);
//   const NAND_3_challenge_hash = crypto.hash160(NAND_3_challenge_preimage);

//   const NAND_4_challenge_preimage = Buffer.from([0x4]);
//   const NAND_4_challenge_hash = crypto.hash160(NAND_4_challenge_preimage);

//   const NAND_1_hash_lock_script = generate_hash_lock_script(
//     NAND_1_challenge_hash,
//   );
//   const NAND_2_hash_lock_script = generate_hash_lock_script(
//     NAND_2_challenge_hash,
//   );
//   const NAND_3_hash_lock_script = generate_hash_lock_script(
//     NAND_3_challenge_hash,
//   );
//   const NAND_4_hash_lock_script = generate_hash_lock_script(
//     NAND_4_challenge_hash,
//   );

//   // combine challenge taproot tree with equivocation taproot tree
//   let challenge_tree = construct_scripts_taptree([
//     NAND_1_hash_lock_script,
//     NAND_2_hash_lock_script,
//     NAND_3_hash_lock_script,
//     NAND_4_hash_lock_script,
//     A_equivocation_script,
//     B_equivocation_script,
//     C_equivocation_script,
//     D_equivocation_script,
//     E_equivocation_script,
//     F_equivocation_script,
//     G_equivocation_script,
//     H_equivocation_script,
//   ]);

//   // construct Responses taproot tree
//   let hash_lock_and_NAND_1_script = `${NAND_1_hash_lock_script} ${NAND_1_script}`;
//   let hash_lock_and_NAND_2_script = `${NAND_2_hash_lock_script} ${NAND_2_script}`;
//   let hash_lock_and_NAND_3_script = `${NAND_3_hash_lock_script} ${NAND_3_script}`;
//   let hash_lock_and_NAND_4_script = `${NAND_4_hash_lock_script} ${NAND_4_script}`;
//   let response_taptree = construct_scripts_taptree([
//     hash_lock_and_NAND_1_script,
//     hash_lock_and_NAND_2_script,
//     hash_lock_and_NAND_3_script,
//     hash_lock_and_NAND_4_script,
//   ]);

//   // construct equivcation taptree
//   let equivocation_tree = construct_scripts_taptree([
//     A_equivocation_script,
//     B_equivocation_script,
//     C_equivocation_script,
//     D_equivocation_script,
//     E_equivocation_script,
//     F_equivocation_script,
//     G_equivocation_script,
//     H_equivocation_script,
//   ]);

//   // --- challenge and response process with equivocation_happen ---
//   // A,B,C,D is the inputs for the program and the G is the output for the program
//   // 1. verifer challenge NAND1 through revealing the `NAND_1_challenge_preimage`
//   // 2. prover response NAND1 through enter the `NAND_1_challenge_preimage` and `reveal the input and output for NAND1`
//   // 3. verifer challenge NAND2 through revealing the `NAND_2_challenge_preimage`
//   // 4. prover response NAND2 through enter the `NAND_2_challenge_preimage` and `reveal the input and output for NAND2`
//   // >>> equivocation_happen <<<
//   // 5. verifer challenge NAND3 through revealing the `NAND_3_challenge_preimage`
//   // 6. prover response NAND3 through enter the `NAND_3_challenge_preimage` and `reveal the input and output for NAND3`

//   // ======== the first round =======
//   // send the challenge NAND1 transaction
//   const NAND_1_challenge_inputs = [
//     Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//     NAND_1_challenge_preimage,
//   ];

//   // prover can response the challenge by entering the preimage which can be found from the and reveal the input and output for the NAND gate
//   const NAND1_response_inputs = [
//     A1,
//     Buffer.from([0x01]), // OP_IF solution
//     B0,
//     Buffer.from([]), // OP_ELSE solution
//     E1,
//     Buffer.from([0x01]), // OP_IF solution
//     NAND_1_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//   ];
//   let gate1_p2trs = one_round_challenge_and_response(
//     NAND_1_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_1_script,
//     response_taptree,
//     keypair,
//   );

//   let gate1 = {
//     p2tr: gate1_p2trs,
//     inputs: {
//       challenge_inputs: NAND_1_challenge_inputs,
//       response_inputs: NAND1_response_inputs,
//     },
//   };

//   // ======== the second round =======
//   let gate2_p2trs = one_round_challenge_and_response(
//     NAND_2_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_2_script,
//     response_taptree,
//     keypair,
//   );
//   let gate2 = {
//     p2tr: gate2_p2trs,
//     inputs: {
//       challenge_inputs: [
//         Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//         NAND_2_challenge_preimage,
//       ],
//       response_inputs: [
//         C1,
//         Buffer.from([0x01]), // OP_IF solution
//         D1,
//         Buffer.from([0x01]), // OP_IF solution
//         F0,
//         Buffer.from([]), // OP_ELSE solution
//         NAND_2_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//       ],
//     },
//   };

//   // ======== the third round =======
//   let gate4_p2trs = one_round_challenge_and_response(
//     NAND_4_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_4_script,
//     response_taptree,
//     keypair,
//   );
//   let gate4 = {
//     p2tr: gate4_p2trs,
//     inputs: {
//       challenge_inputs: [
//         Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//         NAND_4_challenge_preimage,
//       ],
//       response_inputs: [
//         G0, // Notice: the correct value for G should be 1 but we deliberately changed its value to 0
//         Buffer.from([]), // OP_ELSE solution
//         F0,
//         Buffer.from([]), // OP_ELSE solution
//         H1,
//         Buffer.from([0x01]), // OP_IF solution
//         NAND_4_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//       ],
//     },
//   };

//   // ========= the fourth round =========
//   let gate3_p2trs = one_round_challenge_and_response(
//     NAND_3_hash_lock_script,
//     challenge_tree,
//     hash_lock_and_NAND_3_script,
//     response_taptree,
//     keypair,
//   );

//   let gate3 = {
//     p2tr: gate3_p2trs,
//     inputs: {
//       challenge_inputs: [
//         Buffer.from([0x01]), // we need to confirm that the stack size equals to 1 after the program execution.
//         NAND_3_challenge_preimage,
//       ],
//       response_inputs: [
//         E1, // Notice: the correct value for G should be 1 but we deliberately changed its value to 0
//         Buffer.from([0x01]), // OP_ELSE solution
//         F0,
//         Buffer.from([]), // OP_ELSE solution
//         G1,
//         Buffer.from([0x01]), // OP_IF solution
//         NAND_3_challenge_preimage, // we can get this data from the verifier input_utxo of challenge tx.
//       ],
//     },
//   };

//   // ======== The fifth round =========
//   // verifier already known G0 and G1, and then he can unlock the utxo by providing the inputs[G0,G1] and `G_equivocation_script`
//   let equivocation_happen_p2trs = one_round_challenge_and_response(
//     G_equivocation_script,
//     equivocation_tree,
//     G_equivocation_script, // we do not need to care this param
//     equivocation_tree, // we do not need to care this param
//     keypair,
//   );

//   await send_tx(
//     "First Round Challenge",
//     gate1.p2tr.challenge_p2tr,
//     gate1.p2tr.response_p2tr.address!,
//     NAND_1_challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "First Round Response",
//     gate1.p2tr.response_p2tr,
//     gate2.p2tr.challenge_p2tr.address!,
//     NAND1_response_inputs,
//     keypair,
//   );

//   await send_tx(
//     "Second Round Challenge",
//     gate2.p2tr.challenge_p2tr,
//     gate2.p2tr.response_p2tr.address!,
//     gate2.inputs.challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "Second Round Response",
//     gate2.p2tr.response_p2tr,
//     gate4.p2tr.challenge_p2tr.address!,
//     gate2.inputs.response_inputs,
//     keypair,
//   );

//   await send_tx(
//     "Third Round Challenge",
//     gate4.p2tr.challenge_p2tr,
//     gate4.p2tr.response_p2tr.address!,
//     gate4.inputs.challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "Third Round Response",
//     gate4.p2tr.response_p2tr,
//     gate3.p2tr.challenge_p2tr.address!,
//     gate4.inputs.response_inputs,
//     keypair,
//   );

//   await send_tx(
//     "Fourth Round Challenge",
//     gate3.p2tr.challenge_p2tr,
//     gate3.p2tr.response_p2tr.address!,
//     gate3.inputs.challenge_inputs,
//     keypair,
//   );
//   await send_tx(
//     "Fourth Round Response",
//     gate3.p2tr.response_p2tr,
//     equivocation_happen_p2trs.challenge_p2tr.address!,
//     gate3.inputs.response_inputs,
//     keypair,
//   );

//   // verifier reveal the equivocation abount G0 and G1 to unlock the UTXO
//   await send_tx(
//     "Fifth Round Challenge",
//     equivocation_happen_p2trs.challenge_p2tr,
//     `mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz`,
//     [G0, G1],
//     keypair,
//   );
// }

// // only 1:1 = 0 otherwise 1
// async function NAND_gate(keypair: Signer) {
//   const C0 = Buffer.from([0x64]); // set to
//   const C1 = Buffer.from([0x65]); // set to

//   const B0 = Buffer.from([0x66]);
//   const B1 = Buffer.from([0x67]);

//   const A0 = Buffer.from([0x68]);
//   const A1 = Buffer.from([0x69]);

//   const C0_hash = crypto.hash160(C0);
//   const C1_hash = crypto.hash160(C1);

//   const B0_hash = crypto.hash160(B0);
//   const B1_hash = crypto.hash160(B1);

//   const A0_hash = crypto.hash160(A0);
//   const A1_hash = crypto.hash160(A1);

//   // construct NAND gate script
//   const C_bitvalue_script = generate_bitcommitment_script(C0_hash, C1_hash);
//   const B_bitvalue_script = generate_bitcommitment_script(B0_hash, B1_hash);
//   const A_bitvalue_script = generate_bitcommitment_script(A0_hash, A1_hash);

//   // OP_BOOLAND if both a and b are not 0, the output is 1.Otherwise 0.
//   // 1 1 1
//   // 0 1 0
//   // 0 0 0
//   // 0 1 0

//   // NAND gate
//   // 1 1 0
//   // 1 0 1
//   // 0 1 1
//   // 0 0 1

//   // we can use OP_BOOLAND OP_NOT to implement NAND gate
//   const complete_script_asm = `${C_bitvalue_script} OP_TOALTSTACK ${B_bitvalue_script} OP_TOALTSTACK ${A_bitvalue_script} OP_FROMALTSTACK OP_BOOLAND OP_NOT OP_FROMALTSTACK OP_EQUALVERIFY OP_1`;
//   console.log(`complete script:${complete_script_asm}`);
//   const complete_script = script.fromASM(complete_script_asm);

//   // construct p2pk script
//   const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString(
//     "hex",
//   )} OP_CHECKSIG`;
//   console.log(`p2pk_script_asm:${p2pk_script_asm}`);
//   const p2pk_script = script.fromASM(p2pk_script_asm);

//   const scriptTree: Taptree = [
//     {
//       output: p2pk_script,
//     },
//     {
//       output: complete_script,
//     },
//   ];

//   const NAND_script_redeem = {
//     output: complete_script,
//     redeemVersion: 192,
//   };

//   const NAND_p2tr = payments.p2tr({
//     internalPubkey: toXOnly(keypair.publicKey),
//     scriptTree,
//     redeem: NAND_script_redeem,
//     network,
//   });

//   // taproot address generated by taptree + keypair
//   const script_addr = NAND_p2tr.address ?? "";

//   console.log(
//     `bitvalue_script_redeem.output (p2pk_script):${NAND_script_redeem.output.toString(
//       "hex",
//     )}`,
//   );
//   console.log(`witnessUtxo: ${NAND_p2tr.output!.toString("hex")}`);

//   console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
//   let utxos = await waitUntilUTXO(script_addr);
//   console.log(
//     `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
//   );

//   const tapLeafScript = {
//     leafVersion: NAND_script_redeem.redeemVersion,
//     script: NAND_script_redeem.output,
//     controlBlock: NAND_p2tr.witness![NAND_p2tr.witness!.length - 1],
//   };

//   const psbt = new Psbt({ network });
//   psbt.addInput({
//     hash: utxos[0].txid,
//     index: utxos[0].vout,
//     witnessUtxo: { value: utxos[0].value, script: NAND_p2tr.output! },
//     tapLeafScript: [tapLeafScript],
//   });

//   psbt.addOutput({
//     address: "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz", // acount1 address
//     value: utxos[0].value - 150,
//   });

//   const customFinalizer = (_inputIndex: number, input: any) => {
//     const scriptSolution = [
//       // A = 1
//       A1,
//       Buffer.from([0x01]), // OP_IF solution
//       //B = 0
//       B0,
//       Buffer.from([]), // OP_ELSE solution
//       //C = 1
//       C1,
//       Buffer.from([0x01]), // OP_IF solution
//     ];
//     const witness = scriptSolution
//       .concat(tapLeafScript.script)
//       .concat(tapLeafScript.controlBlock);

//     return {
//       finalScriptWitness: witnessStackToScriptWitness(witness),
//     };
//   };

//   psbt.finalizeInput(0, customFinalizer);
//   let tx = psbt.extractTransaction();
//   console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
//   let txid = await broadcast(tx.toHex());
//   console.log(`Success! Txid is ${txid}`);
// }

// async function start_bitvalue_commitment(keypair: Signer) {
//   console.log(`Running Bitvalue Commitment`);

//   const secret_bytes_1 = Buffer.from([0x62]);
//   const secret_bytes_2 = Buffer.from([0x63]);
//   const hash_1 = crypto.hash160(secret_bytes_1);
//   const hash_2 = crypto.hash160(secret_bytes_2);
//   const const_value_1 = Buffer.from([0x1]);
//   const const_value_0 = Buffer.from([0x0]);

//   // Construct bitvalue script
//   const bitvalue_keypair = ECPair.makeRandom({ network });
//   const bitvalue_script_asm = `OP_IF OP_HASH160 ${hash_1.toString(
//     "hex",
//   )} OP_EQUALVERIFY ${const_value_1.toString(
//     "hex",
//   )} OP_ELSE OP_HASH160 ${hash_2.toString(
//     "hex",
//   )} OP_EQUALVERIFY ${const_value_0.toString("hex")} OP_ENDIF`;
//   const bitvalue_script = script.fromASM(bitvalue_script_asm);

//   // construct p2pk script
//   const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString(
//     "hex",
//   )} OP_CHECKSIG`;
//   const p2pk_script = script.fromASM(p2pk_script_asm);

//   const scriptTree: Taptree = [
//     {
//       output: p2pk_script,
//     },
//     {
//       output: bitvalue_script,
//     },
//   ];

//   const bitvalue_script_redeem = {
//     output: bitvalue_script,
//     redeemVersion: 192,
//   };

//   const bitvalue_p2tr = payments.p2tr({
//     internalPubkey: toXOnly(keypair.publicKey),
//     scriptTree,
//     redeem: bitvalue_script_redeem,
//     network,
//   });

//   // taproot address generated by taptree + keypair
//   const script_addr = bitvalue_p2tr.address ?? "";

//   console.log(
//     `bitvalue_script_redeem.output (p2pk_script):${bitvalue_script_redeem.output.toString(
//       "hex",
//     )}`,
//   );
//   console.log(`witnessUtxo: ${bitvalue_p2tr.output!.toString("hex")}`);

//   console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
//   let utxos = await waitUntilUTXO(script_addr);
//   console.log(
//     `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
//   );

//   const tapLeafScript = {
//     leafVersion: bitvalue_script_redeem.redeemVersion,
//     script: bitvalue_script_redeem.output,
//     controlBlock: bitvalue_p2tr.witness![bitvalue_p2tr.witness!.length - 1],
//   };

//   const psbt = new Psbt({ network });
//   psbt.addInput({
//     hash: utxos[0].txid,
//     index: utxos[0].vout,
//     witnessUtxo: { value: utxos[0].value, script: bitvalue_p2tr.output! },
//     tapLeafScript: [tapLeafScript],
//   });

//   psbt.addOutput({
//     address: "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz", // acount1 address
//     value: utxos[0].value - 150,
//   });

//   // psbt.signInput(0, bitvalue_keypair);

//   // We have to construct our witness script in a custom finalizer

//   const customFinalizer = (_inputIndex: number, input: any) => {
//     const scriptSolution = [secret_bytes_1, Buffer.from([0x1])];
//     const witness = scriptSolution
//       .concat(tapLeafScript.script)
//       .concat(tapLeafScript.controlBlock);

//     return {
//       finalScriptWitness: witnessStackToScriptWitness(witness),
//     };
//   };

//   psbt.finalizeInput(0, customFinalizer);

//   let tx = psbt.extractTransaction();
//   console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
//   let txid = await broadcast(tx.toHex());
//   console.log(`Success! Txid is ${txid}`);
// }

// async function start_bitvalue_commitment_with_sig(keypair: Signer) {
//   console.log(`Running Bitvalue Commitment`);

//   const secret_bytes_1 = Buffer.from([0x62]);
//   const secret_bytes_2 = Buffer.from([0x63]);
//   const hash_1 = crypto.hash160(secret_bytes_1);
//   const hash_2 = crypto.hash160(secret_bytes_2);
//   const const_value_1 = Buffer.from([0x1]);
//   const const_value_0 = Buffer.from([0x0]);

//   // Construct bitvalue script
//   const bitvalue_keypair = ECPair.makeRandom({ network });
//   const bitvalue_script_asm = `OP_IF OP_HASH160 ${hash_1.toString(
//     "hex",
//   )} OP_EQUALVERIFY ${const_value_1.toString(
//     "hex",
//   )} OP_ELSE OP_HASH160 ${hash_2.toString(
//     "hex",
//   )} OP_EQUALVERIFY ${const_value_0.toString("hex")} OP_ENDIF  ${toXOnly(
//     bitvalue_keypair.publicKey,
//   ).toString("hex")} OP_CHECKSIG`;
//   const bitvalue_script = script.fromASM(bitvalue_script_asm);

//   // construct p2pk script
//   const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString(
//     "hex",
//   )} OP_CHECKSIG`;
//   const p2pk_script = script.fromASM(p2pk_script_asm);

//   const scriptTree: Taptree = [
//     {
//       output: p2pk_script,
//     },
//     {
//       output: bitvalue_script,
//     },
//   ];

//   const bitvalue_script_redeem = {
//     output: bitvalue_script,
//     redeemVersion: 192,
//   };

//   const bitvalue_p2tr = payments.p2tr({
//     internalPubkey: toXOnly(keypair.publicKey),
//     scriptTree,
//     redeem: bitvalue_script_redeem,
//     network,
//   });

//   // taproot address generated by taptree + keypair
//   const script_addr = bitvalue_p2tr.address ?? "";

//   console.log(
//     `bitvalue_script_redeem.output (p2pk_script):${bitvalue_script_redeem.output.toString(
//       "hex",
//     )}`,
//   );
//   console.log(`witnessUtxo: ${bitvalue_p2tr.output!.toString("hex")}`);

//   console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
//   let utxos = await waitUntilUTXO(script_addr);
//   console.log(
//     `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
//   );

//   const tapLeafScript = {
//     leafVersion: bitvalue_script_redeem.redeemVersion,
//     script: bitvalue_script_redeem.output,
//     controlBlock: bitvalue_p2tr.witness![bitvalue_p2tr.witness!.length - 1],
//   };

//   const psbt = new Psbt({ network });
//   psbt.addInput({
//     hash: utxos[0].txid,
//     index: utxos[0].vout,
//     witnessUtxo: { value: utxos[0].value, script: bitvalue_p2tr.output! },
//     tapLeafScript: [tapLeafScript],
//   });

//   psbt.addOutput({
//     address: "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz", // acount1 address
//     value: utxos[0].value - 150,
//   });

//   psbt.signInput(0, bitvalue_keypair);

//   // We have to construct our witness script in a custom finalizer

//   const customFinalizer = (_inputIndex: number, input: any) => {
//     const scriptSolution = [
//       input.tapScriptSig[0].signature,
//       secret_bytes_1,
//       Buffer.from([0x1]),
//     ];
//     const witness = scriptSolution
//       .concat(tapLeafScript.script)
//       .concat(tapLeafScript.controlBlock);

//     return {
//       finalScriptWitness: witnessStackToScriptWitness(witness),
//     };
//   };

//   psbt.finalizeInput(0, customFinalizer);

//   let tx = psbt.extractTransaction();
//   console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
//   let txid = await broadcast(tx.toHex());
//   console.log(`Success! Txid is ${txid}`);
// }

async function start_p2pktr(keypair: Signer) {
  console.log(`Running "Pay to Pubkey with taproot example"`);
  // Tweak the original keypair
  const tweakedSigner = tweakSigner(keypair, { network });
  // Generate an address from the tweaked public key
  const p2pktr = payments.p2tr({
    pubkey: toXOnly(tweakedSigner.publicKey),
    network,
  });
  const p2pktr_addr = p2pktr.address ?? "";
  console.log(`Waiting till UTXO is detected at this Address: ${p2pktr_addr}`);

  const utxos = await waitUntilUTXO(p2pktr_addr);
  console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}`);

  const psbt = new Psbt({ network });
  psbt.addInput({
    hash: utxos[0].txid,
    index: utxos[0].vout,
    witnessUtxo: { value: utxos[0].value, script: p2pktr.output! },
    tapInternalKey: toXOnly(keypair.publicKey),
  });

  psbt.addOutput({
    address: "mohjSavDdQYHRYXcS3uS6ttaHP8amyvX78", // faucet address
    value: utxos[0].value - 150,
  });

  psbt.signInput(0, tweakedSigner);

  psbt.finalizeAllInputs();

  const tx = psbt.extractTransaction();
  console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
  const txid = await broadcast(tx.toHex());
  console.log(`Success! Txid is ${txid}`);
}

async function start_taptree_p2pk_script(keypair: Signer) {
  // TapTree example
  console.log(`Running "Taptree example"`);

  // Create a tap tree with two spend paths
  // One path should allow spending using secret
  // The other path should pay to another pubkey

  // Make random key for hash_lock
  const hash_lock_keypair = ECPair.makeRandom({ network });

  const secret_bytes = Buffer.from("SECRET");
  const hash = crypto.hash160(secret_bytes);
  // Construct script to pay to hash_lock_keypair if the correct preimage/secret is provided
  const hash_script_asm = `OP_HASH160 ${hash.toString(
    "hex",
  )} OP_EQUALVERIFY ${toXOnly(hash_lock_keypair.publicKey).toString(
    "hex",
  )} OP_CHECKSIG`;
  const hash_lock_script = script.fromASM(hash_script_asm);

  const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString(
    "hex",
  )} OP_CHECKSIG`;
  const p2pk_script = script.fromASM(p2pk_script_asm);

  const scriptTree: Taptree = [
    {
      output: hash_lock_script,
    },
    {
      output: p2pk_script,
    },
  ];

  const hash_lock_redeem = {
    output: hash_lock_script,
    redeemVersion: 192,
  };
  const p2pk_redeem = {
    output: p2pk_script,
    redeemVersion: 192,
  };

  // three p2tr
  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree,
    network,
  });
  const script_addr = script_p2tr.address ?? "";

  const p2pk_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree,
    redeem: p2pk_redeem,
    network,
  });

  console.log(
    `p2pk_redeem.output (p2pk_script):${p2pk_redeem.output.toString("hex")}`,
  );
  console.log(`witnessUtxo: ${p2pk_p2tr.output!.toString("hex")}`);

  console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
  let utxos = await waitUntilUTXO(script_addr);
  console.log(
    `Trying the P2PK path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
  );
  //// 接下来的程序会构造三种 PSBT来 花费这个 script_addr 对应的UTXO
  const p2pk_psbt = new Psbt({ network });
  // input 是真正执行程序的地方
  p2pk_psbt.addInput({
    hash: utxos[0].txid,
    index: utxos[0].vout,
    witnessUtxo: { value: utxos[0].value, script: p2pk_p2tr.output! },
    tapLeafScript: [
      {
        leafVersion: p2pk_redeem.redeemVersion,
        script: p2pk_redeem.output, // =p2pk_script
        controlBlock: p2pk_p2tr.witness![p2pk_p2tr.witness!.length - 1], // question: controlBlock how to work?
      },
    ],
  });

  p2pk_psbt.addOutput({
    address: "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz", // account1 address
    value: utxos[0].value - 150,
  });

  p2pk_psbt.signInput(0, keypair);
  p2pk_psbt.finalizeAllInputs();

  let tx = p2pk_psbt.extractTransaction();
  console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
  let txid = await broadcast(tx.toHex());
  console.log(`Success! Txid is ${txid}`);
}

async function start_taptree_hash_lock_script(keypair: Signer) {
  // TapTree example
  console.log(`Running "Taptree example"`);

  // Create a tap tree with two spend paths
  // One path should allow spending using secret
  // The other path should pay to another pubkey

  // Make random key for hash_lock
  const hash_lock_keypair = ECPair.makeRandom({ network });

  const secret_bytes = Buffer.from("SECRET");
  const hash = crypto.hash160(secret_bytes);
  // Construct script to pay to hash_lock_keypair if the correct preimage/secret is provided
  const hash_script_asm = `OP_HASH160 ${hash.toString(
    "hex",
  )} OP_EQUALVERIFY ${toXOnly(hash_lock_keypair.publicKey).toString(
    "hex",
  )} OP_CHECKSIG`;
  const hash_lock_script = script.fromASM(hash_script_asm);

  const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString(
    "hex",
  )} OP_CHECKSIG`;
  const p2pk_script = script.fromASM(p2pk_script_asm);

  const scriptTree: Taptree = [
    {
      output: hash_lock_script,
    },
    {
      output: p2pk_script,
    },
  ];

  const hash_lock_redeem = {
    output: hash_lock_script,
    redeemVersion: 192,
  };

  // three p2tr
  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree,
    network,
  });
  const script_addr = script_p2tr.address ?? "";

  const hash_lock_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree,
    redeem: hash_lock_redeem,
    network,
  });

  console.log(
    `hash_lock_redeem.output (p2pk_script):${hash_lock_redeem.output.toString(
      "hex",
    )}`,
  );
  console.log(`witnessUtxo: ${hash_lock_p2tr.output!.toString("hex")}`);

  console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
  let utxos = await waitUntilUTXO(script_addr);
  console.log(
    `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
  );

  const tapLeafScript = {
    leafVersion: hash_lock_redeem.redeemVersion,
    script: hash_lock_redeem.output,
    controlBlock: hash_lock_p2tr.witness![hash_lock_p2tr.witness!.length - 1],
  };

  const psbt = new Psbt({ network });
  psbt.addInput({
    hash: utxos[0].txid,
    index: utxos[0].vout,
    witnessUtxo: { value: utxos[0].value, script: hash_lock_p2tr.output! },
    tapLeafScript: [tapLeafScript],
  });

  psbt.addOutput({
    address: "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz", // acount1 address
    value: utxos[0].value - 150,
  });

  psbt.signInput(0, hash_lock_keypair);

  // We have to construct our witness script in a custom finalizer

  const customFinalizer = (_inputIndex: number, input: any) => {
    const scriptSolution = [input.tapScriptSig[0].signature, secret_bytes];
    const witness = scriptSolution
      .concat(tapLeafScript.script)
      .concat(tapLeafScript.controlBlock);

    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  psbt.finalizeInput(0, customFinalizer);

  let tx = psbt.extractTransaction();
  console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
  let txid = await broadcast(tx.toHex());
  console.log(`Success! Txid is ${txid}`);
}

async function start_taptree(keypair: Signer) {
  // TapTree example
  console.log(`Running "Taptree example"`);

  // Create a tap tree with two spend paths
  // One path should allow spending using secret
  // The other path should pay to another pubkey

  // Make random key for hash_lock
  const hash_lock_keypair = ECPair.makeRandom({ network });

  const secret_bytes = Buffer.from("SECRET");
  const hash = crypto.hash160(secret_bytes);
  // Construct script to pay to hash_lock_keypair if the correct preimage/secret is provided
  const hash_script_asm = `OP_HASH160 ${hash.toString(
    "hex",
  )} OP_EQUALVERIFY ${toXOnly(hash_lock_keypair.publicKey).toString(
    "hex",
  )} OP_CHECKSIG`;
  const hash_lock_script = script.fromASM(hash_script_asm);

  const p2pk_script_asm = `${toXOnly(keypair.publicKey).toString(
    "hex",
  )} OP_CHECKSIG`;
  const p2pk_script = script.fromASM(p2pk_script_asm);

  const scriptTree: Taptree = [
    {
      output: hash_lock_script,
    },
    {
      output: p2pk_script,
    },
  ];
  // three p2tr
  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree,
    network,
  });
  const script_addr = script_p2tr.address ?? "";
  // We can also spend from this address without using the script tree

  console.log(`Waiting till UTXO is detected at this Address: ${script_addr}`);
  let utxos = await waitUntilUTXO(script_addr);
  console.log(
    `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
  );

  const key_spend_psbt = new Psbt({ network });
  key_spend_psbt.addInput({
    hash: utxos[0].txid,
    index: utxos[0].vout,
    witnessUtxo: { value: utxos[0].value, script: script_p2tr.output! },
    tapInternalKey: toXOnly(keypair.publicKey),
    tapMerkleRoot: script_p2tr.hash,
  });
  key_spend_psbt.addOutput({
    address: "mohjSavDdQYHRYXcS3uS6ttaHP8amyvX78", // account1 address
    value: utxos[0].value - 150,
  });
  // We need to create a signer tweaked by script tree's merkle root
  const tweakedSigner = tweakSigner(keypair, { tweakHash: script_p2tr.hash });
  key_spend_psbt.signInput(0, tweakedSigner);
  key_spend_psbt.finalizeAllInputs();

  let tx = key_spend_psbt.extractTransaction();
  console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
  let txid = await broadcast(tx.toHex());
  console.log(`Success! Txid is ${txid}`);
}

function tweakSigner(signer: Signer, opts: any = {}): Signer {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let privateKey: Uint8Array | undefined = signer.privateKey!;
  if (!privateKey) {
    throw new Error("Private key is required for tweaking signer!");
  }
  if (signer.publicKey[0] === 3) {
    privateKey = tinysecp.privateNegate(privateKey);
  }

  const tweakedPrivateKey = tinysecp.privateAdd(
    privateKey,
    tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
  );
  if (!tweakedPrivateKey) {
    throw new Error("Invalid tweaked private key!");
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  });
}

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
  return crypto.taggedHash(
    "TapTweak",
    Buffer.concat(h ? [pubKey, h] : [pubKey]),
  );
}
