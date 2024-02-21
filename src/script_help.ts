import {
  initEccLib,
  networks,
  script,
  Signer,
  payments,
  Psbt,
} from "bitcoinjs-lib";
import { broadcast, waitUntilUTXO } from "./blockstream_utils";
import { TinySecp256k1Interface } from "ecpair";
import { Taptree, Tapleaf } from "bitcoinjs-lib/src/types";
import { witnessStackToScriptWitness } from "./witness_stack_to_script_witness";
import { toXOnly } from "./utils";
import { assert } from "console";
const tinysecp: TinySecp256k1Interface = require("tiny-secp256k1");
initEccLib(tinysecp as any);
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
// https://github.com/tianmingyun/MasterBitcoin2CN/blob/master/ch07.md
// 如果furture_block_number/nlocktime不为零，低于5亿，则将其解释为区块高度，这意味着交易在指定的区块高度之前无效，并且不被传播，也不被包含在区块链中。如果大于或等于5亿，它被解释为Unix纪元时间戳（自1-1-1970之后的秒数），并且交易在指定时间之前无效
// 更确切地说，如果出现以下任一情况，CHECKLOCKTIMEVERIFY失败并停止执行，标记交易无效（来自：BIP-65）：
//
//
//
// CLTV不替换nLocktime，而是限制特定的UTXO，使它们只能在大于或等于nLocktime设置的值的将来交易中使用。
// CLTV操作码采用一个参数作为输入，为与nLocktime相同格式的数字（区块高度或Unix纪元时间）
//
// 堆栈是空的
// 堆栈中的顶部项小于0
// 顶层堆栈项和nLocktime字段的锁定时间类型（高度或者时间戳）不相同
// 顶层堆栈项大于交易的nLocktime字段
// 输入的nSequence字段为0xffffffff
// 注释 CLTV和nLocktime描述时间锁必须使用相同的格式，无论是区块高度还是自Unix纪元以来经过的秒数。 最重要的是，在一起使用时，nLocktime的格式必须与输出中的CLTV格式相匹配，它们必须都是区块高度或都是秒数时间。
export function generate_absoluate_time_lock_script(
  furture_block_number: number,
): string {
  const script = `${Buffer.from([furture_block_number]).toString(
    "hex",
  )} OP_NOP2 OP_DROP`;
  return script;
}
// nSequence相对时间锁
// 从编程角度，如果没有设置最高位（1<<31位 ）为1，意味着它是一个表示“相对锁定时间”的标志.
//
// 相对时间锁可以设置在每个交易输入中，方法是设置每个输入中的nSequence字段。
// 交易的输入中的nSequence值小于231，就表示具有相对时间锁。这种交易中的输入只有相对锁定时间到期后才能有效。
// 例如，一笔交易的输入的nSequence相对时间锁是30个区块，那么只有当输入引用的UTXO被挖出后再经过30个区块之后，该交易才有效。
// 由于nSequence是每个输入中的字段，因此交易可能包含任何数量的时间锁定输入，这其中的每个输入都必须满足时间限制交易才能有效。交易中的输入可以是时间锁定输入（nSequence <231），也可以是没有相对时间锁定（nSequence> = 231）的输入。
//
// nSequence值以块或秒为单位，但与nLocktime中使用的格式略有不同。类型（type）标志用于区分计数块和计数时间（以秒为单位）。
// 类型标志设置在第23个最低有效位（即值1 << 22）。如果设置了类型标志，则nSequence值将被解释为512秒的倍数。如果未设置类型标志，则nSequence值被解释为区块数。
// 当将nSequence解释为相对时间锁时，只考虑16个最低有效位。一旦对标志（位32和23）求值，nSequence值通常用16位掩码（例如nSequence或者0x0000FFFF）进行“屏蔽”。
export function generate_relate_time_lock_script(
  wait_block_num: number,
): string {
  const script = `${Buffer.from([wait_block_num]).toString(
    "hex",
  )} OP_NOP OP_DROP`;
  return script;
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

// export function savm_generate_bitcommitment_script(
//   hash0: Buffer,
//   hash1: Buffer,
// ): string {
//   const bitvalue_script_asm = `OP_IF OP_HASH160 ${hash1.toString(
//     "hex",
//   )} OP_EQUALVERIFY OP_ELSE OP_HASH160 ${hash0.toString(
//     "hex",
//   )} OP_EQUALVERIFY OP_ENDIF`;
//   return bitvalue_script_asm;
// }

export function savm_generate_bitcommitment_script(
  hash0: Buffer,
  hash1: Buffer,
): string {
  const bitvalue_script_asm = `OP_DUP OP_HASH160 ${hash1.toString(
    "hex",
  )} OP_EQUAL OP_SWAP OP_HASH160 ${hash0.toString(
    "hex",
  )} OP_EQUAL OP_ADD OP_1 OP_EQUALVERIFY`;
  return bitvalue_script_asm;
}

export function savm_generate_all_bit_commitment_scripts_inputs(
  premiages0_list: Buffer[],
  preimages1_list: Buffer[],
  gates_input_value: number[],
) {
  assert(premiages0_list.length == preimages1_list.length);
  assert(premiages0_list.length == gates_input_value.length);
  let inputs: Buffer[] = [];
  premiages0_list.forEach((value, index, array) => {
    if (gates_input_value[index] == 1) {
      // inputs.push(Buffer.from([0x1]));
      inputs.push(preimages1_list[index]);
    } else if (gates_input_value[index] == 0) {
      // inputs.push(Buffer.from([]));
      inputs.push(premiages0_list[index]);
    }
  });
  inputs = inputs.reverse();
  return inputs;
}

export function savm_generate_all_gates_bit_commitment_scripts(
  hash0_list: Buffer[],
  hash1_list: Buffer[],
): string {
  assert(hash0_list.length == hash1_list.length);
  let complete_script = "";
  hash0_list.forEach((value, index, array) => {
    let bs = savm_generate_bitcommitment_script(
      hash0_list[index],
      hash1_list[index],
    );
    if (index != 0) {
      complete_script = `${complete_script} ${bs}`;
    } else {
      complete_script = bs;
    }
  });

  return complete_script;
  // the inputs for this savm script
  // [gate1_hash0, gate1_hash1 ... gaten_hash0,gaten_hash1]
}

export function savm_generate_specific_gate_fail_script(
  preimage_hashs0: Buffer[],
  preimage_hashs1: Buffer[],
  left_operator_index: number,
  right_operator_index: number,
  result_index: number,
): string {
  assert(preimage_hashs0.length == preimage_hashs1.length);
  assert(left_operator_index < preimage_hashs0.length);
  assert(right_operator_index < preimage_hashs0.length);
  assert(result_index < preimage_hashs0.length);
  return generate_NAND_Fail_gate_script(
    preimage_hashs0[left_operator_index],
    preimage_hashs1[left_operator_index],
    preimage_hashs0[right_operator_index],
    preimage_hashs0[right_operator_index],
    preimage_hashs0[result_index],
    preimage_hashs1[result_index],
  );
}

// NAND Fail case:
// 1 NAND 0 = 0
// 1 NAND 1 = 1
// 0 NAND 1 = 0
// 0 NAND 0 = 0
// NAND Success case:
// 1 NAND 1 = 0
// 0 NAND 1 = 1
// 0 NAND 0 = 1
// 1 NAND 0 = 1
export function generate_NAND_Fail_gate_script(
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
  const complete_script_asm = `${C_bitvalue_script} OP_TOALTSTACK ${B_bitvalue_script} OP_TOALTSTACK ${A_bitvalue_script} OP_FROMALTSTACK OP_BOOLAND OP_NOT OP_FROMALTSTACK OP_EQUAL OP_0 OP_EQUALVERIFY OP_1`;
  return complete_script_asm;
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
