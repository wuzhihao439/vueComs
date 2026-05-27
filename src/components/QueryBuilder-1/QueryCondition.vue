<!-- QueryCondition.vue - 条件组件 -->
<template>
    <div class="query-condition">
        <!-- 字段选择 -->
        <el-select v-model="condition.field" placeholder="选择字段" size="default" class="form-item"
            @change="handleFieldChange" filterable>
            <el-option v-for="field in fields" :key="field.name" :label="field.label" :value="field.name">
                <span style="float: left">{{ field.label }}</span>
                <span style="float: right; color: #8492a6; font-size: 12px">
                    {{ typeLabel(field.type) }}
                </span>
            </el-option>
        </el-select>

        <!-- 操作符选择 -->
        <el-select v-model="condition.operator" placeholder="操作符" size="default" class="form-item"
            :disabled="!condition.field">
            <el-option v-for="op in availableOperators" :key="op.value" :label="op.label" :value="op.value" />
        </el-select>

        <!-- 值输入 -->
        <div class="form-item value-input-wrapper">
            <template v-if="selectedField?.type === 'string'">
                <el-input v-model="condition.value" placeholder="请输入" size="default" clearable />
            </template>
            <template v-else-if="selectedField?.type === 'number'">
                <el-input-number v-model="condition.value" placeholder="请输入数字" size="default" :controls="false"
                    clearable />
            </template>
            <template v-else-if="selectedField?.type === 'date'">
                <el-date-picker v-model="condition.value" type="datetime" placeholder="选择日期时间" size="default"
                    value-format="YYYY-MM-DD HH:mm:ss" />
            </template>
            <template v-else-if="selectedField?.type === 'select'">
                <el-select v-model="condition.value" placeholder="请选择" size="default" clearable>
                    <el-option v-for="opt in selectedField.options" :key="opt.value" :label="opt.label"
                        :value="opt.value" />
                </el-select>
            </template>
            <template v-else-if="selectedField?.type === 'cascader'">
                <el-cascader v-model="condition.value" :options="selectedField.options" :props="{ checkStrictly: true }"
                    placeholder="请选择" size="default" clearable />
            </template>
            <template v-else>
                <el-input v-model="condition.value" placeholder="请先选择字段" size="default" disabled clearable />
            </template>
        </div>

        <!-- 删除按钮 -->
        <el-button type="danger" size="small" plain circle @click="handleDelete" class="delete-btn">
            <el-icon>
                <Delete />
            </el-icon>
        </el-button>
    </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { Delete } from '@element-plus/icons-vue'

const props = defineProps({
    modelValue: { type: Object, required: true },
    fields: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'delete'])

const condition = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const selectedField = computed(() => props.fields.find(f => f.name === condition.value.field))

const availableOperators = computed(() => {
    if (!selectedField.value) return []
    const operatorMap = {
        eq: { value: 'eq', label: '等于' },
        ne: { value: 'ne', label: '不等于' },
        gt: { value: 'gt', label: '大于' },
        gte: { value: 'gte', label: '大于等于' },
        lt: { value: 'lt', label: '小于' },
        lte: { value: 'lte', label: '小于等于' },
        like: { value: 'like', label: '包含' },
        notLike: { value: 'notLike', label: '不包含' }
    }
    const ops = selectedField.value.operators || getDefaultOperators(selectedField.value.type)
    return ops.map(op => operatorMap[op] || { value: op, label: op })
})

function getDefaultOperators(type) {
    const map = { string: ['eq', 'ne', 'like', 'notLike'], number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'], date: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'], select: ['eq', 'ne'], cascader: ['eq', 'ne'] }
    return map[type] || ['eq', 'ne']
}

function handleFieldChange() {
    condition.value.operator = ''
    condition.value.value = null
}

function typeLabel(type) {
    const labels = { string: '文本', number: '数字', date: '日期', select: '下拉', cascader: '级联' }
    return labels[type] || type
}

function handleDelete() {
    emit('delete')
}

watch(() => condition.value.operator, (newOp, oldOp) => {
    if (newOp !== oldOp && condition.value.value !== null) {
        const field = selectedField.value
        if (field?.type === 'number' && isNaN(Number(condition.value.value))) {
            condition.value.value = null
        }
    }
})
</script>

<style scoped>
.query-condition {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: #f5f7fa;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    transition: all 0.3s;
    width: 100%;
    box-sizing: border-box;
}

.query-condition:hover {
    background: #eef1f6;
    border-color: #c0c4cc;
}

.form-item {
    flex: 1;
    min-width: 0;
}

.form-item :deep(.el-input),
.form-item :deep(.el-input-number),
.form-item :deep(.el-select),
.form-item :deep(.el-date-editor),
.form-item :deep(.el-cascader) {
    width: 100% !important;
}

.delete-btn {
    opacity: 0.5;
    transition: opacity 0.2s;
    flex-shrink: 0;
}

.query-condition:hover .delete-btn {
    opacity: 1;
}

:deep(.el-input__wrapper),
:deep(.el-select .el-input__wrapper) {
    box-shadow: 0 0 0 1px #dcdfe6 inset;
}
</style>
