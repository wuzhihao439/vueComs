// queryHandler.js - 查询条件转 SQL 处理函数

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
 * 值格式化
 */
function formatValue(value, dataType) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  switch (dataType) {
    case 'string':
      return "'" + String(value).replace(/'/g, "''") + "'";
    case 'number':
      return String(value);
    case 'date':
      return "'" + value + "'";
    case 'select':
    case 'cascader':
      if (Array.isArray(value)) {
        return "'" + value[value.length - 1] + "'";
      }
      return "'" + value + "'";
    default:
      return "'" + String(value).replace(/'/g, "''") + "'";
  }
}

/**
 * 构建单个条件 SQL
 */
function buildConditionSQL(condition) {
  if (!condition.field || !condition.operator) {
    return null;
  }

  const operator = OPERATOR_MAP[condition.operator];
  if (!operator) {
    return null;
  }

  const value = formatValue(condition.value, condition.dataType);

  // LIKE 操作符特殊处理：自动添加通配符
  if (condition.operator === 'like' || condition.operator === 'notLike') {
    const likeValue = value.replace(/^'|'$/g, '');
    return condition.field + ' ' + operator + " '%" + likeValue + "%'";
  }

  return condition.field + ' ' + operator + ' ' + value;
}

/**
 * 递归构建分组 SQL
 * 关键逻辑：分组内的条件使用分组自己的 logic 连接
 */
function buildGroupSQL(group, isRoot) {
  if (!group.children || group.children.length === 0) {
    return null;
  }

  const validChildren = [];

  for (const child of group.children) {
    let childSQL = null;

    if (child.type === 'condition') {
      childSQL = buildConditionSQL(child);
    } else if (child.type === 'group') {
      // 递归构建子分组，子分组不是根
      childSQL = buildGroupSQL(child, false);
    }

    if (childSQL) {
      validChildren.push(childSQL);
    }
  }

  if (validChildren.length === 0) {
    return null;
  }

  // 使用分组自己的 logic 连接子条件
  const logic = group.logic || 'AND';

  if (validChildren.length === 1) {
    // 根分组只有一个子项时，不加括号
    if (isRoot) {
      return validChildren[0];
    }
    // 非根分组只有一个子项时，仍然加括号保留分组结构
    return '(' + validChildren[0] + ')';
  }

  // 多个子项时，用 logic 连接并加括号
  // 如果是根分组，不加外层括号；非根分组加括号
  const joined = validChildren.join(' ' + logic + ' ');
  if (isRoot) {
    return joined;
  }
  return '(' + joined + ')';
}

/**
 * 主函数：将查询组件返回的数据转换为 SQL
 * @param {Object} queryData - 查询组件返回的数据
 * @param {Object} options - 配置选项
 * @returns {Object} - 包含 SQL 和相关信息的结构
 */
export function buildSQL(queryData, options = {}) {
  const {
    tableName = '',
    selectFields = '*',
    orderBy = '',
    limit = ''
  } = options;

  if (!queryData || !queryData.children || queryData.children.length === 0) {
    return {
      sql: tableName ? 'SELECT ' + selectFields + ' FROM ' + tableName : '',
      whereClause: '',
      valid: false
    };
  }

  // 构建 WHERE 子句，根分组传 isRoot=true
  const whereClause = buildGroupSQL(queryData, true);

  if (!whereClause) {
    return {
      sql: tableName ? 'SELECT ' + selectFields + ' FROM ' + tableName : '',
      whereClause: '',
      valid: false
    };
  }

  // 组装完整 SQL
  let sql = '';
  if (tableName) {
    sql = 'SELECT ' + selectFields + ' FROM ' + tableName;
    sql += ' WHERE ' + whereClause;
  } else {
    sql = 'WHERE ' + whereClause;
  }

  if (orderBy) {
    sql += ' ORDER BY ' + orderBy;
  }

  if (limit) {
    sql += ' LIMIT ' + limit;
  }

  return {
    sql: sql,
    whereClause: whereClause,
    valid: true
  };
}

/**
 * 参数化查询版本（防 SQL 注入）
 */
export function buildParamSQL(queryData, options = {}) {
  const params = [];
  let paramIndex = 0;

  function buildConditionParamSQL(condition) {
    if (!condition.field || !condition.operator) {
      return null;
    }

    const operator = OPERATOR_MAP[condition.operator];
    if (!operator) {
      return null;
    }

    let value = condition.value;
    if (value === null || value === undefined || value === '') {
      return condition.field + ' IS NULL';
    }

    // LIKE 操作符特殊处理
    if (condition.operator === 'like' || condition.operator === 'notLike') {
      if (condition.dataType === 'cascader' && Array.isArray(value)) {
        value = value[value.length - 1];
      }
      params.push('%' + value + '%');
      paramIndex++;
      return condition.field + ' ' + operator + ' $' + paramIndex;
    }

    if (condition.dataType === 'cascader' && Array.isArray(value)) {
      value = value[value.length - 1];
    }

    params.push(value);
    paramIndex++;
    return condition.field + ' ' + operator + ' $' + paramIndex;
  }

  function buildGroupParamSQL(group, isRoot) {
    if (!group.children || group.children.length === 0) {
      return null;
    }

    const validChildren = [];

    for (const child of group.children) {
      let childSQL = null;

      if (child.type === 'condition') {
        childSQL = buildConditionParamSQL(child);
      } else if (child.type === 'group') {
        childSQL = buildGroupParamSQL(child, false);
      }

      if (childSQL) {
        validChildren.push(childSQL);
      }
    }

    if (validChildren.length === 0) {
      return null;
    }

    const logic = group.logic || 'AND';

    if (validChildren.length === 1) {
      if (isRoot) {
        return validChildren[0];
      }
      return '(' + validChildren[0] + ')';
    }

    const joined = validChildren.join(' ' + logic + ' ');
    if (isRoot) {
      return joined;
    }
    return '(' + joined + ')';
  }

  const {
    tableName = '',
    selectFields = '*',
    orderBy = '',
    limit = ''
  } = options;

  const whereClause = buildGroupParamSQL(queryData, true);

  if (!whereClause) {
    return {
      sql: tableName ? 'SELECT ' + selectFields + ' FROM ' + tableName : '',
      whereClause: '',
      params: [],
      valid: false
    };
  }

  let sql = '';
  if (tableName) {
    sql = 'SELECT ' + selectFields + ' FROM ' + tableName + ' WHERE ' + whereClause;
  } else {
    sql = 'WHERE ' + whereClause;
  }

  if (orderBy) {
    sql += ' ORDER BY ' + orderBy;
  }

  if (limit) {
    sql += ' LIMIT ' + limit;
  }

  return {
    sql: sql,
    whereClause: whereClause,
    params: params,
    valid: true
  };
}

/**
 * 验证查询条件是否有效
 */
export function validateQuery(queryData) {
  const errors = [];

  function validateNode(node, path) {
    if (node.type === 'condition') {
      if (!node.field) {
        errors.push(path + ': 字段不能为空');
      }
      if (!node.operator) {
        errors.push(path + ': 操作符不能为空');
      }
      if (node.value === null || node.value === undefined || node.value === '') {
        errors.push(path + ': 值不能为空');
      }
    } else if (node.type === 'group') {
      if (!node.children || node.children.length === 0) {
        errors.push(path + ': 分组不能为空');
      } else {
        node.children.forEach(function(child, index) {
          validateNode(child, path + '[' + index + ']');
        });
      }
    }
  }

  validateNode(queryData, 'root');

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 扁平化查询条件（用于简单场景）
 */
export function flattenQuery(queryData) {
  const conditions = [];

  function traverse(node, parentLogic) {
    if (node.type === 'condition') {
      conditions.push({
        field: node.field,
        operator: node.operator,
        value: node.value,
        dataType: node.dataType,
        logic: parentLogic
      });
    } else if (node.type === 'group') {
      node.children.forEach(function(child) {
        traverse(child, node.logic || 'AND');
      });
    }
  }

  traverse(queryData, 'AND');
  return conditions;
}

export default {
  buildSQL: buildSQL,
  buildParamSQL: buildParamSQL,
  validateQuery: validateQuery,
  flattenQuery: flattenQuery
};
