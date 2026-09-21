import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 界面级状态
 * ----------------------------------------------------------------------------
 * 全局检索面板的开关。项目状态本身在 stores/project.ts，这里不重复持有。
 */
export const useCourseStore = defineStore('course', () => {
  const paletteOpen = ref(false)

  function openPalette() {
    paletteOpen.value = true
  }

  function closePalette() {
    paletteOpen.value = false
  }

  return { paletteOpen, openPalette, closePalette }
})
