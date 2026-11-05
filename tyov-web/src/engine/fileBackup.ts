// 单文件（file://）模式下的存档加固
// ------------------------------------------------------------------
// 问题：以 file:// 打开时，浏览器给页面的是"空源（null origin）"，
// localStorage 可能不稳定（隐私模式直接禁用、或与其他本地文件共享同一键而互相覆盖）。
// 方案：检测到 file:// 时，允许玩家绑定一个本地 .json 备份文件
// （File System Access API），此后每次存档都额外静默写入该文件。
// 说明：FileSystemFileHandle 无法序列化，因此每次会话需重新绑定；备份文件本身持久存在。

/** 是否以 file:// 协议打开（单文件双击场景） */
export function isFileProtocol(): boolean {
  try {
    return location.protocol === 'file:'
  } catch {
    return false
  }
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

type ShowSaveFilePicker = (opts?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>

/** 浏览器是否支持 File System Access 的"另存为"（Chromium 系：Chrome / Edge） */
export function supportsFileBackup(): boolean {
  return typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function'
}

let handle: FileSystemFileHandle | null = null
let boundName = ''
const listeners = new Set<(name: string) => void>()

export function getBackupName(): string {
  return boundName
}

/** 订阅绑定状态变化（用于 UI 展示文件名） */
export function onBackupChange(fn: (name: string) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 让用户选择一个备份文件并绑定（必须在用户点击手势中调用） */
export async function bindBackupFile(): Promise<boolean> {
  if (!supportsFileBackup()) return false
  try {
    const picker = (window as unknown as { showSaveFilePicker: ShowSaveFilePicker }).showSaveFilePicker
    const h = await picker({
      // 固定文件名：避免每次重绑时因日期变化而"分叉"出多个备份文件
      suggestedName: '千年吸血鬼存档.tyov.json',
      types: [
        {
          description: '千年吸血鬼存档',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })
    handle = h
    boundName = h.name
    listeners.forEach((fn) => fn(boundName))
    return true
  } catch {
    // 用户取消选择或权限被拒
    return false
  }
}

// 串行写入：避免并发 createWritable 冲突，只保留最新一份待写内容
let writing = false
let pending: string | null = null

/** 将存档 JSON 写入已绑定的备份文件；未绑定或失败时静默返回，不阻断游戏 */
export async function writeBackup(json: string): Promise<void> {
  if (!handle) return
  pending = json
  if (writing) return
  writing = true
  try {
    while (pending !== null) {
      const data = pending
      pending = null
      const stream = await handle.createWritable()
      await stream.write(data)
      await stream.close()
    }
  } catch {
    // 备份失败不应影响正常游玩
  } finally {
    writing = false
  }
}
