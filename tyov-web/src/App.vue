<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGameStore } from './stores/game'
import HomeView from './views/HomeView.vue'
import CreateView from './views/CreateView.vue'
import GameView from './views/GameView.vue'
import FinishView from './views/FinishView.vue'
import TutorialView from './views/TutorialView.vue'
import HistoryView from './views/HistoryView.vue'
import ReviewView from './views/ReviewView.vue'

const store = useGameStore()
const view = ref<'home' | 'create' | 'game' | 'finish' | 'tutorial' | 'history' | 'review'>('home')
const reviewTarget = ref('') // 历史"回顾"目标：游戏的完整快照 id
const fileNoticeDismissed = ref(false) // 本地文件模式提示条：本次会话是否已收起

// 状态驱动收敛：建卡完成（state 出现）→ 游戏；游戏结束（finished）→ 终章
// 初始总是停留在首页，让玩家自己选择（首页会展示"未竟之旅"）
watch(
  () => store.state,
  (s) => {
    if (view.value === 'game' || view.value === 'finish' || view.value === 'create') {
      if (!s) view.value = 'home'
      else if (s.finished) view.value = 'finish'
      else view.value = 'game'
    }
  },
  { deep: true },
)

function navigate(to: 'home' | 'create' | 'game' | 'finish' | 'tutorial' | 'history' | 'review', recordId?: string) {
  if (to === 'create') {
    // 有未完存档：直接续玩；否则进入建卡
    view.value = store.state && !store.state.finished ? 'game' : 'create'
  } else if (to === 'game') {
    view.value = store.state && !store.state.finished ? 'game' : 'create'
  } else if (to === 'review' && recordId) {
    reviewTarget.value = recordId
    view.value = 'review'
  } else {
    view.value = to
  }
}

const showNav = computed(() => view.value !== 'home')

/** 单文件本地模式：立即导出一份存档 JSON */
function exportSaveNow() {
  if (!store.state) return
  const json = store.exportGameJson()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${store.state.name ?? 'vampire'}-存档.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

async function bindBackup() {
  await store.bindBackup()
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 存储不可用警告 -->
    <div
      v-if="store.storageWarning"
      class="bg-red-950/80 border-b border-red-700/60 text-red-200 text-sm px-4 py-2.5 text-center"
      role="alert"
    >
      ⚠ {{ store.storageWarning }}
    </div>

    <!-- 单文件（file://）本地模式：存档提示 + 备份入口 -->
    <div
      v-if="store.isFileMode && !fileNoticeDismissed"
      class="relative bg-amber-950/70 border-b border-amber-700/50 text-amber-100 text-sm px-4 py-2.5 text-center flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
      role="note"
    >
      <span>📄 本地文件模式：浏览器对 file:// 的自动存档可能不稳定。</span>
      <template v-if="store.backupSupported">
        <button
          class="underline decoration-dotted underline-offset-2 hover:text-amber-300 transition-colors bg-transparent border-none cursor-pointer p-0"
          @click="bindBackup"
        >
          {{ store.backupFileName ? `已绑定备份：${store.backupFileName}` : '绑定自动备份文件' }}
        </button>
      </template>
      <span v-else class="opacity-80">建议定期导出 JSON 备份。</span>
      <button
        v-if="store.state"
        class="underline decoration-dotted underline-offset-2 hover:text-amber-300 transition-colors bg-transparent border-none cursor-pointer p-0"
        @click="exportSaveNow"
      >
        导出存档 JSON
      </button>
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 text-amber-300/70 hover:text-amber-100 transition-colors bg-transparent border-none cursor-pointer p-1 leading-none"
        title="收起（本次会话不再显示）"
        aria-label="收起提示"
        @click="fileNoticeDismissed = true"
      >
        ✕
      </button>
    </div>

    <!-- 顶部题铭 + 导航 -->
    <header class="pt-6 pb-2 px-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <button class="title-serif text-2xl md:text-3xl gold-text tracking-[0.15em] bg-transparent border-none cursor-pointer p-0" @click="navigate('home')">
          千年<span class="blood-text">吸血鬼</span>
        </button>
        <nav v-if="showNav" class="flex items-center gap-2 text-sm">
          <button class="btn btn-ghost text-xs" @click="navigate('home')">首页</button>
          <button class="btn btn-ghost text-xs" @click="navigate('tutorial')">教程</button>
          <button class="btn btn-ghost text-xs" @click="navigate('history')">历史</button>
        </nav>
      </div>
      <div class="blood-divider mt-5 mx-auto max-w-6xl"></div>
    </header>

    <main class="flex-1 w-full max-w-6xl mx-auto px-4 pb-16 box-border">
      <HomeView v-if="view === 'home'" @navigate="navigate" />
      <CreateView v-else-if="view === 'create'" />
      <GameView v-else-if="view === 'game'" @navigate="navigate" />
      <FinishView v-else-if="view === 'finish'" @navigate="navigate" />
      <TutorialView v-else-if="view === 'tutorial'" @navigate="navigate" />
      <HistoryView v-else-if="view === 'history'" @navigate="navigate" />
      <ReviewView v-else-if="view === 'review'" :record-id="reviewTarget" @navigate="navigate" />
    </main>

    <footer class="pb-8 text-center text-xs opacity-60 px-4 space-y-1">
      <p>
        改编自 <strong>《Thousand Year Old Vampire》</strong>（作者：Tim Hutchings）
        · <a class="underline hover:text-red-300 transition-colors" href="https://timhutchings.itch.io/tyov" target="_blank" rel="noopener">官方页面（itch.io）</a>
        · <a class="underline hover:text-red-300 transition-colors" href="https://www.thousandyearoldvampire.com/" target="_blank" rel="noopener">thousandyearoldvampire.com</a>
      </p>
      <p>本工具为个人学习与游玩而作，全部游戏内容版权归原作者所有 · 侵删</p>
      <p class="pt-1">
        若喜欢这个工具，欢迎到
        <a class="underline hover:text-red-300 transition-colors" href="https://github.com/knink-owo/Thousand-Year-Old-Vampire-web" target="_blank" rel="noopener">GitHub 仓库</a>
        留下一颗星 ⭐
      </p>
      <p class="opacity-60">你的旅程只保存在本机 · 可离线游玩</p>
    </footer>
  </div>
</template>