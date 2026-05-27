<<template>
    <div class="query-group">
        <div class="group-box" :class="{ 'is-root': isRoot, 'is-nested': level > 0 }">
            <!-- 分组头部 -->
            <div class="group-header">
                <!-- 逻辑选择器 - 仅非第一个节点显示，用单选框组 -->
                <div class="logic-cell" v-if="!isFirst">
                    <el-radio-group v-model="group.logic" size="small" @change="emitUpdate">
                        <el-radio-button label="AND">且</el-radio-button>
                        <el-radio-button label="OR">或</el-radio-button>
                    </el-radio-group>
                </div>
                <div class="logic-cell-placeholder" v-else></div>

                <!-- 操作按钮 -->
                <div class="group-actions">
                    <el-button link type="primary" :icon="Plus" @click="addCondition">
                        新增条件
                    </el-button>
                    <el-button link type="success" :icon="FolderAdd" @click="addGroup" :disabled="isMaxLevel">
                        新增分组
                    </el-button>
                    <el-button v-if="!isRoot" link type="danger" :icon="Delete" @click="deleteGroup">
                        删除
                    </el-button>
                </div>
            </div>

            <!-- 分组内容 -->
            <div class="group-content">
                <div v-for="(child, index) in group.children" :key="child._id || index" class="child-wrapper">
                    <!-- 连接线 - 始终显示，通过 class 控制连贯性 -->
                    <div class="connector">
                        <div class="connector-line-v"
                            :class="{ 'is-first': index === 0, 'is-last': index === group.children.length - 1 }"></div>
                        <div class="connector-line-h"></div>
                        <div class="connector-dot"></div>
                    </div>

                    <!-- 条件节点 -->
                    <query-condition v-if="child.type === 'condition'" :condition="child" :fields="fields"
                        :is-first="index === 0" @update="(c) => updateChild(index, c)" @delete="deleteChild(index)" />

                    <!-- 递归分组节点 -->
                    <query-group v-else-if="child.type === 'group'" :group="child" :fields="fields" :level="level + 1"
                        :is-root="false" :is-first="index === 0" :max-level="maxLevel"
                        @update="(g) => g ? updateChild(index, g) : deleteChild(index)" />
                </div>

                <!-- 空状态 -->
                <div v-if="group.children.length === 0" class="empty-state">
                    <el-text type="info">暂无查询条件，请点击"新增条件"添加</el-text>
                </div>
            </div>
        </div>
    </div>
</template>

    <script setup>
    import { computed } from 'vue'
    import { Plus, FolderAdd, Delete } from '@element-plus/icons-vue'
    import QueryCondition from './QueryCondition.vue'

    const props = defineProps({
        group: { type: Object, required: true },
        fields: { type: Array, required: true },
        level: { type: Number, default: 0 },
        isRoot: { type: Boolean, default: false },
        isFirst: { type: Boolean, default: true },
        maxLevel: { type: Number, default: 5 }
    })

    const emit = defineEmits(['update'])

    const isMaxLevel = computed(() => props.level >= props.maxLevel)
    const generateId = () => 'qb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

    // 创建空条件
    const createEmptyCondition = () => ({
        _id: generateId(),
        type: 'condition',
        logic: '',
        field: '',
        operator: '',
        value: '',
        value2: ''
    })

    const addCondition = () => {
        const newCondition = createEmptyCondition()
        // 如果不是第一个，设置默认逻辑为 AND
        if (props.group.children.length > 0) {
            newCondition.logic = 'AND'
        }
        props.group.children.push(newCondition)
        emitUpdate()
    }

    const addGroup = () => {
        const newGroup = {
            _id: generateId(),
            type: 'group',
            logic: props.group.children.length > 0 ? 'AND' : '',
            children: [createEmptyCondition()]
        }
        props.group.children.push(newGroup)
        emitUpdate()
    }

    const updateChild = (index, child) => {
        props.group.children[index] = child
        emitUpdate()
    }

    const deleteChild = (index) => {
        props.group.children.splice(index, 1)
        // 更新第一个子项的逻辑为空
        if (props.group.children.length > 0) {
            props.group.children[0].logic = ''
        }
        emitUpdate()
    }

    const deleteGroup = () => {
        emit('update', null)
    }

    const emitUpdate = () => {
        emit('update', { ...props.group })
    }
</script>

    <style scoped>
    .query-group {
        position: relative;
    }

    .group-box {
        background: #fff;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        padding: 12px 16px;
    }

    .group-box.is-root {
        border: 1px solid #e4e7ed;
    }

    .group-box.is-nested {
        margin-top: 8px;
        background: #fafafa;
    }

    /* 头部 */
    .group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px dashed #dcdfe6;
    }

    /* 逻辑选择 - 单选框组 */
    .logic-cell {
        flex-shrink: 0;
    }

    .logic-cell-placeholder {
        width: 90px;
        flex-shrink: 0;
    }

    /* 操作按钮 */
    .group-actions {
        margin-left: auto;
        display: flex;
        gap: 8px;
    }

    /* 内容区 */
    .group-content {
        position: relative;
        padding-left: 28px;
    }

    /* 子项包装器 */
    .child-wrapper {
        position: relative;
        margin-bottom: 8px;
    }

    .child-wrapper:last-child {
        margin-bottom: 0;
    }

    /* 连接线 - 修复连贯性 */
    .connector {
        position: absolute;
        left: -28px;
        top: 0;
        bottom: 0;
        width: 28px;
    }

    /* 垂直线 - 贯穿整个高度 */
    .connector-line-v {
        position: absolute;
        left: 8px;
        top: -4px;
        width: 2px;
        height: calc(100% + 8px);
        background: #c0c4cc;
    }

    /* 第一个子项：垂直线从中间开始（不超出上方） */
    .connector-line-v.is-first {
        top: 22px;
        height: calc(100% - 18px);
    }

    /* 最后一个子项：垂直线只到中间 */
    .connector-line-v.is-last {
        height: 22px;
    }

    /* 既是第一个又是最后一个（只有一个子项）：不显示垂直线 */
    .connector-line-v.is-first.is-last {
        display: none;
    }

    /* 水平线 */
    .connector-line-h {
        position: absolute;
        left: 8px;
        top: 22px;
        width: 20px;
        height: 2px;
        background: #c0c4cc;
    }

    /* 圆点 */
    .connector-dot {
        position: absolute;
        left: 5px;
        top: 22px;
        transform: translateY(-50%);
        width: 8px;
        height: 8px;
        background: #fff;
        border: 2px solid #909399;
        border-radius: 50%;
        z-index: 1;
    }

    /* 空状态 */
    .empty-state {
        text-align: center;
        padding: 24px;
    }
</style>
