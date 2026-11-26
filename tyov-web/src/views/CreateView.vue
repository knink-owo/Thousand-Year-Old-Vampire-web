<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import ConfirmDialog, { type ConfirmState } from '../components/ConfirmDialog.vue'
import { t, type MsgKey } from '../i18n'

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

// 每个输入框独立示例（不重复堆在同一句里）；存键名，随语言切换
const mortalExamples: MsgKey[] = ['create.exMortal1', 'create.exMortal2', 'create.exMortal3']
const skillExamples: MsgKey[] = ['create.exSkill1', 'create.exSkill2', 'create.exSkill3']
const resourceExamples: MsgKey[] = ['create.exRes1', 'create.exRes2', 'create.exRes3']
const memoryExamples: MsgKey[] = ['create.exMem1', 'create.exMem2', 'create.exMem3']

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
    text: t('create.resetConfirm'),
    onOk: () => {
      store.clearLocalData()
      window.location.reload()
    },
  }
}

function clearAllData() {
  confirmAsk.value = {
    text: t('create.clearConfirm'),
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
        saveMsg.value = t('create.importSaveOk', { name: store.state.name, n: store.state.moves })
        saveErr.value = false
      } else {
        saveMsg.value = t('create.importFailFormat')
        saveErr.value = true
      }
    } catch {
      saveMsg.value = t('create.importFailJson')
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
        packMsg.value = t('create.packImported', { name: store.pack.meta.name, n: store.pack.prompts.length })
        packErr.value = false
      } else {
        packMsg.value = t('create.packImportFail')
        packErr.value = true
      }
    } catch {
      packMsg.value = t('create.importFailJson')
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
  a.download = t('create.packFileName', { name: store.pack.meta.name })
  a.click()
  URL.revokeObjectURL(a.href)
  packMsg.value = t('create.exported')
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
      text: t('create.memoryOverflow', { n: extraCount + markOriginCount }),
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
      <p class="text-lg">{{ t('create.resumeTitle') }} <span class="gold-text">{{ store.state?.name }}</span></p>
      <div class="flex gap-4 justify-center mt-4 flex-wrap">
        <button class="btn btn-gold" @click="store.startGame(store.state!)">{{ t('create.continue') }}</button>
        <button class="btn btn-ghost" @click="resetAll">{{ t('create.abandon') }}</button>
        <button class="btn btn-ghost" @click="clearAllData">{{ t('create.wipe') }}</button>
      </div>
    </div>

    <!-- 存档导入（无存档时也提供） -->
    <div v-if="!hasSave" class="card p-5 mb-8 text-center">
      <p class="text-sm opacity-80 mb-3">{{ t('create.importHint') }}</p>
      <label class="cursor-pointer">
        <input type="file" accept=".json" class="hidden" @change="onImportSave" />
        <span class="btn btn-ghost text-sm">{{ t('create.importSave') }}</span>
      </label>
      <span v-if="saveMsg" class="ml-3 text-sm" :class="saveErr ? 'text-red-300' : 'text-emerald-300'">{{ saveMsg }}</span>
    </div>

    <div class="parchment p-8 md:p-10 text-ink">
      <h2 class="title-serif text-2xl mb-2">{{ t('create.title') }}</h2>
      <p class="text-sm opacity-80 leading-relaxed mb-8">
        {{ t('create.intro') }}
      </p>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- 左列：身份 -->
        <div class="space-y-6">
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.nameLabel') }}</label>
            <input v-model="name" class="input" :placeholder="t('create.namePh')" />
          </div>
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.originLabel') }}</label>
            <textarea v-model="origin" class="input" :placeholder="t('create.originPh')"></textarea>
          </div>
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.styleLabel') }}</label>
            <div class="flex gap-4 text-sm flex-wrap">
              <label class="flex items-center gap-2 opacity-90">
                <input type="radio" v-model="fastMode" :value="false" /> {{ t('create.styleJournal') }}
              </label>
              <label class="flex items-center gap-2 opacity-90">
                <input type="radio" v-model="fastMode" :value="true" /> {{ t('create.styleFast') }}
              </label>
            </div>
            <p class="text-xs opacity-70 mt-2 leading-relaxed">
              {{ t('create.styleHint') }}
            </p>
          </div>

          <!-- 技能 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.skillsLabel') }}</label>
            <div v-for="(sk, i) in skills" :key="i" class="flex gap-2 mb-2">
              <input v-model="sk.name" class="input" :placeholder="t(skillExamples[i])" />
              <button class="btn btn-ghost btn-parchment px-3" :title="t('create.clearItem')" @click="clearItem(sk)">×</button>
            </div>
          </div>

          <!-- 资源 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.resourcesLabel') }}</label>
            <div v-for="(r, i) in resources" :key="i" class="flex gap-2 mb-2">
              <input v-model="r.name" class="input" :placeholder="t(resourceExamples[i])" />
              <button class="btn btn-ghost btn-parchment px-3" :title="t('create.clearItem')" @click="clearItem(r)">×</button>
            </div>
          </div>
        </div>

        <!-- 右列：关系与命 -->
        <div class="space-y-6">
          <!-- 凡人角色 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.mortalsLabel') }}</label>
            <div v-for="(m, i) in mortals" :key="i" class="flex gap-2 mb-2">
              <input v-model="m.name" class="input flex-1" :placeholder="t(mortalExamples[i])" />
              <button class="btn btn-ghost btn-parchment px-3" :title="t('create.clearItem')" @click="clearItem(m)">×</button>
            </div>
          </div>

          <!-- 不朽者 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.immortalLabel') }}</label>
            <input v-model="immortalMaker.name" class="input mb-2" :placeholder="t('create.immortalPh')" />
          </div>

          <!-- 印记 -->
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.markLabel') }}</label>
            <input v-model="mark.name" class="input mb-2" :placeholder="t('create.markPh')" />
            <textarea v-model="mark.origin" class="input" :placeholder="t('create.markOriginPh')" />
          </div>

          <!-- 三项经历（规则书：每项写入一段独立记忆） -->
          <div>
            <label class="block text-sm mb-2 opacity-80">{{ t('create.experiencesLabel') }}</label>
            <div v-for="(m, i) in memories.slice(1)" :key="i" class="flex gap-2 mb-2">
              <textarea v-model="m.text" class="input" :placeholder="t(memoryExamples[i])" />
              <button class="btn btn-ghost btn-parchment px-3 self-start" :title="t('create.clearItem')" @click="clearItem(m)">×</button>
            </div>
            <p class="text-xs opacity-90 mt-2">{{ t('create.experiencesHint') }}</p>
          </div>
        </div>
      </div>

      <div class="blood-divider my-8"></div>
      <div class="text-center">
        <button class="btn btn-gold btn-parchment text-lg px-10" :disabled="!canStart" @click="buildAndStart">
          {{ t('create.start') }}
        </button>
        <p v-if="!canStart" class="text-sm opacity-90 mt-3">{{ t('create.incomplete') }}</p>
      </div>
    </div>

    <!-- 提示包管理 -->
    <div class="card p-5 mt-6">
      <h3 class="title-serif text-base gold-text mb-1">{{ t('create.packTitle') }}</h3>
      <p class="text-xs opacity-60 mb-3">
        {{ t('create.packCurrent', { name: store.pack.meta.name, n: store.pack.prompts.length }) }}
        {{ t('create.packNoteBefore') }}<strong>{{ t('create.packNoteStrong') }}</strong>{{ t('create.packNoteAfter') }}
      </p>
      <div class="flex flex-wrap gap-3 items-center">
        <label class="text-xs opacity-70 cursor-pointer">
          <input type="file" accept=".json" class="hidden" @change="onImportPack" />
          <span class="btn btn-ghost text-xs">{{ t('create.importPack') }}</span>
        </label>
        <button class="btn btn-ghost text-xs" @click="exportPack">{{ t('create.exportPack') }}</button>
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
