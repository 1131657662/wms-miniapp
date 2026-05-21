/**
 * 统一解析接口 data：裸数组或 `{ list }`；兼容历史 `{ rows }`。
 * @param {unknown} data
 * @returns {any[]}
 */
function responseList(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") {
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.rows)) return data.rows;
  }
  return [];
}

/**
 * 分页等：从 `{ total }` 取条数，缺省或非数字时为 0。
 * @param {unknown} data
 * @returns {number}
 */
/** 出入库列表：按业务日期降序，同日按 id 降序 */
function sortOrdersByDateDesc(list, dateField) {
  return list.slice().sort((a, b) => {
    const byDate = String(b[dateField] || "").localeCompare(String(a[dateField] || ""));
    if (byDate !== 0) return byDate;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function responseTotal(data) {
  if (data == null || typeof data !== "object") return 0;
  const t = data.total;
  if (t == null || t === "") return 0;
  const n = typeof t === "number" ? t : Number(t);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 字典 data 列表：保留原字段，规范 dict_value / dict_label、remark。
 * @param {unknown} data
 * @returns {object[]}
 */
function responseDictList(data) {
  return responseList(data).map(row => {
    if (!row || typeof row !== "object") {
      return { dict_value: "", dict_label: "" };
    }
    const r = row.remark;
    const out = {
      ...row,
      dict_value: String(row.dict_value ?? ""),
      dict_label: String(row.dict_label ?? "")
    };
    out.remark = r == null || r === "" ? undefined : String(r);
    return out;
  });
}

function dictDataToOptions(rows) {
  return rows.map(d => ({ label: d.dict_label, value: d.dict_value }));
}

function responseDictOptions(data) {
  return dictDataToOptions(responseDictList(data));
}

module.exports = {
  responseList,
  sortOrdersByDateDesc,
  responseTotal,
  responseDictList,
  dictDataToOptions,
  responseDictOptions
};
