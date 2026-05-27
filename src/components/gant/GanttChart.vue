<template>
  <div class="gantt-container" ref="containerRef">
    <!-- 左侧表格 -->
    <div class="left-table" :style="{ width: leftWidth + 'px' }">
      <div class="table-header">
        <div class="th" style="width: 55%">行动名称</div>
        <div class="th" style="width: 45%">所属单位</div>
      </div>
      <div class="table-body">
        <div
          v-for="(item, index) in dataList"
          :key="item.id"
          class="table-row"
          :class="{ 'row-active': selectedRow === index }"
          @click="selectedRow = index"
        >
          <div class="td" style="width: 55%" :title="item.actionName">{{ item.actionName }}</div>
          <div class="td" style="width: 45%" :title="item.unit">{{ item.unit }}</div>
        </div>
      </div>
    </div>

    <!-- 拖拽分隔线 -->
    <div class="splitter" @mousedown="startResize"></div>

    <!-- 右侧甘特图区域 -->
    <div
      class="right-chart"
      ref="chartRef"
      @contextmenu.prevent="handleContextMenu"
      @click="hideContextMenu"
    >
      <!-- 时间轴头部 -->
      <div class="timeline-header" ref="timelineHeaderRef">
        <div class="timeline-scale">
          <div
            v-for="date in dateRange"
            :key="date.value"
            class="date-cell"
            :style="{ width: dayWidth + 'px' }"
          >
            <div class="date-label">{{ date.label }}</div>
            <div class="week-label">{{ date.weekLabel }}</div>
          </div>
        </div>
      </div>

      <!-- 甘特图主体 -->
      <div class="chart-body" ref="chartBodyRef" @scroll="handleScroll">
        <div class="chart-content" :style="{ width: chartTotalWidth + 'px' }">
          <!-- 背景网格 -->
          <div class="grid-lines">
            <div
              v-for="(_, idx) in dateRange"
              :key="idx"
              class="grid-line"
              :style="{ left: idx * dayWidth + 'px', width: dayWidth + 'px' }"
              :class="{ 'weekend': isWeekend(idx) }"
            ></div>
          </div>

          <!-- 数据行 -->
          <div
            v-for="(item, index) in dataList"
            :key="item.id"
            class="gantt-row"
            :class="{ 'row-active': selectedRow === index }"
            :style="{ height: rowHeight + 'px' }"
          >
            <!-- 计划时间条 (上层，半透明背景) -->
            <div
              v-if="item.planStart && item.planEnd"
              class="bar plan-bar"
              :style="getBarStyle(item.planStart, item.planEnd, 'plan')"
              :title="`计划: ${formatDate(item.planStart)} ~ ${formatDate(item.planEnd)}`"
            >
              <span class="bar-label">计划</span>
            </div>

            <!-- 实际时间条 (下层，实心) -->
            <div
              v-if="item.actualStart && item.actualEnd"
              class="bar actual-bar"
              :style="getBarStyle(item.actualStart, item.actualEnd, 'actual')"
              :title="`实际: ${formatDate(item.actualStart)} ~ ${formatDate(item.actualEnd)}`"
            >
              <span class="bar-label">实际</span>
            </div>

            <!-- 关键节点 -->
            <div
              v-for="node in item.keyNodes"
              :key="node.id"
              class="key-node"
              :style="getNodeStyle(node.time)"
              :title="`${node.name} | ${node.location} | ${formatDate(node.time)}`"
              @click.stop="showNodeDetail(node)"
            >
              <div class="node-diamond"></div>
              <div class="node-label">{{ node.name }}</div>
            </div>

            <!-- 告警节点 -->
            <div
              v-for="alert in item.alertNodes"
              :key="alert.id"
              class="alert-node"
              :style="getNodeStyle(alert.time)"
              :title="`${alert.name} | ${alert.location} | ${formatDate(alert.time)}`"
              @click.stop="showNodeDetail(alert)"
            >
              <div class="node-triangle"></div>
              <div class="node-label">{{ alert.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
    >
      <div class="menu-item" @click="createKeyNode">
        <span class="menu-icon">◆</span> 新建关键节点
      </div>
      <div class="menu-item" @click="createAlertNode">
        <span class="menu-icon">▲</span> 新建告警节点
      </div>
    </div>

    <!-- 新建节点弹窗 -->
    <div v-if="dialogVisible" class="modal-overlay" @click="dialogVisible = false">
      <div class="modal-content" @click.stop>
        <h3>{{ dialogTitle }}</h3>
        <div class="form-group">
          <label>节点名称：</label>
          <input v-model="nodeForm.name" type="text" placeholder="请输入节点名称" />
        </div>
        <div class="form-group">
          <label>时间：</label>
          <input v-model="nodeForm.time" type="datetime-local" />
        </div>
        <div class="form-group">
          <label>地点：</label>
          <input v-model="nodeForm.location" type="text" placeholder="请输入地点" />
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="dialogVisible = false">取消</button>
          <button class="btn-confirm" @click="confirmCreateNode">确定</button>
        </div>
      </div>
    </div>

    <!-- 节点详情弹窗 -->
    <div v-if="detailVisible" class="modal-overlay" @click="detailVisible = false">
      <div class="modal-content detail-modal" @click.stop>
        <h3>节点详情</h3>
        <div class="detail-item">
          <span class="detail-label">节点名称：</span>
          <span>{{ selectedNode.name }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">时间：</span>
          <span>{{ formatDate(selectedNode.time) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">地点：</span>
          <span>{{ selectedNode.location }}</span>
        </div>
        <div class="modal-actions">
          <button class="btn-confirm" @click="detailVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ==================== 配置参数 ====================
const dayWidth = 60           // 每天像素宽度
const rowHeight = 60          // 行高
const leftWidth = ref(280)    // 左侧表格宽度（可拖拽调整）
const minLeftWidth = 180
const maxLeftWidth = 500

// ==================== 数据 ====================
// 示例数据
const dataList = ref([
  {
    id: '1',
    actionName: '管道铺设第一阶段',
    unit: '第一工程队',
    planStart: '2026-05-01',
    planEnd: '2026-05-15',
    actualStart: '2026-05-03',
    actualEnd: '2026-05-14',
    keyNodes: [
      { id: 'k1', name: '开工仪式', time: '2026-05-03T09:00', location: 'A区起点' }
    ],
    alertNodes: [
      { id: 'a1', name: '材料延误告警', time: '2026-05-05T14:00', location: 'A区仓库' }
    ]
  },
  {
    id: '2',
    actionName: '管道焊接作业',
    unit: '焊接班组',
    planStart: '2026-05-10',
    planEnd: '2026-05-25',
    actualStart: '2026-05-12',
    actualEnd: '2026-05-28',
    keyNodes: [
      { id: 'k2', name: '焊接验收', time: '2026-05-20T10:00', location: 'B区焊接点' }
    ],
    alertNodes: []
  },
  {
    id: '3',
    actionName: '压力测试',
    unit: '质检部门',
    planStart: '2026-05-26',
    planEnd: '2026-06-05',
    actualStart: '2026-05-29',
    actualEnd: '2026-06-08',
    keyNodes: [],
    alertNodes: [
      { id: 'a2', name: '压力异常', time: '2026-06-01T16:00', location: 'C区测试站' }
    ]
  },
  {
    id: '4',
    actionName: '回填土方',
    unit: '土方工程队',
    planStart: '2026-06-06',
    planEnd: '2026-06-15',
    actualStart: null,
    actualEnd: null,
    keyNodes: [],
    alertNodes: []
  },
  {
    id: '5',
    actionName: '竣工验收',
    unit: '项目管理部',
    planStart: '2026-06-16',
    planEnd: '2026-06-20',
    actualStart: null,
    actualEnd: null,
    keyNodes: [],
    alertNodes: []
  }
])

// ==================== 时间范围计算 ====================
const allDates = computed(() => {
  const dates = []
  dataList.value.forEach(item => {
    if (item.planStart) dates.push(new Date(item.planStart))
    if (item.planEnd) dates.push(new Date(item.planEnd))
    if (item.actualStart) dates.push(new Date(item.actualStart))
    if (item.actualEnd) dates.push(new Date(item.actualEnd))
    item.keyNodes.forEach(n => dates.push(new Date(n.time)))
    item.alertNodes.forEach(n => dates.push(new Date(n.time)))
  })
  return dates
})

const minDate = computed(() => {
  if (allDates.value.length === 0) return new Date()
  return new Date(Math.min(...allDates.value))
})

const maxDate = computed(() => {
  if (allDates.value.length === 0) return new Date()
  return new Date(Math.max(...allDates.value))
})

// 扩展时间范围（前后各加3天）
const chartStart = computed(() => {
  const d = new Date(minDate.value)
  d.setDate(d.getDate() - 3)
  d.setHours(0, 0, 0, 0)
  return d
})

const chartEnd = computed(() => {
  const d = new Date(maxDate.value)
  d.setDate(d.getDate() + 3)
  d.setHours(23, 59, 59, 999)
  return d
})

const totalDays = computed(() => {
  return Math.ceil((chartEnd.value - chartStart.value) / (1000 * 60 * 60 * 24))
})

const chartTotalWidth = computed(() => totalDays.value * dayWidth)

const dateRange = computed(() => {
  const range = []
  const start = new Date(chartStart.value)
  for (let i = 0; i < totalDays.value; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    range.push({
      value: d.toISOString().split('T')[0],
      label: `${month}/${day}`,
      weekLabel: weekDays[d.getDay()]
    })
  }
  return range
})

// ==================== 样式计算 ====================
function getBarStyle(startStr, endStr, type) {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const startOffset = Math.max(0, (start - chartStart.value) / (1000 * 60 * 60 * 24))
  const duration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24) + 1)
  
  const top = type === 'plan' ? 8 : 32
  
  return {
    left: `${startOffset * dayWidth}px`,
    width: `${duration * dayWidth - 4}px`,
    top: `${top}px`,
    height: '20px'
  }
}

function getNodeStyle(timeStr) {
  const time = new Date(timeStr)
  const offset = (time - chartStart.value) / (1000 * 60 * 60 * 24)
  return {
    left: `${offset * dayWidth}px`,
    top: '50%',
    transform: 'translate(-50%, -50%)'
  }
}

function isWeekend(idx) {
  const d = new Date(chartStart.value)
  d.setDate(d.getDate() + idx)
  const day = d.getDay()
  return day === 0 || day === 6
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ==================== 交互 ====================
const selectedRow = ref(-1)
const containerRef = ref(null)
const chartRef = ref(null)
const chartBodyRef = ref(null)
const timelineHeaderRef = ref(null)

// 同步滚动
function handleScroll(e) {
  if (timelineHeaderRef.value) {
    timelineHeaderRef.value.scrollLeft = e.target.scrollLeft
  }
}

// 拖拽调整左侧宽度
let isResizing = false
function startResize(e) {
  isResizing = true
  const startX = e.clientX
  const startWidth = leftWidth.value
  
  const handleMouseMove = (e) => {
    if (!isResizing) return
    const diff = e.clientX - startX
    const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, startWidth + diff))
    leftWidth.value = newWidth
  }
  
  const handleMouseUp = () => {
    isResizing = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// ==================== 右键菜单 ====================
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const rightClickRowIndex = ref(-1)
const rightClickTime = ref(null)

function handleContextMenu(e) {
  const rect = chartRef.value.getBoundingClientRect()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  
  // 计算点击在哪一行
  const chartBodyRect = chartBodyRef.value.getBoundingClientRect()
  const relativeY = e.clientY - chartBodyRect.top + chartBodyRef.value.scrollTop
  rightClickRowIndex.value = Math.floor(relativeY / rowHeight)
  
  // 计算点击的时间点
  const relativeX = e.clientX - chartBodyRect.left + chartBodyRef.value.scrollLeft
  const dayOffset = relativeX / dayWidth
  const clickDate = new Date(chartStart.value)
  clickDate.setDate(clickDate.getDate() + dayOffset)
  rightClickTime.value = clickDate.toISOString().slice(0, 16)
  
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

// 点击其他地方关闭菜单
onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})

// ==================== 新建节点 ====================
const dialogVisible = ref(false)
const dialogTitle = ref('')
const nodeForm = ref({
  name: '',
  time: '',
  location: '',
  type: '' // 'key' or 'alert'
})

function createKeyNode() {
  dialogTitle.value = '新建关键节点'
  nodeForm.value = {
    name: '',
    time: rightClickTime.value || '',
    location: '',
    type: 'key'
  }
  dialogVisible.value = true
  contextMenuVisible.value = false
}

function createAlertNode() {
  dialogTitle.value = '新建告警节点'
  nodeForm.value = {
    name: '',
    time: rightClickTime.value || '',
    location: '',
    type: 'alert'
  }
  dialogVisible.value = true
  contextMenuVisible.value = false
}

function confirmCreateNode() {
  if (!nodeForm.value.name || !nodeForm.value.time) {
    alert('请填写完整信息')
    return
  }
  
  const rowIdx = rightClickRowIndex.value
  if (rowIdx < 0 || rowIdx >= dataList.value.length) {
    alert('请先选择有效的数据行')
    dialogVisible.value = false
    return
  }
  
  const newNode = {
    id: Date.now().toString(),
    name: nodeForm.value.name,
    time: nodeForm.value.time,
    location: nodeForm.value.location || '未指定'
  }
  
  if (nodeForm.value.type === 'key') {
    dataList.value[rowIdx].keyNodes.push(newNode)
  } else {
    dataList.value[rowIdx].alertNodes.push(newNode)
  }
  
  dialogVisible.value = false
}

// ==================== 节点详情 ====================
const detailVisible = ref(false)
const selectedNode = ref({})

function showNodeDetail(node) {
  selectedNode.value = node
  detailVisible.value = true
}
</script>

<style scoped>
.gantt-container {
  display: flex;
  width: 100%;
  height: 600px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  background: #fff;
}

/* ========== 左侧表格 ========== */
.left-table {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
}

.table-header {
  display: flex;
  height: 50px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
  font-size: 14px;
  color: #606266;
}

.th {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-right: 1px solid #e4e7ed;
  box-sizing: border-box;
}

.th:last-child {
  border-right: none;
}

.table-body {
  flex: 1;
  overflow: hidden;
}

.table-row {
  display: flex;
  height: v-bind(rowHeight + 'px');
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background 0.2s;
}

.table-row:hover,
.table-row.row-active {
  background: #ecf5ff;
}

.td {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  color: #303133;
  border-right: 1px solid #ebeef5;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td:last-child {
  border-right: none;
}

/* ========== 分隔线 ========== */
.splitter {
  width: 4px;
  cursor: col-resize;
  background: #e4e7ed;
  flex-shrink: 0;
  transition: background 0.2s;
}

.splitter:hover {
  background: #409eff;
}

/* ========== 右侧图表 ========== */
.right-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.timeline-header {
  height: 50px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  overflow: hidden;
  flex-shrink: 0;
}

.timeline-scale {
  display: flex;
  height: 100%;
}

.date-cell {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e4e7ed;
  box-sizing: border-box;
  font-size: 12px;
  color: #606266;
}

.date-label {
  font-weight: 600;
  font-size: 13px;
}

.week-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.chart-body {
  flex: 1;
  overflow: auto;
  position: relative;
}

.chart-content {
  position: relative;
  min-height: 100%;
}

/* ========== 网格背景 ========== */
.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px solid #f0f0f0;
  box-sizing: border-box;
}

.grid-line.weekend {
  background: rgba(245, 247, 250, 0.6);
}

/* ========== 数据行 ========== */
.gantt-row {
  position: relative;
  border-bottom: 1px solid #ebeef5;
  box-sizing: border-box;
}

.gantt-row.row-active {
  background: rgba(236, 245, 255, 0.3);
}

/* ========== 进度条 ========== */
.bar {
  position: absolute;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s;
  overflow: hidden;
}

.bar:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.plan-bar {
  background: rgba(64, 158, 255, 0.2);
  border: 1px solid rgba(64, 158, 255, 0.4);
  color: #409eff;
}

.actual-bar {
  background: #67c23a;
  border: 1px solid #5daf34;
  color: #fff;
}

.bar-label {
  pointer-events: none;
  white-space: nowrap;
}

/* ========== 关键节点（菱形） ========== */
.key-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 20;
}

.node-diamond {
  width: 14px;
  height: 14px;
  background: #e6a23c;
  border: 2px solid #cf9236;
  transform: rotate(45deg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.key-node:hover .node-diamond {
  background: #f5c842;
  transform: rotate(45deg) scale(1.2);
}

/* ========== 告警节点（三角形） ========== */
.alert-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 20;
}

.node-triangle {
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 14px solid #f56c6c;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.alert-node:hover .node-triangle {
  border-bottom-color: #ff8585;
  transform: scale(1.2);
}

.node-label {
  position: absolute;
  top: 20px;
  font-size: 10px;
  color: #606266;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.9);
  padding: 1px 4px;
  border-radius: 2px;
  pointer-events: none;
}

/* ========== 右键菜单 ========== */
.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 4px 0;
  min-width: 160px;
}

.menu-item {
  padding: 8px 16px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f7fa;
  color: #409eff;
}

.menu-icon {
  font-size: 12px;
}

/* ========== 弹窗 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #409eff;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-cancel {
  background: #fff;
  border-color: #dcdfe6;
  color: #606266;
}

.btn-cancel:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.btn-confirm {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.btn-confirm:hover {
  background: #66b1ff;
}

/* 详情弹窗 */
.detail-modal .detail-item {
  display: flex;
  margin-bottom: 12px;
  font-size: 14px;
}

.detail-label {
  color: #909399;
  width: 80px;
  flex-shrink: 0;
}
</style>
  