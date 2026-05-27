<!-- QueryGroup.vue - 递归分组组件 -->
<template>
    <div class="query-group" :class="{ 'is-root': isRoot }">
        <!-- 分组头部：左上方显示逻辑，右上方显示操作按钮 -->
        <div class="group-toolbar">
            <div class="toolbar-left">
                <el-radio-group v-model="modelValue.logic" size="small" class="logic-selector">
                    <el-radio-button label="AND">并且</el-radio-button>
                    <el-radio-button label="OR">或者</el-radio-button>
                </el-radio-group>
            </div>

            <div class="toolbar-right">
                <el-button type="primary" size="small" text @click="addCondition">
                    <el-icon>
                        <Plus />
                    </el-icon>新增条件
                </el-button>
                <el-button type="success" size="small" text @click="addGroup">
                    <el-icon>
                        <FolderAdd />
                    </el-icon>新增分组
                </el-button>
                <el-button v-if="!isRoot" type="danger" size="small" text circle @click="handleDelete"
                    class="delete-group-btn">
                    <el-icon>
                        <Delete />
                    </el-icon>
                </el-button>
            </div>
        </div>

        <!-- 子节点列表 -->
        <div class="group-content">
            <div v-for="(child, index) in modelValue.children" :key="child.id" class="node-item"
                :class="{ 'is-first': index === 0, 'is-last': index === modelValue.children.length - 1 }">
                <!-- 条件节点 -->
                <div v-if="child.type === 'condition'" class="condition-row">
                    <div class="tree-line-area">
                        <div class="v-line"></div>
                        <div class="h-line"></div>
                        <div class="dot"></div>
                    </div>
                    <query-condition v-model="modelValue.children[index]" :fields="fields"
                        @delete="handleDeleteChild(child)" />
                </div>

                <!-- 递归渲染子分组 -->
                <div v-else-if="child.type === 'group'" class="group-row">
                    <div class="tree-line-area group-line-area">
                        <div class="v-line"></div>
                        <div class="h-line group-h-line"></div>
                        <div class="dot group-dot"></div>
                    </div>
                    <query-group v-model="modelValue.children[index]" :fields="fields" :level="level + 1"
                        :is-root="false" @delete="handleDeleteChild(child)" />
                </div>
            </div>

            <!-- 空状态 -->
            <div v-if="modelValue.children.length === 0" class="empty-group">
                <el-empty description="暂无查询条件" :image-size="50">
                    <template #default>
                        <div class="empty-actions">
                            <el-button type="primary" size="small" @click="addCondition">
                                <el-icon>
                                    <Plus />
                                </el-icon>添加条件
                            </el-button>
                            <el-button type="success" size="small" @click="addGroup">
                                <el-icon>
                                    <FolderAdd />
                                </el-icon>添加分组
                            </el-button>
                        </div>
                    </template>
                </el-empty>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, FolderAdd, Delete } from '@element-plus/icons-vue'
import QueryCondition from './QueryCondition.vue'

const props = defineProps({
    modelValue: { type: Object, required: true },
    fields: { type: Array, default: () => [] },
    level: { type: Number, default: 0 },
    isRoot: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'delete'])

const modelValue = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

function addCondition() {
    modelValue.value.children.push({
        id: generateId(),
        type: 'condition',
        field: '',
        operator: '',
        value: null
    })
}

function addGroup() {
    modelValue.value.children.push({
        id: generateId(),
        type: 'group',
        logic: 'AND',
        children: [{
            id: generateId(),
            type: 'condition',
            field: '',
            operator: '',
            value: null
        }]
    })
}

function handleDelete() {
    emit('delete', props.modelValue)
}

function handleDeleteChild(child) {
    const index = modelValue.value.children.findIndex(c => c.id === child.id)
    if (index > -1) {
        modelValue.value.children.splice(index, 1)
    }
}

function generateId() {
    return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}
</script>

<style scoped>
.query-group {
    position: relative;
    width: 100%;
    box-sizing: border-box;
}

.query-group.is-root {
    background: transparent;
    border: none;
    padding: 0;
}

.query-group:not(.is-root) {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #e4e7ed;
    width: 100%;
    box-sizing: border-box;
}

.group-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #dcdfe6;
}

.toolbar-left {
    display: flex;
    align-items: center;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
}

.logic-selector :deep(.el-radio-button__inner) {
    padding: 4px 12px;
    font-size: 12px;
}

.group-content {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.node-item {
    position: relative;
    width: 100%;
}

.condition-row,
.group-row {
    display: flex;
    align-items: stretch;
    width: 100%;
    margin-bottom: 8px;
    position: relative;
}

.node-item.is-last .condition-row,
.node-item.is-last .group-row {
    margin-bottom: 0;
}

.tree-line-area {
    position: relative;
    width: 24px;
    flex-shrink: 0;
    margin-right: 0;
}

.v-line {
    position: absolute;
    left: 11px;
    top: -8px;
    bottom: -8px;
    width: 2px;
    background: #c0c4cc;
}

.h-line {
    position: absolute;
    left: 11px;
    top: 50%;
    width: 13px;
    height: 2px;
    background: #c0c4cc;
    transform: translateY(-50%);
}

.dot {
    position: absolute;
    left: 7px;
    top: 50%;
    width: 10px;
    height: 10px;
    background: #fff;
    border: 2px solid #c0c4cc;
    border-radius: 50%;
    transform: translateY(-50%);
    z-index: 1;
}

.group-h-line {
    width: 13px;
}

.group-dot {
    left: 7px;
}

.node-item.is-first .v-line {
    top: -8px;
}

.node-item.is-last .v-line {
    bottom: 50%;
}

.node-item.is-first.is-last .v-line {
    top: -8px;
    bottom: 50%;
}

.is-root .node-item.is-first .v-line {
    top: -8px;
}

.is-root .node-item.is-first.is-last .v-line {
    top: -8px;
}

.delete-group-btn {
    margin-left: 4px;
}

.empty-group {
    padding: 20px 0;
}

.empty-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
}
</style>
