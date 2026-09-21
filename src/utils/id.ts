/**
 * 会话内的自增 id。
 * 项目数据目前全部驻留在内存里，没有持久化需求，因此不需要 uuid。
 */
let seq = 0

export const nextId = (prefix: string): string => `${prefix}-${(seq += 1)}`
