<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart as RadarChartSeries } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import type { Dimension } from '@/types/assessment'

use([CanvasRenderer, RadarChartSeries, TooltipComponent])

const props = defineProps<{ dimensions: Dimension[] }>()

const option = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(11, 22, 38, 0.96)',
    borderColor: 'rgba(152, 198, 240, 0.24)',
    textStyle: { color: '#e8f1fb', fontSize: 12 },
    formatter: () =>
      props.dimensions
        .map((dim) => `${dim.name} · <b>${dim.score}</b>　<span style="color:#7d94b0">${dim.note}</span>`)
        .join('<br/>'),
  },
  radar: {
    center: ['50%', '52%'],
    radius: '66%',
    shape: 'polygon',
    splitNumber: 4,
    indicator: props.dimensions.map((dim) => ({ name: dim.name, max: 100 })),
    axisName: {
      color: '#b3c7de',
      fontSize: 12,
      padding: [2, 4],
    },
    splitLine: { lineStyle: { color: 'rgba(152, 198, 240, 0.15)' } },
    axisLine: { lineStyle: { color: 'rgba(152, 198, 240, 0.15)' } },
    splitArea: {
      areaStyle: { color: ['rgba(146, 190, 236, 0.028)', 'rgba(146, 190, 236, 0.055)'] },
    },
  },
  series: [
    {
      type: 'radar',
      symbolSize: 5,
      symbol: 'circle',
      lineStyle: { color: '#35e0f0', width: 1.8 },
      itemStyle: { color: '#35e0f0', borderColor: 'rgba(53,224,240,0.35)', borderWidth: 4 },
      areaStyle: { color: 'rgba(53, 224, 240, 0.16)' },
      data: [{ value: props.dimensions.map((dim) => dim.score), name: '能力掌握度' }],
    },
  ],
}))
</script>

<template>
  <VChart class="radar" :option="option" autoresize />
</template>

<style scoped>
.radar {
  width: 100%;
  height: 320px;
}
</style>
