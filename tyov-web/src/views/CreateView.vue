<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const hasSave = computed(() => !!store.state)

// ---- 建卡表单 ----
const name = ref('')
const origin = ref('')
const fastMode = ref(false)

interface NamedItem { name: string; desc?: string }
interface TextItem { text: string }

const mortals = ref<NamedItem[]>([{ name: '', desc: '' }])
const immortalMaker = ref({ name: '', desc: '' })
const skills = ref<NamedItem[]>([{ name: '' }])
const resources = ref<NamedItem[]>([{ name: '' }])
const memories = ref<TextItem[]>([{ text: '' }])
const mark = ref({ name: '', desc: '' })

const canStart = computed(() => name.value.trim().length > 0 && origin.value.trim().length > 0)

function addItem<T>(list: T[], item: T) {
  list.push(item)
}

function resetAll() {
  if (window.confirm('确定要放弃当前游戏并重新开始吗？所有进度将丢失。')) {
    localStorage.removeItem('tyov:save:v1')
    window.location.reload()
  }
}

function clearAllData() {
  if (window.confirm('确定清除全部本地数据（含导入的提示包）吗？')) {
    localStorage.clear()
    window.location.reload()
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
  store.newGame(name.value.trim(), fastMode.value)

  const s = store.state
  void s
  // 初始记忆（生平概述）→ 第一段记忆
  store.addExperience(null, origin.value.trim(), 0, 0)
  // 三个（或更多）凡人
  for (const m of mortals.value) {
    if (m.name.trim()) store.addCharacter(m.name.trim(), (m.desc ?? '').trim(), false)
  }
  // 不朽者（赐予永生的存在）
  if (immortalMaker.value.name.trim()) {
    store.addCharacter(immortalMaker.value.name.trim(), `${immortalMaker.value.desc.trim()}；${mark.value.desc.trim()}`.trim().replace(/(^；|；$)/, ''), true)
  }
  // 技能
  for (const sk of skills.value) {
    if (sk.name.trim()) store.addSkill(sk.name.trim())
  }
  // 资源
  for (const r of resources.value) {
    if (r.name.trim()) store.addResource(r.name.trim())
  }
  // 印记
  if (mark.value.name.trim()) store.addMark(mark.value.name.trim(), mark.value.desc.trim())
  // 其余经历（放入新的记忆）
  for (const m of memories.value.slice(1)) {
    if (m.text.trim()) store.addExperience(null, m.text.trim(), 0, 0)
  }
}
</script>

<template>
  <div class="fade-in">
    <!-- 已有存档恢复 -->
    <div v-if="hasSave" class="card p-6 mb-8 text-center">
      <p class="text-lg">游戏尚未结束：<span class="gold-text">{{ store.state?.name }}</span></p>
      <div class="flex gap-4 justify-center mt-4 flex-wrap">
        <button class="btn btn-gold" @click="store.startGame(store.state!)">继续旅程</button>
        <button class="btn btn-ghost" @click="resetAll">弃置旧档</button>
        <button class="btn btn-ghost" @click="clearAllData">清除全部数据</button>
      </div>
    </div>

    <!-- 存档导入（无存档时也提供） -->
    <div v-if="!hasSave" class="card p-5 mb-8 text-center">
      <p class="text-sm opacity-80 mb-3">已有游戏存档文件？可从 JSON 恢复旅程。</p>
      <label class="cursor-pointer">
        <input type="file" accept=".json" class="hidden" @change="onImportSave" />
        <span class="btn btn-ghost text-sm">导入存档文件 (.json)</span>
      </label>
      <span v-if="saveMsg" class="ml-3 text-sm" :class="saveErr ? 'text-red-300' : 'text-emerald-300'">{{ saveMsg }}</span>
    </div>

    <div class="parchment p-8 md:p-10 text-ink">
      <h2 class="title-serif text-2xl mb-2">创造你的吸血鬼</h2>
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
          </div>

          <!-- 技能 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">技能（三项，符合其生活境遇）</label>
            <div v-for="(sk, i) in skills" :key="i" class="flex gap-2 mb-2">
              <input v-model="sk.name" class="input" placeholder="例如：击剑、骑术、宫廷礼节" />
              <button v-if="skills.length > 1" class="btn btn-ghost btn-parchment px-3" @click="skills.splice(i, 1)">×</button>
            </div>
            <button class="btn btn-ghost btn-parchment text-sm mt-1" @click="addItem(skills, { name: '' })">＋ 加一项</button>
          </div>

          <!-- 资源 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">资源（三项，凡人之时的所有）</label>
            <div v-for="(r, i) in resources" :key="i" class="flex gap-2 mb-2">
              <input v-model="r.name" class="input" placeholder="例如：长船博克苏登、祖传宝剑、一块耕地" />
              <button v-if="resources.length > 1" class="btn btn-ghost btn-parchment px-3" @click="resources.splice(i, 1)">×</button>
            </div>
            <button class="btn btn-ghost btn-parchment text-sm mt-1" @click="addItem(resources, { name: '' })">＋ 加一项</button>
          </div>
        </div>

        <!-- 右列：关系与命 -->
        <div class="space-y-6">
          <!-- 凡人角色 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">凡人（至少三人——亲戚、朋友、爱人、敌人、导师……）</label>
            <div v-for="(m, i) in mortals" :key="i" class="flex gap-2 mb-2">
              <input v-model="m.name" class="input flex-1" placeholder="姓名 · 一句话描述" />
              <button v-if="mortals.length > 1" class="btn btn-ghost btn-parchment px-3" @click="mortals.splice(i, 1)">×</button>
            </div>
            <button class="btn btn-ghost btn-parchment text-sm mt-1" @click="addItem(mortals, { name: '', desc: '' })">＋ 加一位凡人</button>
          </div>

          <!-- 不朽者 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">不朽者 —— 赋予（或诅咒）你永生的存在</label>
            <input v-model="immortalMaker.name" class="input mb-2" placeholder="姓名 · 身份" />
          </div>

          <!-- 印记 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">印记 —— 你成为黑夜生物的标志，及如何得来的经历</label>
            <input v-model="mark.name" class="input mb-2" placeholder="例如：我的脖子永久破裂，我戴上紧围巾并缓慢行走以保持尊严" />
          </div>

          <!-- 更多经历 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">更多经历（可选）—— 每段写入一段记忆</label>
            <div v-for="(m, i) in memories.slice(1)" :key="i" class="flex gap-2 mb-2">
              <textarea v-model="m.text" class="input" :placeholder="`经历 ${i + 2}：贡德尔带我第一次乘坐长船博克苏登出海；当我们首次航行到看不见陆地时，他的触碰让我感到安心。`"></textarea>
              <button v-if="memories.length > 1" class="btn btn-ghost btn-parchment px-3 self-start" @click="memories.splice(i + 1, 1)">×</button>
            </div>
            <button class="btn btn-ghost btn-parchment text-sm mt-1" @click="addItem(memories, { text: '' })">＋ 加一段经历</button>
          </div>
        </div>
      </div>

      <div class="blood-divider my-8"></div>
      <div class="text-center">
        <button class="btn btn-gold btn-parchment text-lg px-10" :disabled="!canStart" @click="buildAndStart">
          🩸 成为黑夜的生物
        </button>
        <p v-if="!canStart" class="text-sm opacity-60 mt-3">请先写下姓名与第一段记忆</p>
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
  </div>
</template>