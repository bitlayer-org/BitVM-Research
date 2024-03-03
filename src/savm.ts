import {
  savm_generate_specific_gate_fail_script,
  //   savm_gates_script,
  savm_generate_all_bit_commitment_scripts_inputs,
  savm_generate_all_gates_bit_commitment_scripts,
  generate_relate_time_lock_script,
  construct_scripts_taptree,
  send_tx,
} from "./script_help";
import { getRandomNumbers } from "./utils";
import {
  initEccLib,
  networks,
  script,
  Signer,
  payments,
  crypto,
  Psbt,
} from "bitcoinjs-lib";
import { TinySecp256k1Interface } from "ecpair";
import { toXOnly } from "./utils";
import { assert } from "console";
const tinysecp: TinySecp256k1Interface = require("tiny-secp256k1");
initEccLib(tinysecp as any);
const network = networks.testnet;

export async function savm_bit_commitment_tx(keypair: Signer) {
  let premiages0 = getRandomNumbers(8);
  let premiages1 = getRandomNumbers(8);
  assert(premiages0.length == 8);
  assert(premiages1.length == 8);
  let preimage_hashs0: Buffer[] = [];
  let preimage_hashs1: Buffer[] = [];
  premiages0.forEach((value, index, array) => {
    preimage_hashs0.push(crypto.hash160(value));
    console.log(`premiages0:${premiages0[index].toString("hex")}`);
    console.log(`preimage_hashs0:${preimage_hashs0[index].toString("hex")}`);
  });
  premiages1.forEach((value, index, array) => {
    preimage_hashs1.push(crypto.hash160(value));
    console.log(`premiages1:${premiages1[index].toString("hex")}`);
    console.log(`preimage_hashs1:${preimage_hashs1[index].toString("hex")}`);
  });

  // construct all bit value commitment
  let bit_commitment_script = savm_generate_all_gates_bit_commitment_scripts(
    preimage_hashs0,
    preimage_hashs1,
  );
  // confirm stack size equal to 1
  bit_commitment_script = `${bit_commitment_script} OP_1`;
  // verifier can refunds after waiting 10 blocks
  let verifier_refund_time_lock_script = generate_relate_time_lock_script(10);
  console.log(`time_lock_script:${verifier_refund_time_lock_script}`);
  console.log(`bit_commitment_script:${bit_commitment_script}`);
  let bit_commitment_taptree = construct_scripts_taptree([
    bit_commitment_script,
    verifier_refund_time_lock_script,
  ]);

  const bit_commitment_script_redeem = {
    output: script.fromASM(bit_commitment_script),
    redeemVersion: 192,
  };

  const bit_commitment_script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree: bit_commitment_taptree,
    redeem: bit_commitment_script_redeem,
    network,
  });
  // A = 1, B=0, C=1, D=1, E=1, F=0, G=1, H=1
  let prover_inputs = savm_generate_all_bit_commitment_scripts_inputs(
    premiages0,
    premiages1,
    [1, 0, 1, 1, 1, 0, 1, 1],
  );

  // construct transaction
  await send_tx(
    "bit_commitment_script redeem",
    bit_commitment_script_p2tr,
    "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz",
    prover_inputs,
    keypair,
  );

  // A NAND B = E
  let gate1_script = savm_generate_specific_gate_fail_script(
    preimage_hashs0,
    preimage_hashs1,
    0,
    1,
    4,
  );
  // C NAND D = F
  let gate2_script = savm_generate_specific_gate_fail_script(
    preimage_hashs0,
    preimage_hashs1,
    2,
    3,
    5,
  );
  // E NAND F = G
  let gate3_script = savm_generate_specific_gate_fail_script(
    preimage_hashs0,
    preimage_hashs1,
    4,
    5,
    6,
  );
  // F NAND G = H
  let gate4_script = savm_generate_specific_gate_fail_script(
    preimage_hashs0,
    preimage_hashs1,
    5,
    6,
    7,
  );
  // time lock script
  // prover can refund after waiting 20 blocks
  let prover_refund_time_lock_script = generate_relate_time_lock_script(20);

  let gates_fail_scripts_tree = construct_scripts_taptree([
    gate1_script,
    gate2_script,
    gate3_script,
    gate4_script,
    prover_refund_time_lock_script,
  ]);
  const gates_fail_scripts_redeem = {
    output: script.fromASM(gate1_script),
    redeemVersion: 192,
  };

  const gates_fail_scripts_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keypair.publicKey),
    scriptTree: gates_fail_scripts_tree,
    redeem: gates_fail_scripts_redeem,
    network,
  });
  // A NAND B = E ; 1 NAND 0 = 0 (the correct version is 1 NAND 0 = 1)
  let verifier_inputs: Buffer[] = [
    premiages1[0], // A=1
    Buffer.from([0x01]), // OP_IF
    premiages0[1], // B=0
    Buffer.from([]), //OP_ELSE
    premiages0[4], // C=0
    Buffer.from([]), //OP_ELSE
  ];

  await send_tx(
    "verifier_check",
    gates_fail_scripts_p2tr,
    "mscxdTxVSoR8VyRkZEGJ4dxECJXcXfQqVz",
    verifier_inputs,
    keypair,
  );
}
