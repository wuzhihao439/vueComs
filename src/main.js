import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 1. 引入 ant-design-vue 核心库
import Antd from 'ant-design-vue'
// 2. 引入全局样式（必须！）
import 'ant-design-vue/dist/reset.css'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import FormulaEditor from 'formula-editor-vue3'
import 'formula-editor-vue3/dist/style.css'

import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// 1. 先引入 vxe-pc-ui（基础组件库：modal、input、context-menu 等都在这里面）
import VxeUI from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'

// 2. 引入 vxe-table
import VxeUITable from 'vxe-table'
import 'vxe-table/lib/style.css'

// 3. 引入 vxe-gantt
import VxeUIGantt from 'vxe-gantt'
import 'vxe-gantt/lib/style.css'
import 'cesium/Build/Cesium/Widgets/widgets.css'

let app=createApp(App)
app.use(Antd)
app.use(ElementPlus, {
  locale: zhCn,  // 设置全局语言为中文
})
app.use(FormulaEditor)

app.use(VxeUI)        // 必须先注册 vxe-pc-ui
app.use(VxeUITable)   // 再注册 vxe-table
app.use(VxeUIGantt) 

app.mount('#app')
