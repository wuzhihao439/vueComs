<<template>
    <div class="query-condition">
        <!-- 逻辑选择器：单字"且/或"，仅非第一个显示 -->
        <div class="cell logic-cell" v-if="!isFirst">
            <el-select v-model="condition.logic" placeholder="逻辑" size="default" style="width: 60px"
                @change="onLogicChange">
                <el-option label="且" value="AND" />
                <el-option label="或" value="OR" />
            </el-select>
        </div>
        <div class="cell logic-cell-placeholder" v-else></div>

        <!-- 字段选择：自适应宽度 -->
        <div class="cell field-cell">
            <el-select v-model="condition.field" placeholder="选择字段" size="default" clearable style="width: 100%"
                @change="onFieldChange">
                <el-option v-for="(config, key) in fields" :key="key" :label="config.label" :value="config.name" />
            </el-select>
        </div>

        <!-- 操作符：根据字段类型动态显示 -->
        <div class="cell operator-cell">
            <el-select v-model="condition.operator" placeholder="操作符" size="default" :disabled="!condition.field"
                style="width: 100%" @change="onOperatorChange">
                <el-option v-for="op in currentOperators" :key="op.value" :label="op.label" :value="op.value" />
            </el-select>
        </div>

        <!-- 值输入：自适应宽度 -->
        <div class="cell value-cell">
            <el-input v-if="!condition.field" placeholder="请先选择字段" disabled size="default" />
            <el-input-number v-else-if="fieldType === 'number'" v-model="condition.value" placeholder="请输入数值"
                size="default" style="width: 100%" @change="onValueChange" />
            <el-input v-else-if="fieldType === 'string'" v-model="condition.value" placeholder="请输入内容" size="default"
                clearable @input="onValueChange" />
            <template v-else-if="fieldType === 'date'">
                <el-date-picker v-if="condition.operator === 'BETWEEN'" v-model="dateRange" type="daterange"
                    range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="default"
                    style="width: 100%" @change="onDateRangeChange" />
                <el-date-picker v-else v-model="condition.value" type="date" placeholder="选择日期" size="default"
                    style="width: 100%" @change="onValueChange" />
            </template>
            <el-select v-else-if="fieldType === 'select'" v-model="condition.value" placeholder="请选择" size="default"
                clearable style="width: 100%" @change="onValueChange">
                <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-cascader v-else-if="fieldType === 'cascader'" v-model="cascadeValue" :options="cascadeOptions"
                :props="{ value: 'value', label: 'label', children: 'children' }" placeholder="请选择" size="default"
                style="width: 100%" clearable @change="onCascadeChange" />
            <el-input v-else v-model="condition.value" placeholder="请输入" size="default" clearable
                @input="onValueChange" />
        </div>

        <div class="cell action-cell">
            <el-button type="danger" :icon="Delete" circle size="small" plain @click="deleteCondition" title="删除条件" />
        </div>
    </div>
</template>

    <script setup>
    import { computed, ref, watch } from 'vue'
    import { Delete } from '@element-plus/icons-vue'

    const props = defineProps({ condition: { type: Object, required: true }, fields: { type: Array, required: true }, isFirst: { type: Boolean, default: true } })
    const emit = defineEmits(['update', 'delete'])

    const dateRange = ref([])
    const cascadeValue = ref([])

    const fieldConfig = computed(() => {

        return props.fields.find(v => v.name == props.condition.field) || {}
    })
    const fieldType = computed(() => {
        return fieldConfig.value.type
    })
    const currentOperators = computed(() => {


        if (!fieldConfig.value) return []
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
        const ops = fieldConfig.value.operators || getDefaultOperators(fieldConfig.value.type)

        return ops.map(op => operatorMap[op] || { value: op, label: op })
    })
    function getDefaultOperators(type) {
        const map = { string: ['eq', 'ne', 'like', 'notLike'], number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'], date: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'], select: ['eq', 'ne'], cascader: ['eq', 'ne'] }
        return map[type] || ['eq', 'ne']
    }
    const selectOptions = computed(() => fieldConfig.value.options || [])
    const cascadeOptions = computed(() => fieldConfig.value.options || [])

    watch(() => props.condition.field, (newField) => {

        if (fieldType.value === 'cascade' && props.condition.value) {
            for (const opt of cascadeOptions.value) {
                if (opt.value === props.condition.value) { cascadeValue.value = [opt.value]; return }
                if (opt.children) for (const child of opt.children) if (child.value === props.condition.value) { cascadeValue.value = [opt.value, child.value]; return }
            }
        }
        if (fieldType.value === 'date' && props.condition.operator === 'BETWEEN') {
            if (props.condition.value && props.condition.value2) dateRange.value = [props.condition.value, props.condition.value2]
        }
    }, { immediate: true })

    const onFieldChange = () => {
        const config = props.fields.find(v => v.name == props.condition.field) || {}
        if (config) {
            props.condition.operator = config.operators[0]  // 根据类型重置操作符
            props.condition.value = ''
            props.condition.value2 = ''
            dateRange.value = []
            cascadeValue.value = []
        } else {
            props.condition.operator = ''
            props.condition.value = ''
        }
        emitUpdate()
    }

    const onOperatorChange = () => { props.condition.value = ''; props.condition.value2 = ''; dateRange.value = []; emitUpdate() }
    const onValueChange = () => emitUpdate()
    const onLogicChange = () => emitUpdate()

    const onDateRangeChange = (val) => {
        if (val && val.length === 2) { props.condition.value = val[0]; props.condition.value2 = val[1] }
        else { props.condition.value = ''; props.condition.value2 = '' }
        emitUpdate()
    }

    const onCascadeChange = (val) => {
        if (val && val.length > 0) props.condition.value = val[val.length - 1]
        else props.condition.value = ''
        emitUpdate()
    }

    const deleteCondition = () => emit('delete')
    const emitUpdate = () => emit('update', { ...props.condition })
</script>

    <style scoped>
    .query-condition {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f5f7fa;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .query-condition:hover {
        border-color: #c0c4cc;
    }

    .cell {
        flex-shrink: 0;
    }

    .logic-cell {
        width: 60px;
    }

    .logic-cell-placeholder {
        width: 60px;
    }

    .field-cell {
        flex: 1;
        min-width: 120px;
    }

    /* 自适应占满 */
    .operator-cell {
        width: 100px;
        flex-shrink: 0;
    }

    /* 操作符固定宽度 */
    .value-cell {
        flex: 2;
        min-width: 160px;
    }

    /* 值输入自适应 */
    .action-cell {
        margin-left: auto;
        display: flex;
        align-items: center;
    }

    @media (max-width: 768px) {
        .query-condition {
            flex-direction: column;
            align-items: stretch;
        }

        .cell {
            width: 100% !important;
            min-width: auto;
        }

        .action-cell {
            margin-left: 0;
            text-align: right;
        }
    }
</style>
