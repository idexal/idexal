// 产品文档入口统一收口，避免不同菜单跳到不一致的文档站。
// 官方域名 idexal.com 已上线，但目前只有根路径可用：实测 /docs、/documentation、/guide、/guides、
// /handbook、/blog、/help、/faq 全部 404。因此文档入口暂时仍指向上游文档站——
// 换成 https://idexal.com/docs 会把一个可用链接换成 404。待官方站发布文档路由后只改这一行。
export const IDEXAL_PRODUCT_DOCS_URL = "https://zcode.z.ai/docs";
