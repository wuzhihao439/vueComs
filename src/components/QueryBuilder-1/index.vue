<!-- App.vue - 使用示例 -->
<<template>
    <div class="app">
        <h2>高级查询构建器</h2>
        <query-builder @query="handleQuery" />

        <el-card v-if="lastQuery" class="result-card" header="上次查询结果">
            <pre>{{ JSON.stringify(lastQuery, null, 2) }}</pre>
        </el-card>
    </div>
</template>

    <script setup>
    import { buildSQL, buildParamSQL, validateQuery } from './queryHandler.js';
    import { ref } from 'vue'
    import QueryBuilder from './QueryBuilder.vue'

    const lastQuery = ref(null)

    function handleQuery(queryData) {
        console.log('查询数据:', queryData)
        lastQuery.value = queryData

        // 1. 直接生成 SQL
        const result1 = buildSQL(queryData, {
            tableName: 'users',
            selectFields: 'id, name, age, status',
            orderBy: 'id DESC',
            limit: '10'
        });
        console.log(result1.sql);
    }
</script>

    <style>
    .app {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }

    .result-card {
        margin-top: 20px;
    }

    .result-card pre {
        background: #f5f7fa;
        padding: 16px;
        border-radius: 4px;
        overflow-x: auto;
    }
</style>
