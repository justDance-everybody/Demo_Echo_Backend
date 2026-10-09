// 通讯录映射：名称 -> 地址
const CONTACTS = {
  '小红': 'D4U7BDNUVRsZsJnmCjUiwogjdckSNr43skivYhNCXbnm',
};

// 将文本中的联系人名称替换为地址
export function replaceContactsInText(text) {
  if (!text || typeof text !== 'string') return text;
  let replaced = text;
  for (const [name, address] of Object.entries(CONTACTS)) {
    const re = new RegExp(name, 'g');
    replaced = replaced.replace(re, address);
  }
  return replaced;
}

// 将参数对象中的常见收款人字段替换为地址
export function replaceContactsInParams(params) {
  if (!params || typeof params !== 'object') return params;
  const result = { ...params };
  const candidateKeys = ['recipient', 'to', 'address', 'to_address', 'target', 'receiver'];
  for (const key of candidateKeys) {
    const value = result[key];
    if (typeof value === 'string') {
      result[key] = replaceContactsInText(value);
    }
  }
  return result;
}

export default {
  replaceContactsInText,
  replaceContactsInParams,
};


