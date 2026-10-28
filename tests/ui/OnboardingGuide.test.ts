import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import OnboardingGuide from '@/components/OnboardingGuide.vue'

/**
 * 首次进入引导（V5-A）
 * ----------------------------------------------------------------------------
 * 计划要求：≤3 步、可跳过、记住跳过状态。这里把三条都写成可执行断言，
 * 尤其是「刷新/重新进入不再出现」——只靠内存变量做不到，必须落 localStorage。
 */
describe('OnboardingGuide', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('最多三步，讲的是第一次用必须先做的事', async () => {
    const wrapper = mount(OnboardingGuide)
    await nextTick()

    const steps = wrapper.findAll('.onboarding-steps li')
    expect(steps).toHaveLength(3)
    expect(steps.map((item) => item.find('h3').text())).toEqual([
      '先有一个项目',
      '把项目拆成阶段和任务',
      '每做完一步，记一条',
    ])
    expect(wrapper.text()).toContain('跳过引导')
  })

  it('点「跳过引导」后立刻消失，并且下次进入不再出现', async () => {
    const first = mount(OnboardingGuide)
    await nextTick()
    await first.get('.onboarding-skip').trigger('click')

    expect(first.find('.onboarding').exists()).toBe(false)
    expect(window.localStorage.getItem('scp.onboarding.v5.dismissed')).toBe('1')

    const second = mount(OnboardingGuide)
    await nextTick()
    expect(second.find('.onboarding').exists()).toBe(false)
  })

  it('点「知道了，开始」同样记住，不需要用户点两次才能关掉', async () => {
    const first = mount(OnboardingGuide)
    await nextTick()
    await first.get('.onboarding-actions .btn').trigger('click')

    expect(first.find('.onboarding').exists()).toBe(false)

    const second = mount(OnboardingGuide)
    await nextTick()
    expect(second.find('.onboarding').exists()).toBe(false)
  })
})
