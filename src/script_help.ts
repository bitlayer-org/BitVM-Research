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
import { toXOnly } from "./utils";
const tinysecp: TinySecp256k1Interface = require("tiny-secp256k1");
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const network = networks.testnet;

// Notice & Todo: If a leaf of a tree has been revealed in a previous round, it cannot be used as a leaf of the challenge taproot tree to
// prevent Prover from deliberately reusing the leaf to unlock the Response Taproot Tree.
export function construct_challenge_taptree(
  gate_1_hash_lock_script: string,
  gate_2_hash_lock_script: string,
  gate_3_hash_lock_script: string,
) {
  const parity_tree: Taptree = [
    {
      output: script.fromASM(gate_1_hash_lock_script),
    },
    {
      output: script.fromASM(gate_2_hash_lock_script),
    },
  ];

  const challenge_taproot_tree: Taptree = [
    parity_tree,
    { output: script.fromASM(gate_3_hash_lock_script) },
  ];
  return challenge_taproot_tree;
}

export function construct_response_taptree(
  script1: string,
  script2: string,
  script3: string,
) {
  const response_tree: Taptree = [
    {
      output: script.fromASM(script1),
    },
    {
      output: script.fromASM(script2),
    },
  ];

  const response_taproot_tree: Taptree = [
    response_tree,
    { output: script.fromASM(script3) },
  ];
  return response_taproot_tree;
}

export function construct_scripts_taptree(script_list: string[]): Taptree {
  let leaves = convert_script_to_tapnode(script_list);
  let next_layer_nodes: Taptree[] = leaves;
  while (true) {
    next_layer_nodes = construct_taptree_one_layer(next_layer_nodes);
    if (next_layer_nodes.length == 1) {
      break;
    }
  }
  return next_layer_nodes[0];
}

export function convert_script_to_tapnode(script_list: string[]): Taptree[] {
  const leaves = script_list.map((value, index, array) => {
    let leaf: Taptree = { output: script.fromASM(value) };
    return leaf;
  });
  return leaves;
}

export function construct_taptree_one_layer(script_list: Taptree[]): Taptree[] {
  const next_layer_nodes: Taptree[] = [];
  const leaves = script_list.forEach((value, index, array) => {
    // Notice: the program no consider the specific case that array length equals to 1,
    // which maybe leading to loop forever when constructing taptree
    if (index + 1 == array.length && index % 2 == 0) {
      next_layer_nodes.push(value);
      return value;
    }
    if (index % 2 != 0) {
      const next_layer_node: Taptree = [value, array[index - 1]];
      next_layer_nodes.push(next_layer_node);
    }
    return value;
  });
  return next_layer_nodes;
}

export function generate_hash_lock_script(hash: Buffer): string {
  const script = `OP_HASH160 ${hash.toString("hex")} OP_EQUALVERIFY`;
  return script;
}

export function generate_equivocation_script(
  hash0: Buffer,
  hash1: Buffer,
): string {
  // the verifier can unlock the utxo when he has the two preimage for hash1 and hash0
  // the input is [preimage0, preimage1]
  const bitvalue_script_asm = `OP_HASH160 ${hash1.toString(
    "hex",
  )} OP_EQUALVERIFY OP_HASH160 ${hash0.toString("hex")} OP_EQUALVERIFY OP_1`;
  return bitvalue_script_asm;
}

export function generate_bitcommitment_script(
  hash0: Buffer,
  hash1: Buffer,
): string {
  const bitvalue_script_asm = `OP_IF OP_HASH160 ${hash1.toString(
    "hex",
  )} OP_EQUALVERIFY OP_1 OP_ELSE OP_HASH160 ${hash0.toString(
    "hex",
  )} OP_EQUALVERIFY OP_0 OP_ENDIF`;
  return bitvalue_script_asm;
}

export function generate_NAND_gate_script(
  left_operator_0_hash: Buffer,
  left_operator_1_hash: Buffer,
  right_operator_0_hash: Buffer,
  right_operator_1_hash: Buffer,
  result_0_hash: Buffer,
  result_1_hash: Buffer,
): string {
  const C_bitvalue_script = generate_bitcommitment_script(
    result_0_hash,
    result_1_hash,
  );
  const B_bitvalue_script = generate_bitcommitment_script(
    right_operator_0_hash,
    right_operator_1_hash,
  );
  const A_bitvalue_script = generate_bitcommitment_script(
    left_operator_0_hash,
    left_operator_1_hash,
  );
  const complete_script_asm = `${C_bitvalue_script} OP_TOALTSTACK ${B_bitvalue_script} OP_TOALTSTACK ${A_bitvalue_script} OP_FROMALTSTACK OP_BOOLAND OP_NOT OP_FROMALTSTACK OP_EQUALVERIFY OP_1`;
  return complete_script_asm;
}

export function one_round_challenge_and_response(
  gate_hash_lock_script: string,
  challenge_tree: Taptree,
  gate_hashlock_and_gate_script: string,
  response_taptree: Taptree,
  keypair: Signer,
) {
  // send the challenge NAND2 transaction
  const challenge_script_redeem = {
    output: script.fromASM(gate_hash_lock_script),
    redeemVersion: 192,
  };

  const challenge_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree: challenge_tree,
    redeem: challenge_script_redeem,
    network,
  });
  // prover can response the challenge by entering the preimage
  // which can be found from the and reveal the input and output for the NAND gate
  const response_script_redeem = {
    output: script.fromASM(gate_hashlock_and_gate_script),
    redeemVersion: 192,
  };

  const response_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree: response_taptree,
    redeem: response_script_redeem,
    network,
  });

  return { challenge_p2tr, response_p2tr };
}

export async function send_tx(
  txname: string,
  p2tr: payments.Payment,
  to_addr: string,
  inputs: any[],
  keypair: Signer,
) {
  const challenge_script_redeem: payments.Payment = p2tr.redeem!;

  // taproot address generated by taptree + keypair
  const challenge_addr = p2tr.address ?? "";
  console.log(
    `[TxName:${txname}]_script:${challenge_script_redeem.output!.toString(
      "hex",
    )}`,
  );
  console.log(
    `[TxName:${txname}] Waiting till UTXO is detected at addr: ${challenge_addr}`,
  );
  let miner_fee: number = 250;
  let utxos = await waitUntilUTXO(challenge_addr, miner_fee);
  console.log(
    `Trying the Hash lock spend path with UTXO ${utxos[0].txid}:${utxos[0].vout}`,
  );

  const tapLeafScript = {
    leafVersion: challenge_script_redeem.redeemVersion!,
    script: challenge_script_redeem.output!,
    controlBlock: p2tr.witness![p2tr.witness!.length - 1],
  };

  const psbt = new Psbt({ network });
  let utxo_with_maxvalue = utxos[0];
  if (utxos.length > 1) {
    utxos.forEach((utxo, index, array) => {
      if (utxo.value > utxo_with_maxvalue.value) {
        utxo_with_maxvalue = utxo;
      }
    });
  }
  psbt.addInput({
    hash: utxo_with_maxvalue.txid,
    index: utxo_with_maxvalue.vout,
    witnessUtxo: { value: utxo_with_maxvalue.value, script: p2tr.output! },
    tapLeafScript: [tapLeafScript],
  });

  psbt.addOutput({
    address: to_addr, // acount1 address
    value: utxo_with_maxvalue.value - miner_fee, // We need to provide enough fee to miner (1stoash/1byte)
  });

  const customFinalizer = (_inputIndex: number, input: any) => {
    const scriptSolution = inputs;
    const witness = scriptSolution
      .concat(tapLeafScript.script)
      .concat(tapLeafScript.controlBlock);

    return {
      finalScriptWitness: witnessStackToScriptWitness(witness),
    };
  };

  psbt.finalizeInput(0, customFinalizer);
  let tx = psbt.extractTransaction();
  let txHex = tx.toHex();
  console.warn(
    `Transaction Length:${txHex.length / 2}; ${tx.byteLength(
      true,
    )}; ${tx.byteLength(false)}; ${tx.byteLength()}`,
  );
  console.log(`Broadcasting Transaction Hex: ${txHex}`);

  //   tx.outs[0].value = utxo_with_maxvalue.value - txHex.length/2;

  let txid = await broadcast(tx.toHex());
  console.log(`Success! Txid is ${txid}`);
}
