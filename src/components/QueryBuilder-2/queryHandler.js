/**
 * 高级查询组件 - SQL 生成器
 * 将查询组件生成的数据结构转换为标准 SQL WHERE 条件
 * 
 * 逻辑规则：
 * 1. 第一个条件/分组的逻辑符忽略
 * 2. 后续条件用自身的 logic 字段与前一个节点拼接
 * 3. 分组内部条件用条件自身的 logic 字段拼接
 * 4. 参数值直接拼接到SQL中（非参数化）
 */


/**
 * 字段映射配置
 */
const FIELD_MAPPING = {
  age: { table: 'users', column: 'age', type: 'number' },
  salary: { table: 'users', column: 'salary', type: 'number' },
  score: { table: 'users', column: 'score', type: 'number' },
  name: { table: 'users', column: 'name', type: 'string' },
  email: { table: 'users', column: 'email', type: 'string' },
  phone: { table: 'users', column: 'phone', type: 'string' },
  createTime: { table: 'users', column: 'create_time', type: 'datetime' },
  updateTime: { table: 'users', column: 'update_time', type: 'datetime' },
  status: { table: 'users', column: 'status', type: 'string' },
  gender: { table: 'users', column: 'gender', type: 'string' },
  department: { table: 'users', column: 'department', type: 'string' },
  region: { table: 'users', column: 'region_code', type: 'string' }
}

/**
 * SQL字符串转义
 */
function escapeSqlString(str) {
  if (typeof str !== 'string') return str
  return str.replace(/'/g, "''")
}

/**
 * 格式化值（根据类型决定是否需要引号）
 */
function formatValue(value, fieldType) {
  if (value === null || value === undefined || value === '') {
    return 'NULL'
  }

  const needsQuotes = ['string', 'datetime', 'date', 'select', 'cascade'].includes(fieldType)

  if (needsQuotes) {
    return `'${escapeSqlString(String(value))}'`
  }

  // 数字类型直接返回
  return String(value)
}

/**
 * 获取完整字段名
 */
function getColumnName(field, fieldMapping, tableAlias) {
  const mapping = fieldMapping[field]
  if (!mapping) {
    return tableAlias ? `${tableAlias}.${field}` : field
  }
  const prefix = tableAlias || mapping.table
  return `${prefix}.${mapping.column}`
}
/**
 * 操作符映射
 */
const OPERATOR_MAP = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  notLike: 'NOT LIKE'
};
/**
 * 构建单个条件SQL
 */
function buildSingleCondition(condition, fieldMapping, tableAlias) {
  const { field, operator, value, value2 } = condition
  if (!field || !operator) return ''

  const column = getColumnName(field, fieldMapping, tableAlias)
  const fieldType = fieldMapping[field]?.type || 'string'
  const formattedValue = formatValue(value, fieldType)

  if (formattedValue === 'NULL' && !['IS NULL', 'IS NOT NULL'].includes(operator)) {
    return ''
  }
const operatorValue = OPERATOR_MAP[operator];
  switch (operator) {
    case 'like':
    case 'notLike':
      return `${column} ${operatorValue} '%${escapeSqlString(String(value))}%'`

    case 'IN':
    case 'NOT IN': {
      const values = Array.isArray(value) ? value : [value]
      const formattedValues = values.map(v => formatValue(v, fieldType))
      return `${column} ${operatorValue} (${formattedValues.join(', ')})`
    }

    case 'BETWEEN': {
      const formattedValue2 = formatValue(value2, fieldType)
      return `${column} BETWEEN ${formattedValue} AND ${formattedValue2}`
    }

    default:
      // =, !=, >, <, >=, <=
      return `${column} ${operatorValue} ${formattedValue}`
  }
}

/**
 * 主函数：生成SQL
 * @param {Object} queryData - 查询组件生成的数据结构
 * @param {Object} options - 配置选项
 * @param {Object} options.fieldMapping - 字段映射配置
 * @param {String} options.tableAlias - 表别名
 * @returns {String} SQL WHERE 条件字符串
 * 
 * 使用示例：
 * const sql = queryToSql(queryData)
 * // "age > 18 AND status = 'active' OR (department = 'tech' OR salary > 10000) AND create_time BETWEEN '2024-01-01' AND '2024-12-31'"
 */
export function queryToSql(queryData, options = {}) {
  const {
    fieldMapping = FIELD_MAPPING,
    tableAlias = null
  } = options

  /**
   * 递归构建条件
   * 核心逻辑：每个节点（条件或分组）用自身的 logic 字段与前一个节点拼接
   * 第一个节点的 logic 被忽略
   */
  const buildCondition = (node, isFirst = true) => {
    if (!node) return ''

    if (node.type === 'condition') {
      const conditionSql = buildSingleCondition(node, fieldMapping, tableAlias)
      if (!conditionSql) return ''

      // 第一个条件不拼接逻辑符
      if (isFirst) {
        return conditionSql
      }

      // 后续条件用自身的 logic 拼接
      const logic = node.logic || 'AND'
      return `${logic} ${conditionSql}`
    }

    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) return ''

      // 递归构建分组内部条件
      const parts = []
      node.children.forEach((child, index) => {
        const childIsFirst = index === 0
        const childSql = buildCondition(child, childIsFirst)
        if (childSql) {
          parts.push(childSql)
        }
      })

      if (parts.length === 0) return ''

      const groupSql = parts.join(' ')

      // 第一个分组不拼接逻辑符
      if (isFirst) {
        return `(${groupSql})`
      }

      // 后续分组用自身的 logic 拼接
      const logic = node.logic || 'AND'
      return `${logic} (${groupSql})`
    }

    return ''
  }

  // 执行生成
  const whereClause = buildCondition(queryData, true)

  return whereClause
}

/**
 * 生成完整的 SQL 查询语句
 */
export function queryToFullSql(queryData, options = {}) {
  const {
    fieldMapping = FIELD_MAPPING,
    tableAlias = null,
    tableName = 'users',
    selectFields = '*'
  } = options

  const whereClause = queryToSql(queryData, { fieldMapping, tableAlias })

  if (!whereClause) {
    return `SELECT ${selectFields} FROM ${tableName}`
  }

  return `SELECT ${selectFields} FROM ${tableName} WHERE ${whereClause}`
}

/**
 * 生成 MyBatis XML 条件
 */
export function queryToMyBatisXml(queryData, options = {}) {
  const { fieldMapping = FIELD_MAPPING } = options

  const buildXml = (node, isFirst = true, indent = 0) => {
    const spaces = '  '.repeat(indent)

    if (!node) return ''

    if (node.type === 'condition') {
      const { field, operator, value, logic } = node
      const mapping = fieldMapping[field]
      const column = mapping ? mapping.column : field

      let xml = ''
      xml += `${spaces}<if test="${field} != null and ${field} != ''">\n`

      // 非第一个条件才输出逻辑符
      if (!isFirst && logic) {
        xml += `${spaces}  ${logic}\n`
      }

      switch (operator) {
        case 'LIKE':
        case 'NOT LIKE':
          xml += `${spaces}  ${column} ${operator} CONCAT('%', #{${field}}, '%')\n`
          break
        case 'IN':
        case 'NOT IN':
          xml += `${spaces}  ${column} ${operator}\n`
          xml += `${spaces}  <foreach collection="${field}List" item="item" open="(" separator="," close=")">\n`
          xml += `${spaces}    #{item}\n`
          xml += `${spaces}  </foreach>\n`
          break
        case 'BETWEEN':
          xml += `${spaces}  ${column} BETWEEN #{${field}Start} AND #{${field}End}\n`
          break
        default:
          xml += `${spaces}  ${column} ${operator} #{${field}}\n`
      }

      xml += `${spaces}</if>\n`
      return xml
    }

    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) return ''

      let xml = ''

      // 非第一个分组才输出逻辑符和括号包裹
      if (!isFirst && node.logic) {
        xml += `${spaces}${node.logic} <trim prefix="(" suffix=")">\n`
      } else {
        xml += `${spaces}<trim prefix="(" suffix=")">\n`
      }

      node.children.forEach((child, index) => {
        const childXml = buildXml(child, index === 0, indent + 1)
        if (childXml) {
          xml += childXml
        }
      })

      xml += `${spaces}</trim>\n`
      return xml
    }

    return ''
  }

  return buildXml(queryData, true)
}

/**
 * 生成 MyBatis-Plus QueryWrapper
 */
export function queryToMyBatisPlus(queryData, options = {}) {
  const { fieldMapping = FIELD_MAPPING } = options

  let code = 'QueryWrapper<YourEntity> wrapper = new QueryWrapper<>();\n'

  const buildWrapper = (node, isFirst = true) => {
    if (!node) return ''

    if (node.type === 'condition') {
      const { field, operator, value, logic } = node
      const mapping = fieldMapping[field]
      const column = mapping ? `"${mapping.column}"` : `"${field}"`

      let prefix = ''
      if (!isFirst && logic) {
        prefix = `wrapper.${logic === 'OR' ? 'or' : 'and'}();\n`
      }

      switch (operator) {
        case '=':
          return prefix + `wrapper.eq(${column}, ${JSON.stringify(value)});\n`
        case '!=':
          return prefix + `wrapper.ne(${column}, ${JSON.stringify(value)});\n`
        case '>':
          return prefix + `wrapper.gt(${column}, ${JSON.stringify(value)});\n`
        case '<':
          return prefix + `wrapper.lt(${column}, ${JSON.stringify(value)});\n`
        case '>=':
          return prefix + `wrapper.ge(${column}, ${JSON.stringify(value)});\n`
        case '<=':
          return prefix + `wrapper.le(${column}, ${JSON.stringify(value)});\n`
        case 'LIKE':
          return prefix + `wrapper.like(${column}, ${JSON.stringify(value)});\n`
        case 'NOT LIKE':
          return prefix + `wrapper.notLike(${column}, ${JSON.stringify(value)});\n`
        case 'IN':
          return prefix + `wrapper.in(${column}, Arrays.asList(${JSON.stringify(value)}));\n`
        case 'NOT IN':
          return prefix + `wrapper.notIn(${column}, Arrays.asList(${JSON.stringify(value)}));\n`
        case 'BETWEEN':
          return prefix + `wrapper.between(${column}, ${JSON.stringify(value)}, ${JSON.stringify(node.value2)});\n`
        default:
          return prefix + `wrapper.apply("${mapping?.column || field} ${operator} {0}", ${JSON.stringify(value)});\n`
      }
    }

    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) return ''

      let groupCode = ''

      if (!isFirst && node.logic === 'OR') {
        groupCode += `wrapper.or(w -> {\n`
      } else {
        groupCode += `wrapper.and(w -> {\n`
      }

      node.children.forEach((child, index) => {
        const childCode = buildWrapper(child, index === 0)
        if (childCode) {
          groupCode += '  ' + childCode
        }
      })

      groupCode += `});\n`
      return groupCode
    }

    return ''
  }

  code += buildWrapper(queryData, true)
  return code
}

/**
 * 生成 Sequelize Where 对象
 */
export function queryToSequelize(queryData, options = {}) {
  const { Op } = options

  const buildWhere = (node) => {
    if (!node) return {}

    if (node.type === 'condition') {
      const { field, operator, value, value2 } = node

      switch (operator) {
        case '=':
          return { [field]: value }
        case '!=':
          return { [field]: { [Op.ne]: value } }
        case '>':
          return { [field]: { [Op.gt]: value } }
        case '<':
          return { [field]: { [Op.lt]: value } }
        case '>=':
          return { [field]: { [Op.gte]: value } }
        case '<=':
          return { [field]: { [Op.lte]: value } }
        case 'LIKE':
          return { [field]: { [Op.like]: `%${value}%` } }
        case 'NOT LIKE':
          return { [field]: { [Op.notLike]: `%${value}%` } }
        case 'IN':
          return { [field]: { [Op.in]: Array.isArray(value) ? value : [value] } }
        case 'NOT IN':
          return { [field]: { [Op.notIn]: Array.isArray(value) ? value : [value] } }
        case 'BETWEEN':
          return { [field]: { [Op.between]: [value, value2] } }
        default:
          return { [field]: value }
      }
    }

    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) return {}

      const conditions = node.children
        .map(child => buildWhere(child))
        .filter(obj => Object.keys(obj).length > 0)

      if (node.logic === 'OR') {
        return { [Op.or]: conditions }
      }
      return { [Op.and]: conditions }
    }

    return {}
  }

  return buildWhere(queryData)
}

/**
 * 生成 Prisma Where 对象
 */
export function queryToPrisma(queryData, options = {}) {
  const buildWhere = (node) => {
    if (!node) return {}

    if (node.type === 'condition') {
      const { field, operator, value, value2 } = node

      switch (operator) {
        case '=':
          return { [field]: value }
        case '!=':
          return { [field]: { not: value } }
        case '>':
          return { [field]: { gt: value } }
        case '<':
          return { [field]: { lt: value } }
        case '>=':
          return { [field]: { gte: value } }
        case '<=':
          return { [field]: { lte: value } }
        case 'LIKE':
          return { [field]: { contains: value } }
        case 'NOT LIKE':
          return { [field]: { not: { contains: value } } }
        case 'IN':
          return { [field]: { in: Array.isArray(value) ? value : [value] } }
        case 'NOT IN':
          return { [field]: { notIn: Array.isArray(value) ? value : [value] } }
        case 'BETWEEN':
          return { [field]: { gte: value, lte: value2 } }
        default:
          return { [field]: value }
      }
    }

    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) return {}

      const conditions = node.children
        .map(child => buildWhere(child))
        .filter(obj => Object.keys(obj).length > 0)

      if (node.logic === 'OR') {
        return { OR: conditions }
      }
      return { AND: conditions }
    }

    return {}
  }

  return buildWhere(queryData)
}

// 默认导出
export default {
  queryToSql,
  queryToFullSql,
  queryToMyBatisXml,
  queryToMyBatisPlus,
  queryToSequelize,
  queryToPrisma
}
