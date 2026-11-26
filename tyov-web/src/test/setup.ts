import { beforeEach } from 'vitest'
import { setLocale } from '../i18n'

/**
 * 测试默认用中文（产品默认是英文）。
 * 现存断言以中文写成，显式钉住语言比批量改写断言更稳；
 * 需要英文的用例在测试体内自行 setLocale('en')。
 */
beforeEach(() => {
  setLocale('zh')
})
