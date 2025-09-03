#!/usr/bin/env node
/**
 * 生成Solana测试钱包的Node.js脚本
 * 运行: node generate_solana_wallet.js
 */

const { Keypair } = require('@solana/web3.js');
console.log('🔑 正在生成Solana测试钱包...\n');

// 生成新的密钥对
const keypair = Keypair.generate();

// 获取公钥（钱包地址）
const publicKey = keypair.publicKey.toString();

// 获取私钥（多种格式）
const bs58 = require('bs58').default;
const privateKeyBase58 = bs58.encode(keypair.secretKey);
const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
const privateKeyHex = Buffer.from(keypair.secretKey).toString('hex');

// 获取私钥数组格式
const privateKeyArray = Array.from(keypair.secretKey);

console.log('✅ 钱包生成成功！');
console.log('=====================================');
console.log('🏠 钱包地址 (Public Key):');
console.log(publicKey);
console.log('\n🔐 私钥 (Base58格式 - 推荐用于MCP):');
console.log(privateKeyBase58);
console.log('\n🔐 私钥 (Base64格式):');
console.log(privateKeyBase64);
console.log('\n🔐 私钥 (Hex格式):');
console.log(privateKeyHex);
console.log('\n📝 私钥数组格式:');
console.log(JSON.stringify(privateKeyArray));
console.log('=====================================');

console.log('\n📋 下一步操作:');
console.log('1. 复制上面的私钥到MCP配置文件的 SOLANA_PRIVATE_KEY');
console.log('2. 访问 https://faucet.solana.com/ 为钱包充值测试SOL');
console.log('3. 在faucet页面粘贴钱包地址:', publicKey);
console.log('4. 启用MCP服务器开始测试\n');

// 保存到文件
const walletData = {
  publicKey: publicKey,
  privateKeyBase58: privateKeyBase58,
  privateKeyBase64: privateKeyBase64,
  privateKeyHex: privateKeyHex,
  privateKeyArray: privateKeyArray,
  created: new Date().toISOString()
};

require('fs').writeFileSync('solana-test-wallet.json', JSON.stringify(walletData, null, 2));
console.log('💾 钱包信息已保存到: solana-test-wallet.json');