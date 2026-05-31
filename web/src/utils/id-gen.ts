/**
 * 生成 32 位标准 UUID（不带连字符）。
 */
export function uuid(): string {
    return crypto.randomUUID().replace(/-/g, '');
}

/**
 * 生成 8 位短 UUID（小写字母）。
 */
export function short_uuid(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}
