import type { zh } from './zh'

/** 所有可翻译文案的键（由 zh 字典推导，缺键即编译报错） */
export type MsgKey = keyof typeof zh

/** 每个键都必须有字符串值；en 必须与 zh 键集合一致 */
export type Messages = { readonly [K in MsgKey]: string }
