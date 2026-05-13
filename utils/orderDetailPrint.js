/**
 * 入库/出库详情页：拉取打印模板、按所选模板生成 PDF 并打开
 */
function buildPrintSheetActions(templates) {
  return templates.map((t, i) => ({
    name: t.template_name || `模板${i + 1}`,
    subname: String(t.output_format || "PDF").toUpperCase(),
    templateIndex: i,
  }));
}

function resolveBizKey(order, tmpl) {
  const useId = String((tmpl.business_param || "").trim()).toLowerCase() === "id";
  const bizKey = useId ? order.id : (order.order_no || order.id);
  return bizKey;
}

async function fetchTemplates(request, pageCode) {
  const tmplRes = await request.get(`/api/print/template/by-page/${pageCode}`);
  const d = tmplRes.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d)) return d;
  return [];
}

function downloadAndOpenPdf(BASE_URL, pdfUrl) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: BASE_URL + pdfUrl,
      success: (downloadRes) => {
        if (downloadRes.statusCode === 200) {
          wx.openDocument({
            filePath: downloadRes.tempFilePath,
            fileType: "pdf",
            showMenu: true,
          });
          resolve();
        } else {
          reject(new Error("download"));
        }
      },
      fail: reject,
    });
  });
}

/** 使用已选模板执行打印（需已 wx.showLoading） */
async function printWithTemplate(request, BASE_URL, order, tmpl) {
  const bizKey = resolveBizKey(order, tmpl);
  if (bizKey == null || bizKey === "") {
    wx.showToast({ title: "缺少单据主键，无法打印", icon: "none" });
    return;
  }
  const printRes = await request.post(`/api/print/${tmpl.id}/${bizKey}`);
  const pdfUrl = printRes.data?.url;
  if (!pdfUrl) {
    wx.showToast({ title: "打印失败", icon: "none" });
    return;
  }
  await downloadAndOpenPdf(BASE_URL, pdfUrl);
}

module.exports = {
  buildPrintSheetActions,
  fetchTemplates,
  printWithTemplate,
};
