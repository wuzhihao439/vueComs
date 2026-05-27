<!-- QueryBuilder.vue - 主组件 -->
<template>
    <div class="query-builder">
        <div class="query-builder-header">
            <h3 class="title">高级查询</h3>
            <div class="header-actions">
                <el-button type="primary" size="small" @click="handleQuery">
                    <el-icon>
                        <Search />
                    </el-icon>查询
                </el-button>
                <el-button size="small" @click="handleReset">重置</el-button>
                <el-button type="info" size="small" text @click="showJson = !showJson">
                    {{ showJson ? '隐藏' : '预览' }}
                </el-button>
            </div>
        </div>

        <div class="root-query-area">
            <query-group v-model="rootGroup" :fields="fields" :level="0" :is-root="true" @delete="removeItem" />
        </div>

        <el-drawer v-model="showJson" title="查询结构预览" size="50%">
            <el-tabs v-model="activeTab">
                <el-tab-pane label="SQL 预览" name="sql">
                    <pre class="code-preview">{{ generatedSQL || '暂无查询条件' }}</pre>
                </el-tab-pane>
                <el-tab-pane label="JSON 结构" name="json">
                    <pre class="code-preview">{{ JSON.stringify(queryResult, null, 2) }}</pre>
                </el-tab-pane>
            </el-tabs>
        </el-drawer>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import QueryGroup from './QueryGroup.vue'

const props = defineProps({
    fields: {
        type: Array,
        default: () => [
            { name: 'name', label: '姓名', type: 'string', operators: ['eq', 'ne', 'like', 'notLike'] },
            { name: 'age', label: '年龄', type: 'number', operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
            { name: 'birthday', label: '出生日期', type: 'date', operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
            { name: 'status', label: '状态', type: 'select', options: [{ label: '启用', value: 1 }, { label: '禁用', value: 0 }], operators: ['eq', 'ne'] },
            {
                name: 'department', label: '部门', type: 'cascader', options: [
                    { label: '技术部', value: 'tech', children: [{ label: '前端组', value: 'frontend' }, { label: '后端组', value: 'backend' }] },
                    { label: '销售部', value: 'sales', children: [{ label: '国内销售', value: 'domestic' }, { label: '海外销售', value: 'overseas' }] }
                ], operators: ['eq', 'ne']
            },
            { name: 'amount', label: '金额', type: 'number', operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
            { name: 'remark', label: '备注', type: 'string', operators: ['eq', 'ne', 'like', 'notLike'] }
        ]
    }
})

const emit = defineEmits(['query'])

const showJson = ref(false)
const activeTab = ref('sql')

const rootGroup = ref({
    id: generateId(),
    type: 'group',
    logic: 'AND',
    children: [createEmptyCondition()]
})

function generateId() {
    return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function createEmptyCondition() {
    return {
        id: generateId(),
        type: 'condition',
        field: '',
        operator: '',
        value: null
    }
}

function addCondition(group) {
    group.children.push(createEmptyCondition())
}

function addGroup(parentGroup) {
    parentGroup.children.push({
        id: generateId(),
        type: 'group',
        logic: 'AND',
        children: [createEmptyCondition()]
    })
}

function removeItem(item) {
    const removeFromParent = (parent, targetId) => {
        const index = parent.children.findIndex(child => child.id === targetId)
        if (index > -1) {
            parent.children.splice(index, 1)
            return true
        }
        for (const child of parent.children) {
            if (child.type === 'group') {
                if (removeFromParent(child, targetId)) return true
            }
        }
        return false
    }
    removeFromParent(rootGroup.value, item.id)
}

const queryResult = computed(() => buildQueryNode(rootGroup.value))

function buildQueryNode(node) {
    if (node.type === 'condition') {
        const field = props.fields.find(f => f.name === node.field)
        return {
            type: 'condition',
            field: node.field,
            operator: node.operator,
            value: node.value,
            dataType: field?.type || 'string'
        }
    }
    if (node.type === 'group') {
        return {
            type: 'group',
            logic: node.logic,
            children: node.children.map(child => buildQueryNode(child)).filter(Boolean)
        }
    }
    return null
}

const generatedSQL = computed(() => buildSQL(queryResult.value))

function buildSQL(node) {
    if (!node) return ''

    if (node.type === 'condition') {
        if (!node.field || !node.operator) return ''
        const opMap = { 'eq': '=', 'ne': '!=', 'gt': '>', 'gte': '>=', 'lt': '<', 'lte': '<=', 'like': 'LIKE', 'notLike': 'NOT LIKE' }
        const operator = opMap[node.operator] || '='
        let value = node.value
        if (typeof value === 'string') value = `\'${value}\'`
        if (value === null || value === undefined) value = 'NULL'
        return `${node.field} ${operator} ${value}`
    }

    if (node.type === 'group') {
        const validChildren = node.children
            .map(child => buildSQL(child))
            .filter(Boolean)

        if (validChildren.length === 0) return ''
        if (validChildren.length === 1) return validChildren[0]

        const childrenSQL = validChildren.join(`\n  ${node.logic}\n`)
        return `(\n${childrenSQL}\n)`
    }
    return ''
}

function handleQuery() {
    emit('query', queryResult.value)
}

function handleReset() {
    rootGroup.value = {
        id: generateId(),
        type: 'group',
        logic: 'AND',
        children: [createEmptyCondition()]
    }
}
</script>

<style scoped>
.query-builder {
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
    max-width: 1200px;
    margin: 0 auto;
}

.query-builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
}

.title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.root-query-area {
    min-height: 120px;
}

.code-preview {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
}
</style>
