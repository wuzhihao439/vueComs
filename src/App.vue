<template>
  <div>
    <QueryBuilder></QueryBuilder>
  </div>
</template>

<script setup>
import QueryBuilder from './components/QueryBuilder-2/index.vue'
import newGant from './components/gant/newGant.vue'
import { ref } from 'vue'

const showLoading = ref(false)

const handleComplete = () => {
  console.log('加载完成！')
  // 执行后续操作
}

</script>


<!-- npm install @antv/g6@4.8.0 dagre@0.8.5
# 或
yarn add @antv/g6@4.8.0 dagre@0.8.5 -->


<style>
.app-layout {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.logo {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin-right: 48px;
}

.content {
  padding: 0;
  display: block;
  height: 100vh;
}
</style>
