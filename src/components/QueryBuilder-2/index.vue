<<template>
    <div class="demo-page">
        <h2 class="page-title">高级查询构建组件</h2>
        <query-builder v-model="queryData" :fields="fieldConfig" @search="onSearch" @reset="onReset" />
    </div>
</template>

    <script setup>
    import { queryToFullSql } from './queryHandler.js'
    import { reactive } from 'vue'
    import QueryBuilder from './QueryBuilder.vue'

    const fieldConfig = [
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

    const queryData = reactive({ type: 'group', logic: '', children: [] })
    const onSearch = (payload) => {
        console.log('查询载荷:', payload)
        const sql = queryToFullSql(queryData, {
            tableName: 'users',
            fieldMapping: {
                age: { table: 'users', column: 'age', type: 'number' },
                status: { table: 'users', column: 'status', type: 'string' }
            }
        })
        console.log(111, sql);

    }
    const onReset = () => {
        console.log('reset');
        queryData = reactive({ type: 'group', logic: '', children: [] })

    }
</script>

    <style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #f0f2f5;
        padding: 20px;
    }

    .demo-page {
        max-width: 1000px;
        margin: 0 auto;
    }

    .page-title {
        text-align: center;
        margin-bottom: 20px;
        font-size: 20px;
        font-weight: 500;
        color: #303133;
    }
</style>
