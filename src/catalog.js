const RULE_ROOT =
  "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";

export const ROUTING = Object.freeze({
  default: 0,
  direct: 1,
  reject: 2,
});

function source(id, groupId, minEntries) {
  return Object.freeze({
    id,
    groupId,
    minEntries,
    url: `${RULE_ROOT}/${id}/${id}.list`,
  });
}

export const RULE_SOURCES = Object.freeze([
  source("Hijacking", "security", 150),
  source("BlockHttpDNS", "security", 40),
  source("AdvertisingLite", "ads", 250),
  source("Privacy", "privacy", 15),
  source("BiliBili", "bilibili", 80),
  source("DouYin", "douyin", 8),
  source("XiaoHongShu", "xiaohongshu", 3),
  source("Weibo", "weibo", 3),
  source("OpenAI", "ai", 20),
  source("Claude", "ai", 2),
  source("Gemini", "ai", 8),
  source("Copilot", "ai", 30),
  source("GitHub", "github", 20),
  source("YouTube", "youtube", 120),
  source("Netflix", "netflix", 800),
  source("Disney", "disney", 100),
  source("Spotify", "spotify", 20),
  source("GlobalMedia", "global-media", 700),
  source("Telegram", "telegram", 25),
  source("Facebook", "social", 350),
  source("Instagram", "social", 3),
  source("Twitter", "social", 20),
  source("TikTok", "tiktok", 20),
  source("Apple", "apple", 25),
  source("Microsoft", "microsoft", 400),
  source("Game", "game", 400),
  source("Download", "download", 5),
  source("PrivateTracker", "download", 150),
  source("ChinaMax", "china", 8000),
]);

const GROUP_DEFINITIONS = [
  ["local", "local", "🏠 本地与局域网", ROUTING.direct],
  ["custom-block", "custom-block", "⛔ 自定义拦截", ROUTING.reject],
  ["custom-direct", "custom-direct", "🏡 自定义直连", ROUTING.direct],
  ["custom-proxy", "custom-proxy", "🧭 自定义代理", ROUTING.default],
  ["security", "security", "☣️ 安全威胁", ROUTING.reject],
  ["ads", "ads", "🧱 常见广告", ROUTING.reject],
  ["privacy", "privacy", "🕵️ 严格跟踪", ROUTING.direct],
  ["bilibili", "bilibili", "📺 哔哩哔哩", ROUTING.direct],
  ["douyin", "douyin", "🎵 抖音", ROUTING.direct],
  ["xiaohongshu", "xiaohongshu", "📕 小红书", ROUTING.direct],
  ["weibo", "weibo", "🧣 微博", ROUTING.direct],
  ["ai", "ai", "🤖 AI 专用", ROUTING.default],
  ["github", "github", "🐙 GitHub", ROUTING.default],
  ["youtube", "youtube", "📺 YouTube", ROUTING.default],
  ["netflix", "netflix", "🎬 Netflix", ROUTING.default],
  ["disney", "disney", "🏰 Disney+", ROUTING.default],
  ["spotify", "spotify", "🎵 Spotify", ROUTING.default],
  ["global-media", "global-media", "🌍 国际媒体", ROUTING.default],
  ["telegram", "telegram", "✈️ Telegram", ROUTING.default],
  ["social", "social", "💬 海外社交", ROUTING.default],
  ["tiktok", "tiktok", "🎶 TikTok", ROUTING.default],
  ["apple", "apple", "🍎 Apple", ROUTING.direct],
  ["microsoft", "microsoft", "🪟 Microsoft", ROUTING.direct],
  ["game", "game", "🕹️ 游戏平台", ROUTING.default],
  ["download", "download", "⬇️ 下载/P2P", ROUTING.direct],
  ["china", "china", "🇨🇳 中国大陆", ROUTING.direct],
];

export const GROUPS = Object.freeze(
  GROUP_DEFINITIONS.map(([id, slug, name, routing], priority) =>
    Object.freeze({
      id,
      slug,
      name,
      routing,
      priority,
      sourceIds: Object.freeze(
        RULE_SOURCES.filter((entry) => entry.groupId === id).map((entry) => entry.id),
      ),
    })),
);

export const CUSTOM_RULES = Object.freeze({
  block: Object.freeze([]),
  direct: Object.freeze([]),
  proxy: Object.freeze([]),
  ai: Object.freeze([
    "DOMAIN-SUFFIX,perplexity.ai",
    "DOMAIN-SUFFIX,pplx.ai",
    "DOMAIN-SUFFIX,x.ai",
    "DOMAIN-SUFFIX,grok.com",
    "DOMAIN-SUFFIX,poe.com",
    "DOMAIN-SUFFIX,poecdn.net",
  ]),
});

export const LOCAL_RULES = Object.freeze([
  "DOMAIN-SUFFIX,local",
  "DOMAIN-SUFFIX,home.arpa",
  "DOMAIN-SUFFIX,lan",
  "IP-CIDR,10.0.0.0/8",
  "IP-CIDR,100.64.0.0/10",
  "IP-CIDR,127.0.0.0/8",
  "IP-CIDR,169.254.0.0/16",
  "IP-CIDR,172.16.0.0/12",
  "IP-CIDR,192.168.0.0/16",
  "IP-CIDR,224.0.0.0/4",
  "IP-CIDR6,::1/128",
  "IP-CIDR6,fc00::/7",
  "IP-CIDR6,fe80::/10",
  "IP-CIDR6,ff00::/8",
]);

export function validateCatalog() {
  const sourceIds = new Set();
  const groupIds = new Set();
  const slugs = new Set();
  const priorities = new Set();

  for (const group of GROUPS) {
    if (groupIds.has(group.id)) throw new Error(`Duplicate group: ${group.id}`);
    if (slugs.has(group.slug)) throw new Error(`Duplicate group slug: ${group.slug}`);
    if (priorities.has(group.priority)) {
      throw new Error(`Duplicate group priority: ${group.priority}`);
    }
    if (!Object.values(ROUTING).includes(group.routing)) {
      throw new Error(`Invalid routing: ${group.id}`);
    }
    groupIds.add(group.id);
    slugs.add(group.slug);
    priorities.add(group.priority);
  }

  for (const entry of RULE_SOURCES) {
    if (sourceIds.has(entry.id)) throw new Error(`Duplicate source: ${entry.id}`);
    if (!groupIds.has(entry.groupId)) throw new Error(`Unknown group: ${entry.groupId}`);
    if (!Number.isInteger(entry.minEntries) || entry.minEntries < 1) {
      throw new Error(`Invalid minimum: ${entry.id}`);
    }
    sourceIds.add(entry.id);
  }

  if (RULE_SOURCES.length !== 29) throw new Error("Expected 29 rule sources");
}
