function name(params) {
  // 5. 递归分配坐标（前序遍历，从上往下）—— 紧凑排列版本
  const ranksep = 400  // 层间距（水平方向）
  const nodesep = 15   // 兄弟节点垂直间距，改小！
  const levelPadding = 40  // 不同父节点的子树之间额外间距

  // 计算每个节点"下方实际需要的总高度"（紧凑版）
  const getCompactHeight = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId)
    const selfH = node?.size?.[1] || 60
    const children = childrenMap[nodeId] || []

    if (children.length === 0) {
      return selfH + nodesep  // 叶子节点：自身高度 + 一点间距
    }

    // 子节点高度之和 + 间距
    let childrenTotal = 0
    children.forEach((cid, idx) => {
      childrenTotal += getCompactHeight(cid)
      if (idx < children.length - 1) childrenTotal += nodesep
    })

    // 父节点高度和子节点总高度，取大的
    return Math.max(selfH + nodesep, childrenTotal)
  }
  const rootNodes = nodes.filter(n => !parentMap[n.id])

  // 先计算所有节点的紧凑高度
  rootNodes.forEach(r => getCompactHeight(r.id))

  // 递归布局：给节点分配坐标
  const layoutNodeCompact = (nodeId, x, startY) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return startY

    const nodeH = node?.size?.[1] || 60
    const nodeW = node?.size?.[0] || 180
    const children = childrenMap[nodeId] || []

    // 当前节点垂直居中于它所占的区域
    const myHeight = getCompactHeight(nodeId)
    node.x = x
    node.y = startY + myHeight / 2

    if (children.length === 0) {
      return startY + myHeight
    }

    // 子节点从当前节点上方开始往下排（紧凑）
    let currentY = startY
    children.forEach(childId => {
      const childH = getCompactHeight(childId)
      layoutNodeCompact(childId, x + ranksep, currentY)
      currentY += childH + nodesep
    })

    return startY + myHeight
  }

  // 6. 从根节点开始布局 —— 根节点也紧凑排列
  let currentRootY = 0
  rootNodes.forEach((root, idx) => {
    const h = getCompactHeight(root.id)
    layoutNodeCompact(root.id, 0, currentRootY)
    currentRootY += h + levelPadding  // 根节点之间间距
  })

  // 7. 整体居中平移（保持不变）
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  nodes.forEach(node => {
    const halfW = (node.size?.[0] || 180) / 2
    const halfH = (node.size?.[1] || 60) / 2
    minX = Math.min(minX, node.x - halfW)
    maxX = Math.max(maxX, node.x + halfW)
    minY = Math.min(minY, node.y - halfH)
    maxY = Math.max(maxY, node.y + halfH)
  })

  const offsetX = (canvasWidth - (maxX - minX)) / 2 - minX
  const offsetY = (canvasHeight - (maxY - minY)) / 2 - minY

  nodes.forEach(node => {
    node.x += offsetX
    node.y += offsetY
  })

  return { nodes, edges }

}