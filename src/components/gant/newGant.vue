<template>
  <div class="gantt-page">
    <!-- 时间单位切换工具栏 -->
    <div class="toolbar">
      <div class="toolbar-title">输油管道铺设甘特图</div>
      <div class="view-mode-switch">
        <span class="switch-label">时间单位：</span>
        <el-radio-group v-model="currentViewMode" size="small" @change="handleViewModeChange">
          <el-radio-button label="hour">小时</el-radio-button>
          <el-radio-button label="day">天</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <vxe-gantt
      ref="ganttRef"
      :key="ganttKey"
      v-bind="ganttOptions"
    >
      <!-- 自定义任务条插槽 -->
      <template #task-bar="{ row }">
        <div 
          class="dual-progress-bar" 
          @contextmenu.stop.prevent="handleBarContextMenu($event, row)"
        >
          <!-- 计划时间区间 -->
          <div
            v-if="row.planStart && row.planEnd"
            class="plan-bar"
            :style="getPlanBarStyle(row)"
          >
            <span class="bar-text">计划</span>
          </div>
          <!-- 实际时间区间 -->
          <div
            v-if="row.actualStart && row.actualEnd"
            class="actual-bar"
            :style="getActualBarStyle(row)"
          >
            <span class="bar-text">实际</span>
          </div>
          <!-- 关键节点渲染 -->
          <div
            v-for="node in row.keyNodes"
            :key="'key-' + node.id"
            class="key-node"
            :style="getNodeStyle(node)"
            :title="`${node.name} | ${node.time} | ${node.location}`"
          >
            <div class="node-diamond"></div>
            <span class="node-name">{{ node.name }}</span>
          </div>
          <!-- 告警节点渲染 -->
          <div
            v-for="node in row.warningNodes"
            :key="'warn-' + node.id"
            class="warning-node"
            :style="getNodeStyle(node)"
            :title="`${node.name} | ${node.time} | ${node.location}`"
          >
            <div class="node-circle"></div>
            <span class="node-name">{{ node.name }}</span>
          </div>
        </div>
      </template>
    </vxe-gantt>

    <!-- 原生右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="native-context-menu"
      :style="contextMenuStyle"
      @click.stop
    >
      <div class="menu-item" @click="handleMenuItemClick('addKeyNode')">
        <span class="menu-icon">🚩</span>
        <span>新建关键节点</span>
      </div>
      <div class="menu-item" @click="handleMenuItemClick('addWarningNode')">
        <span class="menu-icon">⚠️</span>
        <span>新建告警节点</span>
      </div>
    </div>

    <!-- Element Plus 弹窗 - 白色头部 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      destroy-on-close
      class="node-dialog"
      :show-close="true"
    >
      <div class="dialog-content">
        <div class="form-row">
          <div class="form-label required">节点名称</div>
          <div class="form-input">
            <el-input
              v-model="formData.name"
              placeholder="请输入节点名称"
              size="large"
              clearable
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-label required">节点类型</div>
          <div class="form-input">
            <el-select v-model="formData.subType" placeholder="请选择类型" size="large" style="width: 100%">
              <el-option
                v-for="item in typeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-label">备注说明</div>
          <div class="form-input">
            <el-input
              v-model="formData.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注说明"
              resize="none"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-label required">发生时间</div>
          <div class="form-input">
            <el-date-picker
              v-model="formData.time"
              type="datetime"
              placeholder="选择时间"
              size="large"
              style="width: 100%"
              value-format="YYYY-MM-DD HH:mm:ss"
              :shortcuts="timeShortcuts"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-label required">发生地点</div>
          <div class="form-input">
            <el-input
              v-model="formData.location"
              placeholder="请输入地点"
              size="large"
              clearable
            >
              <template #prefix>
                <el-icon><Location /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <div class="form-row">
          <div class="form-label">现场图片</div>
          <div class="form-input">
            <el-upload
              action="#"
              list-type="picture-card"
              :auto-upload="false"
              :on-change="handleImageChange"
              :file-list="fileList"
              :limit="3"
              class="upload-wrapper"
            >
              <div class="upload-trigger">
                <el-icon><Plus /></el-icon>
                <span>上传图片</span>
              </div>
              <template #tip>
                <div class="upload-tip">支持 JPG/PNG 格式，最多3张</div>
              </template>
            </el-upload>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" size="large" @click="handleConfirm" :disabled="!isFormValid">
            <el-icon><Check /></el-icon>
            确认创建
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { Plus, Location, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const ganttRef = ref()

// 当前时间单位视图模式：hour | day
const currentViewMode = ref('day')

// 用于强制重新渲染甘特图的key
const ganttKey = ref(0)

// 当前右键选中的行
const currentRow = ref(null)

// 右键菜单控制
const contextMenuVisible = ref(false)
const contextMenuStyle = reactive({
  top: '0px',
  left: '0px'
})

// Element Plus 弹窗控制
const dialogVisible = ref(false)
const dialogTitle = ref('')

// 节点类型选项
const typeOptions = ref([])

// 表单数据
const formData = reactive({
  name: '',
  type: 'key',
  subType: '',
  remark: '',
  time: '',
  location: ''
})

// 图片文件列表
const fileList = ref([])

// 时间快捷选项
const timeShortcuts = [
  { text: '现在', value: new Date() },
  { text: '明天此时', value: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d } },
  { text: '一周后', value: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d } }
]

// 表单验证
const isFormValid = computed(() => {
  return formData.name && formData.time && formData.location && formData.subType
})

// ============================================
// 修复：时间范围配置 - 根据视图模式动态调整
// ============================================

// 小时模式下的时间范围（1天，显示小时刻度）
const hourViewStart = '2026-05-01 00:00:00'
const hourViewEnd = '2026-05-01 23:59:59'

// 天模式下的时间范围（2个月）
const dayViewStart = '2026-05-01'
const dayViewEnd = '2026-06-30'

// 响应式时间范围
const viewStartDate = ref(dayViewStart)
const viewEndDate = ref(dayViewEnd)

// 原始树形数据
const rawData = [
  {
    id: 10001,
    name: '管道铺设A段',
    unit: '第一工程队',
    planStart: '2026-05-01',
    planEnd: '2026-05-15',
    actualStart: '2026-05-02',
    actualEnd: '2026-05-14',
    keyNodes: [
      { id: 1, name: '开工仪式', time: '2026-05-01 09:00', location: 'A段起点', remark: '正式开工', image: '' },
      { id: 2, name: '中期验收', time: '2026-05-08 14:00', location: 'A段中段', remark: '进度检查', image: '' }
    ],
    warningNodes: [
      { id: 101, name: '天气预警', time: '2026-05-03 08:00', location: 'A段全线', remark: '暴雨预警', image: '' }
    ],
    children: [
      {
        id: 1000101,
        name: 'A段-前期准备',
        unit: '第一工程队',
        planStart: '2026-05-01',
        planEnd: '2026-05-05',
        actualStart: '2026-05-01',
        actualEnd: '2026-05-04',
        keyNodes: [
          { id: 3, name: '材料进场', time: '2026-05-01 10:00', location: 'A段仓库', remark: '管材验收', image: '' }
        ],
        warningNodes: [],
        children: []
      },
      {
        id: 1000102,
        name: 'A段-正式铺设',
        unit: '第一工程队',
        planStart: '2026-05-06',
        planEnd: '2026-05-15',
        actualStart: '2026-05-06',
        actualEnd: '2026-05-14',
        keyNodes: [
          { id: 4, name: '焊接完成', time: '2026-05-10 16:00', location: 'A段焊接点', remark: '焊缝检测合格', image: '' }
        ],
        warningNodes: [
          { id: 102, name: '设备故障', time: '2026-05-07 09:00', location: 'A段焊接点', remark: '焊机故障', image: '' }
        ],
        children: []
      }
    ]
  },
  {
    id: 10002,
    name: '管道铺设B段',
    unit: '第二工程队',
    planStart: '2026-05-10',
    planEnd: '2026-05-25',
    actualStart: '2026-05-12',
    actualEnd: '2026-05-20',
    keyNodes: [
      { id: 5, name: 'B段开工', time: '2026-05-10 08:00', location: 'B段起点', remark: '开工动员', image: '' }
    ],
    warningNodes: [],
    children: [
      {
        id: 1000201,
        name: 'B段-地质勘察',
        unit: '第二工程队',
        planStart: '2026-05-10',
        planEnd: '2026-05-12',
        actualStart: '2026-05-12',
        actualEnd: '2026-05-12',
        keyNodes: [],
        warningNodes: [
          { id: 103, name: '地质异常', time: '2026-05-11 10:00', location: 'B段3号点', remark: '发现流沙层', image: '' }
        ],
        children: []
      }
    ]
  },
  {
    id: 10003,
    name: '阀门安装',
    unit: '第三工程队',
    planStart: '2026-05-20',
    planEnd: '2026-06-05',
    actualStart: '',
    actualEnd: '',
    keyNodes: [],
    warningNodes: [],
    children: []
  },
  {
    id: 10004,
    name: '压力测试',
    unit: '质检部门',
    planStart: '2026-06-01',
    planEnd: '2026-06-10',
    actualStart: '',
    actualEnd: '',
    keyNodes: [
      { id: 6, name: '测试启动', time: '2026-06-01 09:00', location: '测试中心', remark: '开始打压', image: '' }
    ],
    warningNodes: [],
    children: []
  }
]

// 将树形数据转换为甘特图需要的扁平结构
const flattenData = (list, parentId = null) => {
  const result = []
  list.forEach(item => {
    const row = {
      ...item,
      parentId: parentId,
      title: item.name,
      start: item.planStart,
      end: item.planEnd,
      progress: item.progress || 0
    }
    result.push(row)
    if (item.children && item.children.length > 0) {
      result.push(...flattenData(item.children, item.id))
    }
  })
  return result
}

// ============================================
// 修复：计算进度条样式 - 使用响应式时间范围
// ============================================
const getPlanBarStyle = (row) => {
  if (!row.planStart || !row.planEnd) return {}

  const start = new Date(row.planStart).getTime()
  const end = new Date(row.planEnd).getTime()
  const viewStart = new Date(viewStartDate.value).getTime()
  const viewEnd = new Date(viewEndDate.value).getTime()
  const totalWidth = viewEnd - viewStart

  if (totalWidth <= 0) return {}

  const left = ((start - viewStart) / totalWidth) * 100
  const width = ((end - start) / totalWidth) * 100

  return { 
    left: Math.max(0, left) + '%', 
    width: Math.max(0, Math.min(width, 100 - Math.max(0, left))) + '%' 
  }
}

const getActualBarStyle = (row) => {
  if (!row.actualStart || !row.actualEnd) return {}

  const start = new Date(row.actualStart).getTime()
  const end = new Date(row.actualEnd).getTime()
  const viewStart = new Date(viewStartDate.value).getTime()
  const viewEnd = new Date(viewEndDate.value).getTime()
  const totalWidth = viewEnd - viewStart

  if (totalWidth <= 0) return {}

  const left = ((start - viewStart) / totalWidth) * 100
  const width = ((end - start) / totalWidth) * 100

  return { 
    left: Math.max(0, left) + '%', 
    width: Math.max(0, Math.min(width, 100 - Math.max(0, left))) + '%' 
  }
}

const getNodeStyle = (node) => {
  if (!node.time) return {}

  const nodeTime = new Date(node.time).getTime()
  const viewStart = new Date(viewStartDate.value).getTime()
  const viewEnd = new Date(viewEndDate.value).getTime()
  const totalWidth = viewEnd - viewStart

  if (totalWidth <= 0) return {}

  const left = ((nodeTime - viewStart) / totalWidth) * 100

  return { left: Math.max(0, Math.min(left, 100)) + '%' }
}

// ============================================
// 修复：甘特图配置 - 动态切换 viewMode 和时间范围
// ============================================
const ganttOptions = computed(() => {
  const isHourMode = currentViewMode.value === 'hour'

  return {
    border: true,
    height: 600,
    showOverflow: true,
    loading: false,
    cellConfig: { height: 50 },
    rowConfig: { useKey: true, keyField: 'id' },
    columnConfig: { resizable: true },
    treeConfig: {
      transform: true,
      rowField: 'id',
      parentField: 'parentId',
      childrenField: 'children',
      showIcon: true,
      iconOpen: 'vxe-icon-square-plus',
      iconClose: 'vxe-icon-square-minus',
      iconLoaded: 'vxe-icon-square'
    },
    columns: [
      { field: 'name', title: '行动名称', minWidth: 180, treeNode: true },
      { field: 'unit', title: '所属单位', minWidth: 120 }
    ],
    taskConfig: {
      titleField: 'title',
      startField: 'start',
      endField: 'end',
      progressField: 'progress'
    },
    taskBarConfig: {
      showProgress: false,
      showContent: false,
      moveable: false,
      resizable: false,
      barStyle: {
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none'
      }
    },
    taskViewConfig: {
         scales: ['hour', 'minute'],
      tableStyle: { width: 300 }
    },
    // ============================================
    // 修复：动态 dateConfig - 真正切换时间单位
    // ============================================
    // dateConfig: {
    //   startDate: viewStartDate.value,
    //   endDate: viewEndDate.value,
    //   // 关键修复：根据模式切换 viewMode
    //   // vxe-gantt 4.x 支持 'day' | 'week' | 'month'
    //   // 小时模式通过缩小范围到1天 + 自定义 slot 实现
    //   viewMode: isHourMode ? 'day' : 'day',
    //   // 使用自定义日期标签格式来模拟小时刻度
    //   labelFormat: isHourMode ? 'HH:mm' : 'MM-DD',
    //   // 自定义时间轴标签渲染
    //   ...(isHourMode ? {
    //     // 小时模式下，强制显示更多刻度
    //     minDateWidth: 60,  // 每个刻度最小宽度60px
    //   } : {
    //     minDateWidth: 80,
    //   })
    // },
    // 数据
    data: flattenData(rawData)
  }
})

// ============================================
// 修复：切换视图模式 - 真正改变时间范围和刻度
// ============================================
const handleViewModeChange = (mode) => {
  currentViewMode.value = mode

  if (mode === 'hour') {
    // 小时模式：缩小时间范围到1天
    viewStartDate.value = hourViewStart
    viewEndDate.value = hourViewEnd
  } else {
    // 天模式：显示完整时间范围
    viewStartDate.value = dayViewStart
    viewEndDate.value = dayViewEnd
  }

  // 强制重新渲染甘特图
  ganttKey.value++

  // 使用 nextTick 确保 DOM 更新后重新计算
  setTimeout(() => {
    if (ganttRef.value) {
      ganttRef.value.refreshData && ganttRef.value.refreshData()
    }
  }, 0)
}

// 直接在任务条上处理右键事件
const handleBarContextMenu = (event, row) => {
  currentRow.value = row

  // 显示自定义右键菜单
  contextMenuStyle.top = event.clientY + 'px'
  contextMenuStyle.left = event.clientX + 'px'
  contextMenuVisible.value = true
}

// 处理菜单项点击
const handleMenuItemClick = (code) => {
  contextMenuVisible.value = false

  // 重置表单
  formData.name = ''
  formData.subType = ''
  formData.remark = ''
  formData.time = ''
  formData.location = ''
  fileList.value = []

  if (code === 'addKeyNode') {
    dialogTitle.value = '🚩 新建关键节点'
    formData.type = 'key'
    typeOptions.value = [
      { label: '集结', value: '集结' },
      { label: '转移', value: '转移' },
      { label: '交互', value: '交互' }
    ]
  } else if (code === 'addWarningNode') {
    dialogTitle.value = '⚠️ 新建告警节点'
    formData.type = 'warning'
    typeOptions.value = [
      { label: '告警', value: '告警' },
      { label: '预警', value: '预警' }
    ]
  }

  dialogVisible.value = true
}

// 图片上传处理
const handleImageChange = (file, files) => {
  fileList.value = files
}

// 处理弹窗确认
const handleConfirm = () => {
  if (!isFormValid.value) {
    ElMessage.warning('请填写完整信息')
    return
  }

  const newNode = {
    id: Date.now(),
    name: formData.name,
    time: formData.time,
    location: formData.location,
    remark: formData.remark,
    subType: formData.subType,
    image: fileList.value.length > 0 ? fileList.value[0].url : ''
  }

  const row = currentRow.value
  if (row) {
    if (formData.type === 'key') {
      if (!row.keyNodes) row.keyNodes = []
      row.keyNodes.push(newNode)
    } else {
      if (!row.warningNodes) row.warningNodes = []
      row.warningNodes.push(newNode)
    }
  }

  dialogVisible.value = false
  ElMessage.success('创建成功')

  // 强制重新渲染
  ganttKey.value++
}

// 点击其他地方关闭右键菜单
const handleClickOutside = (e) => {
  if (!e.target.closest('.native-context-menu')) {
    contextMenuVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.gantt-page {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.toolbar-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.view-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 14px;
  color: #606266;
}

/* 隐藏 vxe-gantt 默认的任务条背景 */
:deep(.vxe-gantt--task-bar) {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.vxe-gantt--task-bar-progress) {
  background-color: transparent !important;
}

:deep(.vxe-gantt--task-bar-completed) {
  background-color: transparent !important;
}

/* ============================================ */
/* 修复：双进度条容器 - 确保相对定位正确 */
/* ============================================ */
.dual-progress-bar {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 40px;
  cursor: context-menu;
}

/* 计划进度条 */
.plan-bar {
  position: absolute;
  height: 16px;
  top: 2px;
  background-color: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #1890ff;
  z-index: 1;
  transition: all 0.3s ease;
}

/* 实际进度条 */
.actual-bar {
  position: absolute;
  height: 16px;
  top: 20px;
  background-color: #52c41a;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  z-index: 2;
  transition: all 0.3s ease;
}

.bar-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

/* 关键节点样式 */
.key-node {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  top: 0;
}

.node-diamond {
  width: 12px;
  height: 12px;
  background-color: #f5222d;
  transform: rotate(45deg);
  border: 2px solid #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.key-node .node-name {
  font-size: 10px;
  color: #f5222d;
  margin-top: 2px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.9);
  padding: 0 2px;
  border-radius: 2px;
}

/* 告警节点样式 */
.warning-node {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  top: 0;
}

.node-circle {
  width: 12px;
  height: 12px;
  background-color: #faad14;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  animation: blink 1s infinite;
}

.warning-node .node-name {
  font-size: 10px;
  color: #faad14;
  margin-top: 2px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.9);
  padding: 0 2px;
  border-radius: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 原生右键菜单 */
.native-context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  padding: 6px 0;
  min-width: 180px;
  animation: menuFadeIn 0.15s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
}

.menu-item:hover {
  background-color: #f0f7ff;
  color: #1890ff;
}

.menu-icon {
  font-size: 18px;
}

/* 弹窗样式 - 白色头部 */
:deep(.node-dialog .el-dialog__header) {
  background: #fff !important;
  color: #303133 !important;
  padding: 20px 24px !important;
  margin-right: 0 !important;
  border-bottom: 1px solid #e4e7ed !important;
  border-radius: 8px 8px 0 0 !important;
}

:deep(.node-dialog .el-dialog__title) {
  color: #303133 !important;
  font-weight: 600 !important;
  font-size: 18px !important;
}

:deep(.node-dialog .el-dialog__headerbtn) {
  top: 20px !important;
  right: 20px !important;
}

:deep(.node-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #909399 !important;
  font-size: 20px !important;
}

:deep(.node-dialog .el-dialog__headerbtn .el-dialog__close:hover) {
  color: #409eff !important;
}

:deep(.node-dialog .el-dialog__body) {
  padding: 24px !important;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.form-label {
  width: 80px;
  text-align: right;
  color: #606266;
  font-size: 14px;
  line-height: 40px;
  flex-shrink: 0;
}

.form-label.required::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.form-input {
  flex: 1;
}

.upload-wrapper {
  width: 100%;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #8c939d;
}

.upload-trigger .el-icon {
  font-size: 24px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

/* 自定义树形展开按钮样式 */
:deep(.vxe-gantt--tree-node-btn) {
  font-size: 16px;
  color: #606266;
}

:deep(.vxe-gantt--tree-node-btn.is--active) {
  color: #409eff;
}

/* ============================================ */
/* 修复：小时模式下的时间轴样式覆盖 */
/* ============================================ */
:deep(.vxe-gantt--date-label) {
  font-size: 12px;
}

/* 小时模式下让时间轴标签更紧凑 */
:deep(.vxe-gantt--timeline-header) {
  transition: all 0.3s ease;
}
</style>
