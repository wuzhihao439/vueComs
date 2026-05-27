<template>
  <div class="gantt-container">
    <!-- 左侧表格区域 -->
    <div class="left-table">
      <vxe-table :data="actions" border height="100%">
        <vxe-column field="actionName" title="行动名称" min-width="150"></vxe-column>
        <vxe-column field="unit" title="所属单位" min-width="120"></vxe-column>
      </vxe-table>
    </div>

    <!-- 右侧甘特图区域 -->
    <div class="right-gantt" ref="rightGanttRef">
      <div class="gantt-header">
        <!-- 时间轴标尺 (简化版) -->
        <div class="timeline-scale" :style="{ width: timelineWidth + 'px' }">
          <div class="scale-item" v-for="(scale, idx) in timeScales" :key="idx">
            {{ scale.label }}
          </div>
        </div>
      </div>
      <div class="gantt-canvas-wrapper" ref="canvasWrapperRef" @scroll="handleCanvasScroll">
        <canvas ref="ganttCanvasRef" :width="canvasWidth" :height="canvasHeight" @contextmenu.prevent="handleCanvasRightClick"></canvas>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-show="contextMenuVisible" class="context-menu" :style="{ top: menuTop + 'px', left: menuLeft + 'px' }">
      <div class="menu-item" @click="addNodeByType('key')">新建关键节点</div>
      <div class="menu-item" @click="addNodeByType('alert')">新建告警节点</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import dayjs from 'dayjs'

// 示例数据：行动列表 (包含计划区间和实际区间)
const actions = ref([
  {
    actionName: '项目启动',
    unit: '总经办',
    planStart: '2026-05-01',
    planEnd: '2026-05-03',
    actualStart: '2026-05-01',
    actualEnd: '2026-05-04'
  },
  {
    actionName: '需求调研',
    unit: '产品部',
    planStart: '2026-05-04',
    planEnd: '2026-05-10',
    actualStart: '2026-05-05',
    actualEnd: '2026-05-12'
  },
  {
    actionName: '系统设计',
    unit: '研发部',
    planStart: '2026-05-11',
    planEnd: '2026-05-18',
    actualStart: '2026-05-13',
    actualEnd: '2026-05-20'
  },
  {
    actionName: '编码实现',
    unit: '研发部',
    planStart: '2026-05-19',
    planEnd: '2026-06-05',
    actualStart: '2026-05-22',
    actualEnd: '2026-06-10'
  },
  {
    actionName: '测试验收',
    unit: '质量部',
    planStart: '2026-06-06',
    planEnd: '2026-06-15',
    actualStart: '2026-06-08',
    actualEnd: '2026-06-18'
  }
])

// 节点列表 (关键节点 / 告警节点)
const nodes = ref([])

// 右侧容器相关ref
const rightGanttRef = ref(null)
const canvasWrapperRef = ref(null)
const ganttCanvasRef = ref(null)

// 画布尺寸参数
const rowHeight = 50          // 每个行动行高
const headerHeight = 60       // 时间轴 + 节点区域高度
const timelineHeight = 40     // 时间轴标尺高度
const nodeAreaHeight = 30     // 顶部节点标记区域高度
const topPadding = headerHeight + 10  // 第一个行动条起始Y坐标 (预留header空间)
const dayWidth = 35           // 每天显示的像素宽度
const minDate = ref(dayjs('2026-04-28')) // 动态计算
const maxDate = ref(dayjs('2026-06-30'))
const totalDays = ref(0)
const timelineWidth = ref(0)  // 时间轴整体宽度

// 右键菜单状态
const contextMenuVisible = ref(false)
const menuTop = ref(0)
const menuLeft = ref(0)
let currentRightClickDate = null  // 右键点击时转换得到的日期
let closeMenuHandler = null

// 计算总时间范围 (基于所有行动的计划/实际日期 + 节点日期)
const computeTimeRange = () => {
  let min = null
  let max = null
  const allDates = []
  actions.value.forEach(action => {
    if (action.planStart) allDates.push(dayjs(action.planStart))
    if (action.planEnd) allDates.push(dayjs(action.planEnd))
    if (action.actualStart) allDates.push(dayjs(action.actualStart))
    if (action.actualEnd) allDates.push(dayjs(action.actualEnd))
  })
  nodes.value.forEach(node => {
    if (node.time) allDates.push(dayjs(node.time))
  })
  if (allDates.length) {
    min = dayjs.min(allDates)
    max = dayjs.max(allDates)
  } else {
    min = dayjs()
    max = dayjs().add(30, 'day')
  }
  // 扩展边界各留2天
  min = min.subtract(2, 'day')
  max = max.add(2, 'day')
  minDate.value = min.startOf('day')
  maxDate.value = max.endOf('day')
  totalDays.value = maxDate.value.diff(minDate.value, 'day') + 1
  timelineWidth.value = totalDays.value * dayWidth
}

// 时间轴刻度 (每隔几天显示一个标签，避免过密)
const timeScales = computed(() => {
  const scales = []
  if (!totalDays.value) return scales
  const step = Math.ceil(totalDays.value / 12) // 最多显示12个刻度
  for (let i = 0; i <= totalDays.value; i += step) {
    const date = minDate.value.add(i, 'day')
    scales.push({
      label: date.format('MM-DD'),
      offset: i * dayWidth
    })
  }
  // 确保最后一个
  const lastOffset = totalDays.value * dayWidth
  if (scales.length === 0 || scales[scales.length-1].offset !== lastOffset) {
    scales.push({
      label: maxDate.value.format('MM-DD'),
      offset: lastOffset
    })
  }
  return scales
})

// canvas 宽度/高度
const canvasWidth = computed(() => timelineWidth.value + 40) // 左右留白各20
const canvasHeight = computed(() => topPadding + actions.value.length * rowHeight + 20)

// 日期转X坐标
const dateToX = (date) => {
  const d = dayjs(date).startOf('day')
  const diffDays = d.diff(minDate.value, 'day')
  return 20 + diffDays * dayWidth  // 左侧留白20
}

// 绘制甘特图（计划条 & 实际条 & 节点标记）
const drawGantt = () => {
  const canvas = ganttCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const width = canvasWidth.value
  const height = canvasHeight.value
  canvas.width = width
  canvas.height = height
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  // 1. 绘制背景网格线 (垂直线对应每天)
  ctx.save()
  ctx.strokeStyle = '#e8e8e8'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= totalDays.value; i++) {
    const x = 20 + i * dayWidth
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  // 水平网格线（行分隔）
  for (let i = 0; i <= actions.value.length; i++) {
    const y = topPadding + i * rowHeight
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 2. 绘制顶部节点标记区域背景 (显示关键节点/告警节点的标记)
  ctx.fillStyle = '#f9f9f9'
  ctx.fillRect(0, headerHeight, width, nodeAreaHeight)
  ctx.fillStyle = '#666'
  ctx.font = '12px sans-serif'
  ctx.fillText('📌 关键节点/告警节点', 10, headerHeight + 18)
  
  // 3. 绘制每个行动的计划进度条 & 实际进度条
  actions.value.forEach((action, idx) => {
    const yBase = topPadding + idx * rowHeight + 8
    // 计划条 (蓝色半透明)
    if (action.planStart && action.planEnd) {
      const planX1 = dateToX(action.planStart)
      const planX2 = dateToX(action.planEnd)
      const planWidth = Math.max(planX2 - planX1, 2)
      ctx.fillStyle = 'rgba(24, 144, 255, 0.7)'
      ctx.fillRect(planX1, yBase, planWidth, 14)
      ctx.fillStyle = '#1890ff'
      ctx.font = '10px sans-serif'
      ctx.fillText('计划', planX1 + 2, yBase + 12)
    }
    // 实际条 (绿色半透明)
    if (action.actualStart && action.actualEnd) {
      const actualX1 = dateToX(action.actualStart)
      const actualX2 = dateToX(action.actualEnd)
      const actualWidth = Math.max(actualX2 - actualX1, 2)
      ctx.fillStyle = 'rgba(82, 196, 26, 0.7)'
      ctx.fillRect(actualX1, yBase + 18, actualWidth, 14)
      ctx.fillStyle = '#52c41a'
      ctx.font = '10px sans-serif'
      ctx.fillText('实际', actualX1 + 2, yBase + 30)
    }
  })
  
  // 4. 绘制节点标志 (在顶部节点区域)
  nodes.value.forEach((node, idx) => {
    const nodeDate = dayjs(node.time)
    if (!nodeDate.isValid()) return
    const x = dateToX(nodeDate)
    const y = headerHeight + 15
    if (node.type === 'key') {
      // 关键节点：绿色菱形
      ctx.fillStyle = '#52c41a'
      drawDiamond(ctx, x, y, 8)
      ctx.fillStyle = '#333'
      ctx.font = '10px sans-serif'
      ctx.fillText(`★${node.name}`, x + 10, y + 4)
    } else if (node.type === 'alert') {
      // 告警节点：红色倒三角/圆形
      ctx.fillStyle = '#ff4d4f'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText('!', x - 3, y + 4)
      ctx.fillStyle = '#333'
      ctx.font = '10px sans-serif'
      ctx.fillText(`⚠${node.name}`, x + 10, y + 4)
    }
    // 悬浮提示简单用title属性无法实现，但可通过数据展示
  })
  
  // 添加鼠标悬浮检测简单数据属性存储 (可选)
  ctx.restore()
}

// 辅助: 绘制菱形
const drawDiamond = (ctx, cx, cy, size) => {
  ctx.beginPath()
  ctx.moveTo(cx, cy - size)
  ctx.lineTo(cx + size, cy)
  ctx.lineTo(cx, cy + size)
  ctx.lineTo(cx - size, cy)
  ctx.closePath()
  ctx.fill()
}

// 根据鼠标坐标获取日期
const getDateFromMouse = (clientX, clientY) => {
  const canvas = ganttCanvasRef.value
  const wrapper = canvasWrapperRef.value
  if (!canvas || !wrapper) return null
  const rect = canvas.getBoundingClientRect()
  const scrollLeft = wrapper.scrollLeft
  // 鼠标相对于canvas画布的实际X坐标 (考虑滚动偏移)
  const canvasX = clientX - rect.left + scrollLeft
  if (canvasX < 20 || canvasX > timelineWidth.value + 20) return null
  const dayOffset = (canvasX - 20) / dayWidth
  const date = minDate.value.add(Math.floor(dayOffset), 'day').startOf('day')
  return date
}

// 显示右键菜单
const handleCanvasRightClick = (event) => {
  event.preventDefault()
  const date = getDateFromMouse(event.clientX, event.clientY)
  if (!date) return
  currentRightClickDate = date
  // 计算菜单位置 (相对于视口)
  menuTop.value = event.clientY
  menuLeft.value = event.clientX
  contextMenuVisible.value = true
  
  // 点击其他地方关闭菜单
  if (closeMenuHandler) document.removeEventListener('click', closeMenuHandler)
  closeMenuHandler = () => {
    contextMenuVisible.value = false
    document.removeEventListener('click', closeMenuHandler)
    closeMenuHandler = null
  }
  setTimeout(() => {
    document.addEventListener('click', closeMenuHandler)
  }, 0)
}

// 新建节点 (type: 'key' 或 'alert')
const addNodeByType = (type) => {
  if (!currentRightClickDate) return
  const nodeName = prompt(`请输入${type === 'key' ? '关键' : '告警'}节点名称`, '示例节点')
  if (!nodeName) return
  const location = prompt('请输入地点', '未指定地点')
  const newNode = {
    id: Date.now(),
    name: nodeName,
    time: currentRightClickDate.format('YYYY-MM-DD'),
    location: location || '未指定',
    type: type
  }
  nodes.value.push(newNode)
  // 重新计算时间范围（因为节点可能扩展边界）
  computeTimeRange()
  nextTick(() => drawGantt())
  contextMenuVisible.value = false
  if (closeMenuHandler) {
    document.removeEventListener('click', closeMenuHandler)
    closeMenuHandler = null
  }
}

// 监听actions或nodes变化重绘
const refreshGantt = () => {
  computeTimeRange()
  nextTick(() => drawGantt())
}

// 滚动时保持canvas重绘同步（滚动不影响绘制，但需要更新视图，无需额外操作）
const handleCanvasScroll = () => {
  // 滚动时不需要重绘，但为了性能保留
}

// 监听数据变化
watch([actions, nodes], () => {
  refreshGantt()
}, { deep: true })

// 监听窗口resize重新绘制
const handleResize = () => {
  refreshGantt()
}

onMounted(() => {
  refreshGantt()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (closeMenuHandler) document.removeEventListener('click', closeMenuHandler)
})
</script>

<style scoped>
.gantt-container {
  display: flex;
  height: 100vh;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #fff;
  overflow: hidden;
}

.left-table {
  width: 280px;
  border-right: 1px solid #e8e8e8;
  flex-shrink: 0;
  overflow: auto;
}

.right-gantt {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  position: relative;
}

.gantt-header {
  flex-shrink: 0;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  overflow-x: auto;
  overflow-y: hidden;
}

.timeline-scale {
  display: flex;
  height: 40px;
  background: #f5f5f5;
  position: relative;
  min-width: 100%;
}

.scale-item {
  position: absolute;
  transform: translateX(-50%);
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  padding: 10px 0;
}

.gantt-canvas-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

canvas {
  display: block;
  cursor: crosshair;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 140px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.menu-item {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f0f0f0;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 4px;
}
::-webkit-scrollbar-track {
  background: #f0f0f0;
}
</style>