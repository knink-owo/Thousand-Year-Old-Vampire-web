<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import ConfirmDialog, { type ConfirmState } from '../components/ConfirmDialog.vue'

const store = useGameStore()
const hasSave = computed(() => !!store.state && !store.state.finished)

// ---- P2-2：应用内确认/告知弹层（替代 window.confirm / alert） ----
const confirmAsk = ref<ConfirmState | null>(null)

// ---- 建卡表单（依规则书"创建吸血鬼"一节：1 概述记忆 + ≥3 凡人 + 3 技能 + 3 资源 + 3 经历 + 1 不朽者 + 1 印记/经历）----
const name = ref('')
const origin = ref('')
const fastMode = ref(false)

interface NamedItem { name: string; desc?: string }
interface TextItem { text: string }

const mortals = ref<NamedItem[]>([{ name: '', desc: '' }, { name: '', desc: '' }, { name: '', desc: '' }])
const immortalMaker = ref({ name: '', desc: '' })
const skills = ref<NamedItem[]>([{ name: '' }, { name: '' }, { name: '' }])
const resources = ref<NamedItem[]>([{ name: '' }, { name: '' }, { name: '' }])
// 下标 0 为占位（模板 slice(1) 跳过），后 3 项为规则书要求的三项经历
const memories = ref<TextItem[]>([{ text: '' }, { text: '' }, { text: '' }, { text: '' }])
const mark = ref({ name: '', desc: '', origin: '' })

// 每个输入框独立示例（不重复堆在同一句里）
const mortalExamples = ['例如：贡德尔，维京人', '例如：劳伦斯·霍尔穆勒，男爵的后裔', '例如：米内尔家的女儿，出色的决斗者']
const skillExamples = ['例如：击剑', '例如：骑术', '例如：宫廷礼节']
const resourceExamples = ['例如：长船博克苏登', '例如：祖传宝剑', '例如：一块耕地']
const memoryExamples = [
  '例如：贡德尔带我第一次乘坐长船博克苏登出海；当我们首次航行到看不见陆地时，他的触碰让我感到安心。',
  '例如：我在荒野中醒来；风带来了故土的气息。',
  '例如：我向领主复仇，火焰吞没了他的庄园。',
]

// 全部栏位填写完毕后才能开始（规则书：凡人三人、技能三项、资源三项、经历三段、不朽者、印记与经历）
const canStart = computed(() => {
  if (!name.value.trim() || !origin.value.trim()) return false
  if (!mortals.value.every(m => m.name.trim())) return false
  if (!skills.value.every(sk => sk.name.trim())) return false
  if (!resources.value.every(r => r.name.trim())) return false
  if (!memories.value.slice(1).every(m => m.text.trim())) return false
  if (!immortalMaker.value.name.trim()) return false
  if (!mark.value.name.trim() || !mark.value.origin.trim()) return false
  return true
})

/** 清空某项内容（不删除输入框本身） */
function clearItem<T extends { name?: string; text?: string }>(item: T) {
  if (item.name !== undefined) item.name = ''
  if (item.text !== undefined) item.text = ''
}

function resetAll() {
  confirmAsk.value = {
    text: '确定要放弃当前游戏并重新开始吗？所有进度将丢失。',
    onOk: () => {
      store.clearLocalData()
      window.location.reload()
    },
  }
}

function clearAllData() {
  confirmAsk.value = {
    text: '确定清除全部本地数据（含导入的提示包）吗？',
    onOk: () => {
      store.clearLocalData()
      window.location.reload()
    },
  }
}

const packMsg = ref('')
const packErr = ref(false)
const saveMsg = ref('')
const saveErr = ref(false)

function onImportSave(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const ok = store.importGameJson(String(reader.result))
      if (ok && store.state) {
        saveMsg.value = `已恢复「${store.state.name}」的旅程（第 ${store.state.moves} 次回答）`
        saveErr.value = false
      } else {
        saveMsg.value = '导入失败：存档文件格式不正确'
        saveErr.value = true
      }
    } catch {
      saveMsg.value = '导入失败：无法解析 JSON'
      saveErr.value = true
    }
    input.value = ''
  }
  reader.readAsText(file)
}

function onImportPack(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const ok = store.importPackJson(String(reader.result))
      if (ok) {
        packMsg.value = `已导入「${store.pack.meta.name}」（${store.pack.prompts.length} 条提示）`
        packErr.value = false
      } else {
        packMsg.value = '导入失败：文件格式不正确'
        packErr.value = true
      }
    } catch {
      packMsg.value = '导入失败：无法解析 JSON'
      packErr.value = true
    }
    input.value = ''
  }
  reader.readAsText(file)
}

function exportPack() {
  const json = store.exportPackJson()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${store.pack.meta.name}-提示包.json`
  a.click()
  URL.revokeObjectURL(a.href)
  packMsg.value = '已导出'
  packErr.value = false
}

function buildAndStart() {
  if (!canStart.value) return
  // 记忆槽共有 5 个：1 概述 + 3 经历 + 1 印记经历（填写时各占一段）
  const extraCount = memories.value.slice(1).filter(m => m.text.trim()).length
  const markOriginCount = mark.value.origin.trim() ? 1 : 0
  if (1 + extraCount + markOriginCount > 5) {
    confirmAsk.value = {
      okOnly: true,
      text: `记忆槽共有 5 个：第一段概述记忆占 1 个，三项经历最多占 3 个，印记经历占 1 个。你目前填写了 ${extraCount + markOriginCount} 段额外经历，请删减后再开始。`,
    }
    return
  }
  store.newGame(name.value.trim(), fastMode.value)

  // 1. 第一段记忆：概况吸血鬼过去的经历（规则书）——放入第一个记忆
  store.addExperience(null, origin.value.trim(), 0, 0)
  // 2. 至少三个凡人
  for (const m of mortals.value) {
    if (m.name.trim()) store.addCharacter(m.name.trim(), (m.desc ?? '').trim(), false)
  }
  // 3. 三项技能与三项资源（凡人之时的所有）
  for (const sk of skills.value) {
    if (sk.name.trim()) store.addSkill(sk.name.trim())
  }
  for (const r of resources.value) {
    if (r.name.trim()) store.addResource(r.name.trim())
  }
  // 4. 三项经历——每项分别录入一段记忆
  for (const m of memories.value.slice(1)) {
    if (m.text.trim()) store.addExperience(null, m.text.trim(), 0, 0)
  }
  // 5. 不朽者：赋予（或诅咒）你永生的存在
  if (immortalMaker.value.name.trim()) {
    store.addCharacter(immortalMaker.value.name.trim(), immortalMaker.value.desc.trim(), true)
  }
  // 6. 印记 + 成为吸血鬼的经历
  if (mark.value.name.trim()) store.addMark(mark.value.name.trim(), mark.value.desc.trim())
  if (mark.value.origin.trim()) store.addExperience(null, mark.value.origin.trim(), 0, 0)
}
</script>

<template>
  <div class="fade-in">
    <!-- 已有存档恢复 -->
    <div v-if="hasSave" class="card p-6 mb-8 text-center">
      <p class="text-lg">你的旅程尚未终结：<span class="gold-text">{{ store.state?.name }}</span></p>
      <div class="flex gap-4 justify-center mt-4 flex-wrap">
        <button class="btn btn-gold" @click="store.startGame(store.state!)">继续旅程</button>
        <button class="btn btn-ghost" @click="resetAll">放弃这段旅程</button>
        <button class="btn btn-ghost" @click="clearAllData">抹去一切记录</button>
      </div>
    </div>

    <!-- 存档导入（无存档时也提供） -->
    <div v-if="!hasSave" class="card p-5 mb-8 text-center">
      <p class="text-sm opacity-80 mb-3">曾有一段千年被存在别处？可从存档文件续写。</p>
      <label class="cursor-pointer">
        <input type="file" accept=".json" class="hidden" @change="onImportSave" />
        <span class="btn btn-ghost text-sm">导入存档文件 (.json)</span>
      </label>
      <span v-if="saveMsg" class="ml-3 text-sm" :class="saveErr ? 'text-red-300' : 'text-emerald-300'">{{ saveMsg }}</span>
    </div>

    <div class="parchment p-8 md:p-10 text-ink">
      <h2 class="title-serif text-2xl mb-2">始于凡尘</h2>
      <p class="text-sm opacity-80 leading-relaxed mb-8">
        想象一个远古时代的人——一位罗马皇帝、一位美索不达米亚的助产士、一位法国骑士。
        这个人将成为你的吸血鬼。想象他们何时何地出生，以及他们生前是谁。
      </p>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- 左列：身份 -->
        <div class="space-y-6">
          <div>
            <label class="block text-sm mb-2 opacity-80">凡人之名（吸血鬼的过去）</label>
            <input v-model="name" class="input" placeholder="例如：亨利，乔恩之子" />
          </div>
          <div>
            <label class="block text-sm mb-2 opacity-80">第一段记忆 —— 成为吸血鬼之前的生平概述</label>
            <textarea v-model="origin" class="input" placeholder="例如：我是亨利，乔恩之子，出生于公元13世纪的卢瓦尔河谷附近；我是一名被骗取了遗产的贫穷骑士。"></textarea>
          </div>
          <div>
            <label class="block text-sm mb-2 opacity-80">游戏风格</label>
            <div class="flex gap-4 text-sm">
              <label class="flex items-center gap-2 opacity-90">
                <input type="radio" v-model="fastMode" :value="false" /> 日志游戏（写日记）
              </label>
              <label class="flex items-center gap-2 opacity-90">
                <input type="radio" v-model="fastMode" :value="true" /> 快速游戏（记忆区内作答）
              </label>
            </div>
            <p class="text-xs opacity-70 mt-2 leading-relaxed">
              快速模式适合速览一段人生，日志模式适合认真写一本“吸血鬼传记”。
            </p>
          </div>

          <!-- 技能 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">技能（三项，符合其生活境遇）</label>
            <div v-for="(sk, i) in skills" :key="i" class="flex gap-2 mb-2">
              <input v-model="sk.name" class="input" :placeholder="skillExamples[i]" />
              <button class="btn btn-ghost btn-parchment px-3" title="清空此项" @click="clearItem(sk)">×</button>
            </div>
          </div>

          <!-- 资源 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">资源（三项，凡人之时的所有）</label>
            <div v-for="(r, i) in resources" :key="i" class="flex gap-2 mb-2">
              <input v-model="r.name" class="input" :placeholder="resourceExamples[i]" />
              <button class="btn btn-ghost btn-parchment px-3" title="清空此项" @click="clearItem(r)">×</button>
            </div>
          </div>
        </div>

        <!-- 右列：关系与命 -->
        <div class="space-y-6">
          <!-- 凡人角色 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">凡人（至少三人——亲戚、朋友、爱人、敌人、导师……）</label>
            <div v-for="(m, i) in mortals" :key="i" class="flex gap-2 mb-2">
              <input v-model="m.name" class="input flex-1" :placeholder="mortalExamples[i]" />
              <button class="btn btn-ghost btn-parchment px-3" title="清空此项" @click="clearItem(m)">×</button>
            </div>
          </div>

          <!-- 不朽者 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">不朽者 —— 赋予（或诅咒）你永生的存在</label>
            <input v-model="immortalMaker.name" class="input mb-2" placeholder="姓名 · 身份" />
          </div>

          <!-- 印记 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">印记 —— 你成为黑夜生物的可辨标志</label>
            <input v-model="mark.name" class="input mb-2" placeholder="例如：我的脖子永久破裂，我戴上紧围巾并缓慢行走以保持尊严" />
            <textarea v-model="mark.origin" class="input" placeholder="成为吸血鬼的经历（写入记忆）——例如：我在修道院的屋顶上与阴森的巴伦·霍尔穆勒决斗；他几乎砍掉我的头，但我没有死。" />
          </div>

          <!-- 三项经历（规则书：每项写入一段独立记忆） -->
          <div>
            <label class="block text-sm mb-2 opacity-80">三项经历 —— 每项分别录入一段记忆</label>
            <div v-for="(m, i) in memories.slice(1)" :key="i" class="flex gap-2 mb-2">
              <textarea v-model="m.text" class="input" :placeholder="memoryExamples[i]"></textarea>
              <button class="btn btn-ghost btn-parchment px-3 self-start" title="清空此项" @click="clearItem(m)">×</button>
            </div>
            <p class="text-xs opacity-90 mt-2">记忆槽共 5 个：第一段概述占 1 个，三项经历与印记经历占其余 4 个。</p>
          </div>
        </div>
      </div>

      <div class="blood-divider my-8"></div>
      <div class="text-center">
        <button class="btn btn-gold btn-parchment text-lg px-10" :disabled="!canStart" @click="buildAndStart">
          🩸 成为黑夜的生物
        </button>
        <p v-if="!canStart" class="text-sm opacity-90 mt-3">请填完上方所有栏位后，才能开始这段千年</p>
      </div>
    </div>

    <!-- 提示包管理 -->
    <div class="card p-5 mt-6">
      <h3 class="title-serif text-base gold-text mb-1">提示包</h3>
      <p class="text-xs opacity-60 mb-3">
        当前：{{ store.pack.meta.name }}（{{ store.pack.prompts.length }} 条提示）。
        提示包是<strong>独立的数据层</strong>——你可以导入自创或社区提示包、或导出当前包备份。
      </p>
      <div class="flex flex-wrap gap-3 items-center">
        <label class="text-xs opacity-70 cursor-pointer">
          <input type="file" accept=".json" class="hidden" @change="onImportPack" />
          <span class="btn btn-ghost text-xs">导入提示包 (.json)</span>
        </label>
        <button class="btn btn-ghost text-xs" @click="exportPack">导出当前提示包</button>
        <span v-if="packMsg" class="text-xs" :class="packErr ? 'text-red-300' : 'text-emerald-300'">{{ packMsg }}</span>
      </div>
    </div>

    <!-- P2-2：应用内确认/告知弹层 -->
    <ConfirmDialog
      :state="confirmAsk"
      @ok="() => { confirmAsk?.onOk?.(); confirmAsk = null }"
      @cancel="confirmAsk = null"
    />
  </div>
</template>