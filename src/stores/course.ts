import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { allLessons, lessonById } from '@/data/course'

/** 跨视图的学习状态：全局搜索面板、上次学习位置 */
export const useCourseStore = defineStore('course', () => {
  const paletteOpen = ref(false)
  /** 上次访问的讲次，用于课程概览的「继续学习」与任务栏入口 */
  const lastLessonId = ref('L04')
  /** 已访问过的讲次，用于在学习路径上标记进度 */
  const visited = ref<string[]>(['L01', 'L02', 'L03'])

  const lastLesson = computed(() => lessonById.get(lastLessonId.value))

  function markVisited(lessonId: string) {
    lastLessonId.value = lessonId
    if (!visited.value.includes(lessonId)) visited.value = [...visited.value, lessonId]
  }

  function openPalette() {
    paletteOpen.value = true
  }

  function closePalette() {
    paletteOpen.value = false
  }

  /** 学习路径进度：已访问讲次 / 总讲次 */
  const progress = computed(() => ({
    visited: visited.value.length,
    total: allLessons.length,
    ratio: visited.value.length / allLessons.length,
  }))

  return {
    paletteOpen,
    lastLessonId,
    lastLesson,
    visited,
    progress,
    markVisited,
    openPalette,
    closePalette,
  }
})
