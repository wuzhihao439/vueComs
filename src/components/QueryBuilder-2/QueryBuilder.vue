<<template>
    <div class="query-builder">
        <!-- 头部工具栏 -->
        <div class="qb-header">
            <div class="qb-title">高级查询</div>
            <div class="qb-actions">
                <el-button type="primary" :icon="Search" @click="handleSearch">
                    查询
                </el-button>
                <el-button :icon="RefreshRight" @click="resetValue">
                    重置
                </el-button>
                <el-button text @click="toggleDebug">
                    预览
                </el-button>
            </div>
        </div>

        <!-- 查询树 -->
        <div class="qb-body">
            <query-group :group="modelValue" :fields="fields" :level="0" :is-root="true" :max-level="maxLevel"
                @update="onUpdate" />
        </div>

        <!-- 调试面板 -->
        <div class="qb-debug" v-if="showDebug">
            <div class="qb-debug-tabs">
                <el-button text class="qb-debug-tab active">JSON</el-button>
                <el-button text class="qb-debug-tab" @click="showDebug = false">关闭</el-button>
            </div>
            <div class="qb-debug-content">
                <pre>{{ formattedJson }}</pre>
            </div>
        </div>
    </div>
</template>

    <script setup>
    import { computed, ref, watch } from 'vue'
    import { Search, RefreshRight } from '@element-plus/icons-vue'
    import QueryGroup from './QueryGroup.vue'

    const props = defineProps({
        modelValue: { type: Object, required: true },
        fields: { type: Array, required: true },
        maxLevel: { type: Number, default: 5 }
    })

    const emit = defineEmits(['update:modelValue', 'search', 'reset'])

    const showDebug = ref(false)
    const toggleDebug = () => { showDebug.value = !showDebug.value }
    const onUpdate = (val) => emit('update:modelValue', val)
    const resetValue = () => {
        const generateId = () => 'qb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        props.modelValue.children = [{
            _id: generateId(),
            type: 'condition',
            logic: '',
            field: '',
            operator: '',
            value: '',
            value2: ''
        }]
    }
    const clearConditions = (val) => {
        const generateId = () => 'qb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        val.children.push({
            _id: generateId(),
            type: 'condition',
            logic: '',
            field: '',
            operator: '',
            value: '',
            value2: ''
        })
    }
    // 初始化时确保根分组有一个空条件
    watch(() => props.modelValue, (val) => {
        if (val && val.children && val.children.length === 0) {
            clearConditions(val)
        }

    }, { immediate: true, deep: true })

    const generateQueryPayload = (node) => {
        if (!node) return null
        if (node.type === 'condition') {
            const result = { field: node.field, operator: node.operator, value: node.value }
            if (node.value2) result.value2 = node.value2
            if (node.logic) result.logic = node.logic
            return result
        }
        if (node.type === 'group') {
            const conditions = node.children.map(generateQueryPayload).filter(Boolean)
            return conditions.length ? { logic: node.logic, conditions } : null
        }
        return null
    }

    const handleSearch = () => {
        emit('search', generateQueryPayload(props.modelValue))
        console.log('props.modelValue', props.modelValue);

    }
    const formattedJson = computed(() => JSON.stringify(generateQueryPayload(props.modelValue), null, 2))
</script>

    <style scoped>
    .query-builder {
        background: #ffffff;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        font-size: 14px;
        color: #303133;
    }

    .qb-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e4e7ed;
    }

    .qb-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
    }

    .qb-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .qb-body {
        padding: 16px 20px 20px;
    }

    .qb-debug {
        border-top: 1px solid #e4e7ed;
        background: #fafafa;
    }

    .qb-debug-tabs {
        display: flex;
        gap: 0;
        border-bottom: 1px solid #e4e7ed;
        padding: 0 20px;
    }

    .qb-debug-tab {
        padding: 8px 16px;
        font-size: 13px;
    }

    .qb-debug-tab.active {
        color: #409eff;
        border-bottom: 2px solid #409eff;
        margin-bottom: -1px;
    }

    .qb-debug-content {
        padding: 16px 20px;
        max-height: 300px;
        overflow: auto;
    }

    .qb-debug-content pre {
        color: #303133;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
        white-space: pre-wrap;
        background: #fff;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
    }
</style>
