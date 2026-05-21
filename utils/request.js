/**
 * API 地址切换（绑定页、所有接口都走 BASE_URL）
 * - false：本地后端
 * - true：生产云服务器
 * 真机预览请把 API_BASE_LAN 改成电脑局域网 IP（与 PC 同一网段）
 */
const USE_PRODUCTION_API = true;
const API_BASE_LOCALHOST = "http://localhost:3000";
const API_BASE_LAN = "http://192.168.0.125:3000";
const API_BASE_PROD = "https://erp.nbsmzwl.cn";

function resolveLocalApiBase() {
  try {
    if (typeof wx !== "undefined" && wx.getSystemInfoSync) {
      const platform = wx.getSystemInfoSync().platform;
      if (platform === "devtools") return API_BASE_LOCALHOST;
    }
  } catch (_) { /* ignore */ }
  return API_BASE_LAN;
}

const BASE_URL = USE_PRODUCTION_API ? API_BASE_PROD : resolveLocalApiBase();

/** 无后端仅调界面时改为 true（不走网络） */
const MOCK = false;

/** 非开发者工具内运行（PC/手机预览、体验版）时，微信不允许访问未配置的 http 本地地址 */
function networkFailHint(timedOut) {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion;
    const platform = wx.getSystemInfoSync().platform;
    if (env !== "develop" || (platform !== "devtools" && !USE_PRODUCTION_API)) {
      return "预览/真机无法访问本地 http，请用模拟器调试，或改 USE_PRODUCTION_API / 配置 HTTPS 合法域名";
    }
  } catch (_) { /* ignore */ }
  if (timedOut) return "连接超时，请确认后端已启动：" + BASE_URL;
  return "网络错误，请确认后端与地址：" + BASE_URL;
}

// ===== 真实数据库结构 Mock 数据 =====

// 仓库（来自 warehouse 表真实数据）
const WAREHOUSES = [
  { warehouse_code: "WH018", warehouse_name: "茂智A库" },
  { warehouse_code: "WH019", warehouse_name: "龙山库" },
  { warehouse_code: "WH017", warehouse_name: "测试12" },
  { warehouse_code: "WH001", warehouse_name: "一号仓库" },
  { warehouse_code: "WH005", warehouse_name: "测试2" },
];

// 供应商（来自 supplier 表真实数据）
const SUPPLIERS = [
  { supplier_code: "SUPP000008", supplier_name: "宁波中新腈纶有限公司" },
  { supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商" },
  { supplier_code: "SUPP000003", supplier_name: "测试" },
];

// 客户（来自 customer 表真实数据）
const CUSTOMERS = [
  { customer_code: "CUST000009", customer_name: "宁波中纤进出口有限公司", contact_person: "戎毅", contact_phone: "13884444477", address: "宁波市" },
  { customer_code: "CUST000010", customer_name: "宁波港梁商贸有限公司", contact_person: "何国梁", contact_phone: "13306667805", address: "宁波市" },
  { customer_code: "CUST000011", customer_name: "宁波昊和纺织品有限公司", contact_person: "俞总", contact_phone: "13505884348", address: "宁波市" },
  { customer_code: "CUST000016", customer_name: "无锡华溢毛纺有限公司", contact_person: "万总", contact_phone: "13861851988", address: "江苏省无锡市梅村镇张公路39号" },
  { customer_code: "CUST000019", customer_name: "江苏成华纺织有限公司", contact_person: "颜荣江", contact_phone: "13301410038", address: "江苏省建湖县经济开发区永兴路38号" },
  { customer_code: "CUST000023", customer_name: "江苏鹿港科技有限公司", contact_person: "陆经理", contact_phone: "13372138762", address: "张家港塘桥镇鹿苑工业园区" },
];

// 产品（来自 stock 表真实数据，编码/品名/型号完全取自数据库）
const PRODUCTS = [
  { product_code: "003", product_name: "短纤", product_model: "H815B1.7RE38" },
  { product_code: "031", product_name: "丝束", product_model: "H815D2.2TW133" },
  { product_code: "032", product_name: "短纤", product_model: "H815D2.2RE51" },
  { product_code: "051", product_name: "丝束", product_model: "S21B3.3TW133" },
  { product_code: "056", product_name: "丝束", product_model: "S21D3.3TW133" },
  { product_code: "518", product_name: "短纤", product_model: "Z141D3.3RE64" },
  { product_code: "681", product_name: "短纤", product_model: "Z103B5.6REVCK" },
  { product_code: "682", product_name: "短纤", product_model: "Z103D3.3REVCK" },
  { product_code: "151", product_name: "短纤", product_model: "S21B5.6REVCL" },
  { product_code: "489", product_name: "短纤", product_model: "Z180D3.3RE64" },
  { product_code: "525", product_name: "短纤", product_model: "Z180D4.4RE64" },
  { product_code: "566", product_name: "短纤", product_model: "M805D2.2RE51" },
  { product_code: "649", product_name: "短纤", product_model: "TT05B6.6RE64" },
  { product_code: "715", product_name: "短纤", product_model: "M805D3.3RE64" },
  { product_code: "907", product_name: "丝束", product_model: "V17B3.3TW160" },
];

// 库存数据（15 条，字段对齐 stock 表）
const STOCK_ROWS = [
  { product_code: "003", product_name: "短纤", product_model: "H815B1.7RE38", stock_qty: 390, stock_weight: 117.5543, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "031", product_name: "丝束", product_model: "H815D2.2TW133", stock_qty: 308, stock_weight: 93.6070, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "032", product_name: "短纤", product_model: "H815D2.2RE51", stock_qty: 112, stock_weight: 33.5630, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "051", product_name: "丝束", product_model: "S21B3.3TW133", stock_qty: 116, stock_weight: 34.2680, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "056", product_name: "丝束", product_model: "S21D3.3TW133", stock_qty: 112, stock_weight: 33.9490, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "518", product_name: "短纤", product_model: "Z141D3.3RE64", stock_qty: 132, stock_weight: 40.1370, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "681", product_name: "短纤", product_model: "Z103B5.6REVCK", stock_qty: 137, stock_weight: 42.0385, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "682", product_name: "短纤", product_model: "Z103D3.3REVCK", stock_qty: 93, stock_weight: 28.5240, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH018", warehouse_name: "茂智A库", alert_status: "正常" },
  { product_code: "003", product_name: "短纤", product_model: "H815B1.7RE38", stock_qty: 151, stock_weight: 45.6205, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "正常" },
  { product_code: "151", product_name: "短纤", product_model: "S21B5.6REVCL", stock_qty: 227, stock_weight: 68.2285, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "高库存" },
  { product_code: "489", product_name: "短纤", product_model: "Z180D3.3RE64", stock_qty: 136, stock_weight: 40.3200, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "正常" },
  { product_code: "518", product_name: "短纤", product_model: "Z141D3.3RE64", stock_qty: 398, stock_weight: 119.8690, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "正常" },
  { product_code: "525", product_name: "短纤", product_model: "Z180D4.4RE64", stock_qty: 208, stock_weight: 62.2235, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "正常" },
  { product_code: "566", product_name: "短纤", product_model: "M805D2.2RE51", stock_qty: 8, stock_weight: 2.4, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "低库存" },
  { product_code: "715", product_name: "短纤", product_model: "M805D3.3RE64", stock_qty: 0, stock_weight: 0.0, min_alert_weight: 20.0, max_alert_weight: 200.0, warehouse_code: "WH019", warehouse_name: "龙山库", alert_status: "零库存" },
];

// 入库明细（字段对齐 inbound_order_detail 表）
const INBOUND_DETAILS = [
  { order_no: "IN20260507001", product_code: "003", product_name: "短纤", product_model: "H815B1.7RE38", inbound_qty: 10, inbound_weight: 3.0553, remark: "" },
  { order_no: "IN20260507001", product_code: "062", product_name: "短纤", product_model: "V17B3.3REVCL", inbound_qty: 20, inbound_weight: 6.2535, remark: "急单" },
  { order_no: "IN20260507001", product_code: "092", product_name: "短纤", product_model: "V37D3.3HHVCL", inbound_qty: 30, inbound_weight: 8.9569, remark: "" },
  { order_no: "IN20260507001", product_code: "907", product_name: "丝束", product_model: "V17B3.3TW160", inbound_qty: 52, inbound_weight: 15.5285, remark: "批次号：B20260507" },
  { order_no: "IN20260502007", product_code: "101", product_name: "100", product_model: "100", inbound_qty: 1, inbound_weight: 0.3250 },
  { order_no: "IN20260502007", product_code: "009", product_name: "009", product_model: "009", inbound_qty: 2, inbound_weight: 0.6550 },
  { order_no: "IN20260502007", product_code: "006", product_name: "006", product_model: "006", inbound_qty: 3, inbound_weight: 0.9590 },
  { order_no: "IN20260503001", product_code: "006", product_name: "006", product_model: "006", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "IN20260503001", product_code: "006", product_name: "006", product_model: "006", inbound_qty: 2, inbound_weight: 2.0 },
  { order_no: "IN20260504001", product_code: "009", product_name: "009", product_model: "009", inbound_qty: 112, inbound_weight: 33.557 },
  { order_no: "DRAFT_27", product_code: "101", product_name: "100", product_model: "100", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "DRAFT_28", product_code: "009", product_name: "009", product_model: "009", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "DRAFT_28", product_code: "009", product_name: "009", product_model: "009", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "IN20260502008", product_code: "009", product_name: "009", product_model: "009", inbound_qty: 112, inbound_weight: 35.336 },
  { order_no: "IN20260502008", product_code: "101", product_name: "100", product_model: "100", inbound_qty: 112, inbound_weight: 35.253 },
  { order_no: "IN20260502008", product_code: "006", product_name: "006", product_model: "006", inbound_qty: 112, inbound_weight: 35.153 },
  { order_no: "IN20260501001", product_code: "101", product_name: "100", product_model: "100", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "DRAFT_31", product_code: "101", product_name: "100", product_model: "100", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "IN20260430014", product_code: "P001", product_name: "示例螺纹钢", product_model: "HRB400-16mm", inbound_qty: 1, inbound_weight: 1.0 },
  { order_no: "IN20260430014", product_code: "P001", product_name: "示例螺纹钢", product_model: "HRB400-16mm", inbound_qty: 2, inbound_weight: 2.0 },
];

// 入库单（10 条，状态均匀分布，字段对齐 inbound_order 表 + JOIN 字段）
const INBOUND_ORDERS = [
  { id: 1, order_no: "IN20260507001", inbound_date: "2026-05-07", warehouse_code: "WH018", warehouse_name: "茂智A库", supplier_code: "SUPP000008", supplier_name: "宁波中新腈纶有限公司", vehicle_no: "浙B5K618", container_no: "", order_status: "audited", remark: "" },
  { id: 2, order_no: "IN20260502007", inbound_date: "2026-05-02", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "浙B123456", container_no: "AAAA1234567", order_status: "submit", remark: "测试单据" },
  { id: 3, order_no: "IN20260503001", inbound_date: "2026-05-03", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "浙B123456", container_no: "", order_status: "completed", remark: "" },
  { id: 4, order_no: "IN20260504001", inbound_date: "2026-05-04", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "测试1", container_no: "", order_status: "submit", remark: "" },
  { id: 5, order_no: "DRAFT_27", inbound_date: "2026-05-03", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "浙B123456", container_no: "", order_status: "draft", remark: "" },
  { id: 6, order_no: "DRAFT_28", inbound_date: "2026-05-03", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "测试1", container_no: "", order_status: "draft", remark: "" },
  { id: 7, order_no: "IN20260502008", inbound_date: "2026-05-02", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "测试", container_no: "", order_status: "submit", remark: "" },
  { id: 8, order_no: "IN20260501001", inbound_date: "2026-05-01", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "浙B123456", container_no: "", order_status: "completed", remark: "" },
  { id: 9, order_no: "DRAFT_31", inbound_date: "2026-05-05", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000001", supplier_name: "示例钢铁供应商", vehicle_no: "测试1", container_no: "", order_status: "draft", remark: "" },
  { id: 10, order_no: "IN20260430014", inbound_date: "2026-04-30", warehouse_code: "WH017", warehouse_name: "测试12", supplier_code: "SUPP000003", supplier_name: "测试", vehicle_no: "浙B123456", container_no: "测试测试", order_status: "cancelled", remark: "测试" },
].map(o => {
  const details = INBOUND_DETAILS.filter(d => d.order_no === o.order_no);
  o.total_qty = details.reduce((s, d) => s + d.inbound_qty, 0);
  o.total_weight = +details.reduce((s, d) => s + d.inbound_weight, 0).toFixed(4);
  return o;
});

// 出库明细（字段对齐 outbound_order_detail 表）
const OUTBOUND_DETAILS = [
  { order_no: "OUT20260506001", product_code: "560", product_name: "短纤", product_model: "Z169D5.6RE76", outbound_qty: 11, outbound_weight: 3.2975, contract_no: "", remark: "" },
  { order_no: "OUT20260506002", product_code: "074", product_name: "短纤", product_model: "V17D3.3HB64", outbound_qty: 17, outbound_weight: 5.0335, contract_no: "大客户协议", remark: "外观检验合格" },
  { order_no: "OUT20260506003", product_code: "092", product_name: "短纤", product_model: "V37D3.3HHVCL", outbound_qty: 20, outbound_weight: 6.0880, contract_no: "NT20260509", remark: "" },
  { order_no: "OUT20260501001", product_code: "P001", product_name: "示例螺纹钢", product_model: "HRB400-16mm", outbound_qty: 1, outbound_weight: 1.0, contract_no: "" },
  { order_no: "OUT20260501002", product_code: "009", product_name: "009", product_model: "009", outbound_qty: 1, outbound_weight: 1.0, contract_no: "" },
  { order_no: "OUT20260501003", product_code: "003", product_name: "短纤", product_model: "测试", outbound_qty: 2, outbound_weight: 2.0, contract_no: "" },
  { order_no: "DRAFT_OUT_2", product_code: "101", product_name: "100", product_model: "100", outbound_qty: 1, outbound_weight: 0.0, contract_no: "" },
  { order_no: "DRAFT_OUT_4", product_code: "003", product_name: "短纤", product_model: "H815B1.7RE38", outbound_qty: 50, outbound_weight: 15.25, contract_no: "HT-2026-088" },
  { order_no: "DRAFT_OUT_4", product_code: "518", product_name: "短纤", product_model: "Z141D3.3RE64", outbound_qty: 80, outbound_weight: 24.48, contract_no: "HT-2026-088" },
  { order_no: "OUT20260508001", product_code: "682", product_name: "短纤", product_model: "Z103D3.3REVCK", outbound_qty: 30, outbound_weight: 9.15, contract_no: "" },
  { order_no: "OUT20260508001", product_code: "681", product_name: "短纤", product_model: "Z103B5.6REVCK", outbound_qty: 45, outbound_weight: 13.72, contract_no: "" },
  { order_no: "OUT20260428001", product_code: "715", product_name: "短纤", product_model: "M805D3.3RE64", outbound_qty: 60, outbound_weight: 18.0, contract_no: "CANCEL-001" },
];

// 出库单（10 条，字段对齐 outbound_order 表）
const OUTBOUND_ORDERS = [
  { id: 11, order_no: "OUT20260506001", outbound_date: "2026-05-04", warehouse_code: "WH019", warehouse_name: "龙山库", customer_code: "CUST000010", customer_name: "宁波港梁商贸有限公司", customer_address: "宁波市", contact_person: "何国梁", contact_phone: "13306667805", vehicle_no: "黑M4B288", container_no: "", order_status: "audited", remark: "" },
  { id: 12, order_no: "OUT20260506002", outbound_date: "2026-05-04", warehouse_code: "WH019", warehouse_name: "龙山库", customer_code: "CUST000011", customer_name: "宁波昊和纺织品有限公司", customer_address: "宁波市", contact_person: "俞总", contact_phone: "13505884348", vehicle_no: "浙B5K618", container_no: "", order_status: "audited", remark: "" },
  { id: 13, order_no: "OUT20260506003", outbound_date: "2026-05-06", warehouse_code: "WH019", warehouse_name: "龙山库", customer_code: "CUST000009", customer_name: "宁波中纤进出口有限公司", customer_address: "宁波市", contact_person: "戎毅", contact_phone: "13884444477", vehicle_no: "浙B81V8P", container_no: "", order_status: "completed", remark: "" },
  { id: 14, order_no: "OUT20260501001", outbound_date: "2026-04-30", warehouse_code: "WH017", warehouse_name: "测试12", customer_code: "CUST000016", customer_name: "无锡华溢毛纺有限公司", customer_address: "江苏省无锡市梅村镇张公路39号", contact_person: "万总", contact_phone: "13861851988", vehicle_no: "测试", container_no: "", order_status: "submit", remark: "" },
  { id: 15, order_no: "OUT20260501002", outbound_date: "2026-05-01", warehouse_code: "WH017", warehouse_name: "测试12", customer_code: "CUST000019", customer_name: "江苏成华纺织有限公司", customer_address: "江苏省建湖县经济开发区永兴路38号", contact_person: "颜荣江", contact_phone: "13301410038", vehicle_no: "浙B123456", container_no: "", order_status: "submit", remark: "" },
  { id: 16, order_no: "OUT20260501003", outbound_date: "2026-05-01", warehouse_code: "WH017", warehouse_name: "测试12", customer_code: "CUST000023", customer_name: "江苏鹿港科技有限公司", customer_address: "张家港塘桥镇鹿苑工业园区", contact_person: "陆经理", contact_phone: "13372138762", vehicle_no: "测试1", container_no: "", order_status: "completed", remark: "" },
  { id: 17, order_no: "DRAFT_OUT_2", outbound_date: "2026-05-01", warehouse_code: "WH017", warehouse_name: "测试12", customer_code: "CUST000009", customer_name: "宁波中纤进出口有限公司", customer_address: "宁波市", contact_person: "戎毅", contact_phone: "13884444477", vehicle_no: "浙B123456", container_no: "", order_status: "draft", remark: "" },
  { id: 18, order_no: "DRAFT_OUT_4", outbound_date: "2026-05-09", warehouse_code: "WH018", warehouse_name: "茂智A库", customer_code: "CUST000010", customer_name: "宁波港梁商贸有限公司", customer_address: "宁波市", contact_person: "何国梁", contact_phone: "13306667805", vehicle_no: "浙B88123", container_no: "CONT001", order_status: "draft", remark: "" },
  { id: 19, order_no: "OUT20260508001", outbound_date: "2026-05-08", warehouse_code: "WH018", warehouse_name: "茂智A库", customer_code: "CUST000016", customer_name: "无锡华溢毛纺有限公司", customer_address: "江苏省无锡市梅村镇张公路39号", contact_person: "万总", contact_phone: "13861851988", vehicle_no: "苏B56789", container_no: "", order_status: "submit", remark: "加急发货" },
  { id: 20, order_no: "OUT20260428001", outbound_date: "2026-04-28", warehouse_code: "WH019", warehouse_name: "龙山库", customer_code: "CUST000023", customer_name: "江苏鹿港科技有限公司", customer_address: "张家港塘桥镇鹿苑工业园区", contact_person: "陆经理", contact_phone: "13372138762", vehicle_no: "苏E11111", container_no: "CONT002", order_status: "cancelled", remark: "客户取消" },
].map(o => {
  const details = OUTBOUND_DETAILS.filter(d => d.order_no === o.order_no);
  o.total_qty = details.reduce((s, d) => s + d.outbound_qty, 0);
  o.total_weight = +details.reduce((s, d) => s + d.outbound_weight, 0).toFixed(4);
  return o;
});

// 生成库存流水（20 条，字段对齐 stock_journal 表，business_type: inbound/outbound/check）
function generateJournal(productCode) {
  const now = new Date();
  const records = [];
  const types = ["inbound", "outbound", "inbound", "check", "inbound", "outbound", "inbound", "inbound", "outbound", "inbound",
                 "inbound", "outbound", "check", "inbound", "outbound", "inbound", "inbound", "outbound", "inbound"];
  const PRODUCT = PRODUCTS.find(p => p.product_code === productCode) || PRODUCTS[0];
  let qty = 50;
  let wt = +(qty * 0.305).toFixed(4);
  for (let i = 20; i >= 1; i--) {
    const d = new Date(now.getTime() - (i - 1) * 3600000 * 3);
    const bt = types[i - 1];
    const changeQty = bt === "outbound" ? -(Math.floor(Math.random() * 20) + 1) : (bt === "check" ? 0 : Math.floor(Math.random() * 30) + 1);
    const changeWt = bt === "check" ? 0 : +(changeQty * 0.305).toFixed(4);
    const beforeQty = qty;
    const beforeWt = wt;
    qty = bt === "check" ? qty : qty + changeQty;
    wt = bt === "check" ? wt : +(wt + changeWt).toFixed(4);
    const w = WAREHOUSES[i % WAREHOUSES.length];
    const isIn = bt === "inbound";
    const sup = SUPPLIERS[i % SUPPLIERS.length];
    const cus = CUSTOMERS[i % CUSTOMERS.length];
    const vehicles = ["浙B5K618", "浙B123456", "浙B81V8P", "苏B56789", "黑M4B288", "苏E11111", "浙B88123"];
    const containers = ["", "CONT001", "", "CONT002", "", "", ""];
    records.push({
      id: 2000 + i,
      product_code: PRODUCT.product_code,
      product_name: PRODUCT.product_name,
      product_model: PRODUCT.product_model,
      warehouse_code: w.warehouse_code,
      warehouse_name: w.warehouse_name,
      business_type: bt,
      order_no: bt === "inbound" ? ("IN202605" + String(i).padStart(2, "0") + String(i).padStart(3, "0")).slice(0, 14) :
                bt === "outbound" ? ("OUT202605" + String(i).padStart(2, "0") + String(i).padStart(3, "0")).slice(0, 14) :
                ("CK202605" + String(i).padStart(2, "0") + String(i).padStart(3, "0")).slice(0, 14),
      supplier_name: isIn ? sup.supplier_name : null,
      customer_name: !isIn && bt !== "check" ? cus.customer_name : null,
      vehicle_no: bt === "check" ? "" : vehicles[i % vehicles.length],
      container_no: bt === "check" ? "" : containers[i % containers.length],
      change_qty: changeQty,
      change_weight: changeWt,
      before_qty: beforeQty,
      before_weight: beforeWt,
      after_qty: qty,
      after_weight: wt,
      create_time: d.toISOString().replace("T", " ").slice(0, 19)
    });
  }
  return records.reverse();
}

function sortByDateDesc(rows, dateField) {
  return rows.slice().sort((a, b) => {
    const cmp = String(b[dateField] || "").localeCompare(String(a[dateField] || ""));
    if (cmp !== 0) return cmp;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function paginate(allRows, params) {
  const page = parseInt((params && params.page) || 1);
  const pageSize = parseInt((params && params.pageSize) || 15);
  const total = allRows.length;
  const start = (page - 1) * pageSize;
  return { list: allRows.slice(start, start + pageSize), total, page, pageSize };
}

function mockResponse(path, params) {
  const now = new Date().toISOString().split("T")[0];

  // === 微信登录 ===
  if (path === "/api/wx-login") {
    return {
      code: 200, message: "success",
      data: {
        needBind: false,
        token: "mock_token_dev",
        userInfo: { id: 1, username: "admin", nickname: "管理员", roleCode: "ADMIN", roleName: "管理员", avatar: "" }
      }
    };
  }
  if (path === "/api/bind-openid") {
    return {
      code: 200, message: "success",
      data: {
        token: "mock_token_" + Date.now(),
        userInfo: { id: 1, username: "admin", nickname: "管理员", roleCode: "ADMIN", avatar: "", permissions: [] }
      }
    };
  }

  // === 账号密码登录（退出后重登，不走微信静默登录） ===
  if (path === "/api/login") {
    const { username, password } = params || {};
    if (!username || !password) {
      return { code: 400, message: "用户名和密码不能为空" };
    }
    return {
      code: 200, message: "success",
      data: {
        token: "mock_token_" + Date.now(),
        userInfo: { id: 1, username: username, nickname: username, roleCode: "ADMIN", roleName: "管理员", avatar: "" }
      }
    };
  }

  // === 用户 ===
  if (path === "/api/user/profile") {
    return { code: 200, data: { id: 1, username: "admin", nickname: "管理员", roleCode: "ADMIN", roleName: "管理员", avatar: "" } };
  }
  if (path === "/api/user/change-password") {
    return { code: 200, message: "密码修改成功" };
  }

  // === 仓库列表 ===
  if (path === "/api/warehouse/list") {
    return { code: 200, data: { list: WAREHOUSES, total: WAREHOUSES.length } };
  }

  // === 供应商列表 ===
  if (path === "/api/supplier/list") {
    return { code: 200, data: { list: SUPPLIERS, total: SUPPLIERS.length } };
  }

  // === 客户列表 ===
  if (path === "/api/customer/list") {
    return { code: 200, data: { list: CUSTOMERS, total: CUSTOMERS.length } };
  }

  // === 库存列表 ===
  if (path === "/api/stock/list") {
    const keyword = (params && params.keyword) ? params.keyword.toLowerCase() : "";
    let rows = STOCK_ROWS.slice();
    if (keyword) {
      rows = rows.filter(r =>
        r.product_code.toLowerCase().includes(keyword) ||
        r.product_name.toLowerCase().includes(keyword) ||
        r.product_model.toLowerCase().includes(keyword)
      );
    }
    const alertStatus = (params && params.alert_status) || "";
    if (alertStatus) rows = rows.filter(r => r.alert_status === alertStatus);
    const warehouseCode = (params && params.warehouse_code) || "";
    if (warehouseCode) rows = rows.filter(r => r.warehouse_code === warehouseCode);
    const p = paginate(rows, params);
    return { code: 200, data: { list: p.list, total: p.total, page: p.page, pageSize: p.pageSize } };
  }

  // === 库存流水（字段对齐 stock_journal 表） ===
  if (path === "/api/stock/journal/list") {
    const productCode = (params && params.product_code) || "003";
    const records = generateJournal(productCode);
    return { code: 200, data: { list: records, total: records.length } };
  }

  // === 仓库汇总 ===
  if (path === "/api/stock/warehouse-summary") {
    const summary = WAREHOUSES.map(w => {
      const stocks = STOCK_ROWS.filter(s => s.warehouse_code === w.warehouse_code);
      return {
        warehouse_code: w.warehouse_code,
        warehouse_name: w.warehouse_name,
        total_qty: stocks.reduce((s, r) => s + r.stock_qty, 0),
        total_weight: +stocks.reduce((s, r) => s + r.stock_weight, 0).toFixed(2)
      };
    }).filter(s => s.total_qty > 0);
    return { code: 200, data: { list: summary, total: summary.length } };
  }

  // === 入库单列表 / 搜索 ===
  if (path === "/api/inbound/order/list" || path === "/api/inbound/order/search") {
    const keyword = (params && params.keyword) ? params.keyword.toLowerCase() : "";
    let rows = INBOUND_ORDERS.slice();
    if (keyword) {
      // 订单级匹配
      const orderMatched = rows.filter(r =>
        r.order_no.toLowerCase().includes(keyword) ||
        (r.vehicle_no || "").toLowerCase().includes(keyword) ||
        (r.supplier_name || "").toLowerCase().includes(keyword)
      );
      // 明细级匹配：搜产品编码/名称/型号
      const detailMatchedNos = [...new Set(
        INBOUND_DETAILS.filter(d =>
          d.product_code.toLowerCase().includes(keyword) ||
          d.product_name.toLowerCase().includes(keyword) ||
          d.product_model.toLowerCase().includes(keyword)
        ).map(d => d.order_no)
      )];
      const existNos = new Set(orderMatched.map(r => r.order_no));
      const extraOrders = INBOUND_ORDERS.filter(o => detailMatchedNos.includes(o.order_no) && !existNos.has(o.order_no));
      rows = orderMatched.concat(extraOrders);
      // 附加匹配明细
      rows = rows.map(o => {
        const md = INBOUND_DETAILS.filter(d =>
          d.order_no === o.order_no && (
            d.product_code.toLowerCase().includes(keyword) ||
            d.product_name.toLowerCase().includes(keyword) ||
            d.product_model.toLowerCase().includes(keyword)
          )
        );
        return md.length > 0 ? { ...o, match_details: md } : o;
      });
    }
    const orderStatus = (params && params.order_status) || "";
    if (orderStatus) rows = rows.filter(r => r.order_status === orderStatus);
    const warehouseCode = (params && params.warehouse_code) || "";
    if (warehouseCode) rows = rows.filter(r => r.warehouse_code === warehouseCode);
    const supplierCode = (params && params.supplier_code) || "";
    if (supplierCode) rows = rows.filter(r => r.supplier_code === supplierCode);
    const dateStart = (params && params.date_start) || "";
    if (dateStart) rows = rows.filter(r => r.inbound_date >= dateStart);
    const dateEnd = (params && params.date_end) || "";
    if (dateEnd) rows = rows.filter(r => r.inbound_date <= dateEnd);
    rows = sortByDateDesc(rows, "inbound_date");
    const p = paginate(rows, params);
    return { code: 200, data: { list: p.list, total: p.total, page: p.page, pageSize: p.pageSize } };
  }

  // === 入库单详情 ===
  if (path.startsWith("/api/inbound/order/")) {
    const id = parseInt(path.split("/").pop());
    const order = INBOUND_ORDERS.find(o => o.id === id) || INBOUND_ORDERS[0];
    const details = INBOUND_DETAILS.filter(d => d.order_no === order.order_no);
    return { code: 200, data: { order, details } };
  }

  // === 出库单列表 / 搜索 ===
  if (path === "/api/outbound/order/list" || path === "/api/outbound/order/search") {
    const keyword = (params && params.keyword) ? params.keyword.toLowerCase() : "";
    let rows = OUTBOUND_ORDERS.slice();
    if (keyword) {
      // 订单级匹配
      const orderMatched = rows.filter(r =>
        r.order_no.toLowerCase().includes(keyword) ||
        (r.vehicle_no || "").toLowerCase().includes(keyword) ||
        (r.customer_name || "").toLowerCase().includes(keyword)
      );
      // 明细级匹配：搜产品编码/名称/型号
      const detailMatchedNos = [...new Set(
        OUTBOUND_DETAILS.filter(d =>
          d.product_code.toLowerCase().includes(keyword) ||
          d.product_name.toLowerCase().includes(keyword) ||
          d.product_model.toLowerCase().includes(keyword)
        ).map(d => d.order_no)
      )];
      const existNos = new Set(orderMatched.map(r => r.order_no));
      const extraOrders = OUTBOUND_ORDERS.filter(o => detailMatchedNos.includes(o.order_no) && !existNos.has(o.order_no));
      rows = orderMatched.concat(extraOrders);
      // 附加匹配明细
      rows = rows.map(o => {
        const md = OUTBOUND_DETAILS.filter(d =>
          d.order_no === o.order_no && (
            d.product_code.toLowerCase().includes(keyword) ||
            d.product_name.toLowerCase().includes(keyword) ||
            d.product_model.toLowerCase().includes(keyword)
          )
        );
        return md.length > 0 ? { ...o, match_details: md } : o;
      });
    }
    const orderStatus = (params && params.order_status) || "";
    if (orderStatus) rows = rows.filter(r => r.order_status === orderStatus);
    const warehouseCode = (params && params.warehouse_code) || "";
    if (warehouseCode) rows = rows.filter(r => r.warehouse_code === warehouseCode);
    const customerCode = (params && params.customer_code) || "";
    if (customerCode) rows = rows.filter(r => r.customer_code === customerCode);
    const dateStart = (params && params.date_start) || "";
    if (dateStart) rows = rows.filter(r => r.outbound_date >= dateStart);
    const dateEnd = (params && params.date_end) || "";
    if (dateEnd) rows = rows.filter(r => r.outbound_date <= dateEnd);
    rows = sortByDateDesc(rows, "outbound_date");
    const p = paginate(rows, params);
    return { code: 200, data: { list: p.list, total: p.total, page: p.page, pageSize: p.pageSize } };
  }

  // === 出库单详情 ===
  if (path.startsWith("/api/outbound/order/")) {
    const id = parseInt(path.split("/").pop());
    const order = OUTBOUND_ORDERS.find(o => o.id === id) || OUTBOUND_ORDERS[0];
    const details = OUTBOUND_DETAILS.filter(d => d.order_no === order.order_no);
    return { code: 200, data: { order, details } };
  }

  // === Dashboard ===
  if (path === "/api/dashboard/analysis") {
    const stocks = STOCK_ROWS;
    const inboundToday = INBOUND_ORDERS.filter(o => o.inbound_date === now && o.order_status !== "cancelled");
    const outboundToday = OUTBOUND_ORDERS.filter(o => o.outbound_date === now && o.order_status !== "cancelled");
    return {
      code: 200, data: {
        today_inbound: +(inboundToday.reduce((s, o) => s + o.total_weight, 0)).toFixed(2) || 12.5,
        today_outbound: +(outboundToday.reduce((s, o) => s + o.total_weight, 0)).toFixed(2) || 8.3,
        total_sku_count: [...new Set(stocks.map(s => s.product_code))].length,
        total_tonnage: +stocks.reduce((s, r) => s + r.stock_weight, 0).toFixed(2),
        pending_audit: INBOUND_ORDERS.filter(o => o.order_status === "submit").length + OUTBOUND_ORDERS.filter(o => o.order_status === "submit").length,
        low_stock_alert: stocks.filter(s => s.alert_status === "低库存" || s.alert_status === "零库存").length,
        panelGroup: {
          users: +(inboundToday.reduce((s, o) => s + o.total_weight, 0)).toFixed(2) || 12.5,
          messages: +(outboundToday.reduce((s, o) => s + o.total_weight, 0)).toFixed(2) || 8.3,
          moneys: INBOUND_ORDERS.filter(o => o.order_status === "submit").length + OUTBOUND_ORDERS.filter(o => o.order_status === "submit").length,
          shoppings: stocks.filter(s => s.alert_status === "低库存" || s.alert_status === "零库存").length
        },
        trendData: [
          { name: "05/03", inboundCount: 45, outboundCount: 30 },
          { name: "05/04", inboundCount: 52, outboundCount: 38 },
          { name: "05/05", inboundCount: 38, outboundCount: 42 },
          { name: "05/06", inboundCount: 60, outboundCount: 35 },
          { name: "05/07", inboundCount: 55, outboundCount: 40 },
          { name: "05/08", inboundCount: 48, outboundCount: 45 },
          { name: "05/09", inboundCount: 42, outboundCount: 38 }
        ]
      }
    };
  }

  // === 打印模板 ===
  if (path.startsWith("/api/print/template/by-page/")) {
    return {
      code: 200,
      data: {
        list: [{ id: 1, template_name: "标准打印模板", output_format: "PDF" }],
        total: 1
      }
    };
  }

  // === 打印 ===
  if (path.startsWith("/api/print/")) {
    return { code: 200, data: { url: "/temp/print/mock_print.pdf", fileName: "mock_print.pdf" } };
  }

  return { code: 404, message: "Mock 未实现: " + path };
}

/** 登录相关接口由页面或 app 自行提示，避免与全局 toast / reLaunch 叠加 */
const NO_GLOBAL_ERROR_TOAST = new Set(["/api/bind-openid", "/api/wx-login", "/api/user/profile"]);

const REQUEST_TIMEOUT_MS = 20000;

function request(method, url, data) {
  if (MOCK) {
    return Promise.resolve(mockResponse(url, data));
  }
  const skipGlobalToast = NO_GLOBAL_ERROR_TOAST.has(url);
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      timeout: REQUEST_TIMEOUT_MS,
      header: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (wx.getStorageSync("token") || "")
      },
      success(res) {
        const payload = res.data || {};
        if (res.statusCode === 401) {
          if (url === "/api/bind-openid") {
            reject(Object.assign({ code: 401, message: payload.message || "用户名或密码错误" }, payload));
            return;
          }
          const hadToken = !!wx.getStorageSync("token");
          wx.removeStorageSync("token");
          wx.removeStorageSync("userInfo");
          if (hadToken && !skipGlobalToast) {
            wx.showToast({ title: "登录已过期，请重新登录", icon: "none" });
          }
          if (url !== "/api/wx-login" && url !== "/api/user/profile") {
            const { goLoginPage } = require("./auth");
            goLoginPage();
          }
          reject(Object.assign({ code: 401 }, payload.message ? payload : { message: "未登录或 token 无效" }));
          return;
        }
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          if (!skipGlobalToast) {
            wx.showToast({ title: payload.message || "请求失败", icon: "none" });
          }
          reject(Object.assign({ message: payload.message || "请求失败" }, payload));
        }
      },
      fail(err) {
        const errMsg = (err && err.errMsg) || "";
        const timedOut = /timeout/i.test(errMsg);
        if (!skipGlobalToast) {
          wx.showToast({
            title: networkFailHint(timedOut),
            icon: "none",
            duration: 3500,
          });
        }
        reject(Object.assign({}, err, {
          message: timedOut ? "连接超时" : "网络错误",
          timedOut,
        }));
      }
    });
  });
}

module.exports = {
  BASE_URL,
  MOCK,
  get: (url, params) => request("GET", url, params),
  post: (url, data) => request("POST", url, data),
  put: (url, data) => request("PUT", url, data),
  delete: (url, data) => request("DELETE", url, data),
};
