import { cumulativeDurationSeconds } from "./domain";
import { getIChingLine } from "./iching";
import { elapsedTimerSeconds } from "./timer";
import type { Habit, RunningTimer, TrackerEvent } from "./types";

export interface RewardSymbol {
  id: string;
  name: string;
  symbol: string;
  meaning: string;
  sound?: string;
  soundLabel?: string;
  /** Four rows from top to bottom; 1 is one point and 2 is two points. */
  pattern?: string;
}

export interface MilestoneRune extends RewardSymbol {
  sound: string;
}

export interface SymbolSystem {
  id: string;
  name: string;
  description: string;
  symbols: readonly RewardSymbol[];
}

export interface MilestoneHexagram {
  number: number;
  name: string;
  symbol: string;
}

export interface MilestoneStage {
  id: string;
  cycle: number;
  thresholdSeconds: number;
  systemId: string;
  systemName: string;
  reward: RewardSymbol;
}

export interface MilestoneProgress {
  totalSeconds: number;
  completedStages: MilestoneStage[];
  currentStage?: MilestoneStage;
  nextStage?: MilestoneStage;
  completedCycles: number;
  currentCycle: number;
  currentHexagram: MilestoneHexagram;
  nextHexagram: MilestoneHexagram;
  completedHexagramsInCycle: number;
  hexagramProgress: number;
  remainingHexagramSeconds: number;
  cycleProgress: number;
  remainingRewardSeconds: number;
  /** Compatibility alias for the current reward-cycle progress. */
  progress: number;
  /** Compatibility alias for remainingRewardSeconds. */
  remainingSeconds: number;
}

export const HEXAGRAM_STEP_HOURS = 1;
export const HEXAGRAM_STEP_SECONDS = HEXAGRAM_STEP_HOURS * 60 * 60;
export const HEXAGRAMS_PER_CYCLE = 64;
export const RUNE_CYCLE_HOURS = HEXAGRAM_STEP_HOURS * HEXAGRAMS_PER_CYCLE;

const MILESTONE_CYCLE_SECONDS = HEXAGRAM_STEP_SECONDS * HEXAGRAMS_PER_CYCLE;

export const MILESTONE_HEXAGRAMS: readonly MilestoneHexagram[] = Object.freeze(
  Array.from({ length: HEXAGRAMS_PER_CYCLE }, (_, index) => {
    const line = getIChingLine(index + 1, 1);
    return Object.freeze({
      number: line.hexagramNumber,
      name: line.hexagramName,
      symbol: line.hexagramSymbol,
    });
  }),
);

/**
 * The common Elder Futhark row. Sounds are letter sound values rather than
 * modern readings of reconstructed rune names. Meanings describe the name
 * words, not divination claims; uncertain reconstructions are labelled.
 */
export const ELDER_FUTHARK_RUNES = [
  { id: "fehu", name: "Fehu", symbol: "ᚠ", sound: "/f/", meaning: "家畜、财富" },
  { id: "uruz", name: "Uruz", symbol: "ᚢ", sound: "/uː/", meaning: "原牛（已灭绝的野牛）" },
  { id: "thurisaz", name: "Thurisaz", symbol: "ᚦ", sound: "/θ/ 或 /ð/", meaning: "巨人、怪物" },
  { id: "ansuz", name: "Ansuz", symbol: "ᚨ", sound: "/ɑ/", meaning: "神祇" },
  { id: "raidho", name: "Raidho", symbol: "ᚱ", sound: "/r/", meaning: "骑行、道路与旅程" },
  { id: "kenaz", name: "Kenaz", symbol: "ᚲ", sound: "/k/", meaning: "火炬；名称词源有争议" },
  { id: "gebo", name: "Gebo", symbol: "ᚷ", sound: "/ɡ/", meaning: "礼物" },
  { id: "wunjo", name: "Wunjo", symbol: "ᚹ", sound: "/w/", meaning: "喜悦" },
  { id: "hagalaz", name: "Hagalaz", symbol: "ᚺ", sound: "/h/", meaning: "冰雹" },
  { id: "nauthiz", name: "Nauthiz", symbol: "ᚾ", sound: "/n/", meaning: "需求、约束与困境" },
  { id: "isa", name: "Isa", symbol: "ᛁ", sound: "/iː/", meaning: "冰" },
  { id: "jera", name: "Jera", symbol: "ᛃ", sound: "/j/", meaning: "年成、收获" },
  { id: "eihwaz", name: "Eihwaz", symbol: "ᛇ", sound: "/ɪ/ 或 /æ/（有争议）", meaning: "紫杉" },
  { id: "perthro", name: "Perthro", symbol: "ᛈ", sound: "/p/", meaning: "词义未定；常见推测为骰杯或抽签" },
  { id: "algiz", name: "Algiz", symbol: "ᛉ", sound: "/z/，后期 /ʀ/", meaning: "词义有争议；常见释为麋鹿或莎草" },
  { id: "sowilo", name: "Sowilo", symbol: "ᛊ", sound: "/s/", meaning: "太阳" },
  { id: "tiwaz", name: "Tiwaz", symbol: "ᛏ", sound: "/t/", meaning: "提瓦兹／提尔神" },
  { id: "berkano", name: "Berkano", symbol: "ᛒ", sound: "/b/", meaning: "白桦" },
  { id: "ehwaz", name: "Ehwaz", symbol: "ᛖ", sound: "/e/", meaning: "马" },
  { id: "mannaz", name: "Mannaz", symbol: "ᛗ", sound: "/m/", meaning: "人、人类" },
  { id: "laguz", name: "Laguz", symbol: "ᛚ", sound: "/l/", meaning: "水、湖" },
  { id: "ingwaz", name: "Ingwaz", symbol: "ᛜ", sound: "/ŋ/", meaning: "英格神" },
  { id: "dagaz", name: "Dagaz", symbol: "ᛞ", sound: "/d/", meaning: "白昼" },
  { id: "othala", name: "Othala", symbol: "ᛟ", sound: "/o/", meaning: "祖产、继承" },
] as const satisfies readonly MilestoneRune[];

const CLASSICAL_PLANETS = [
  { id: "moon", name: "月亮", symbol: "☽", sound: "Moon /muːn/", meaning: "节律、感受、养护" },
  { id: "mercury", name: "水星", symbol: "☿", sound: "Mercury /ˈmɜːrkjəri/", meaning: "学习、语言、技艺" },
  { id: "venus", name: "金星", symbol: "♀", sound: "Venus /ˈviːnəs/", meaning: "和谐、关系、审美" },
  { id: "sun", name: "太阳", symbol: "☉", sound: "Sun /sʌn/", meaning: "核心、生命力、显现" },
  { id: "mars", name: "火星", symbol: "♂", sound: "Mars /mɑːrz/", meaning: "行动、勇气、决断" },
  { id: "jupiter", name: "木星", symbol: "♃", sound: "Jupiter /ˈdʒuːpɪtər/", meaning: "扩展、信念、统摄" },
  { id: "saturn", name: "土星", symbol: "♄", sound: "Saturn /ˈsætərn/", meaning: "时间、边界、长期责任" },
] as const satisfies readonly RewardSymbol[];

const ZODIAC_SIGNS = [
  { id: "aries", name: "白羊宫", symbol: "\u2648\uFE0E", sound: "Aries /ˈeəriːz/", meaning: "开端、主动" },
  { id: "taurus", name: "金牛宫", symbol: "\u2649\uFE0E", sound: "Taurus /ˈtɔːrəs/", meaning: "稳固、积累" },
  { id: "gemini", name: "双子宫", symbol: "\u264A\uFE0E", sound: "Gemini /ˈdʒemɪnaɪ/", meaning: "交流、联结" },
  { id: "cancer", name: "巨蟹宫", symbol: "\u264B\uFE0E", sound: "Cancer /ˈkænsər/", meaning: "守护、滋养" },
  { id: "leo", name: "狮子宫", symbol: "\u264C\uFE0E", sound: "Leo /ˈliːoʊ/", meaning: "勇气、表达" },
  { id: "virgo", name: "室女宫", symbol: "\u264D\uFE0E", sound: "Virgo /ˈvɜːrɡoʊ/", meaning: "辨析、整理" },
  { id: "libra", name: "天秤宫", symbol: "\u264E\uFE0E", sound: "Libra /ˈliːbrə/", meaning: "平衡、公正" },
  { id: "scorpio", name: "天蝎宫", symbol: "\u264F\uFE0E", sound: "Scorpio /ˈskɔːrpioʊ/", meaning: "深度、转化" },
  { id: "sagittarius", name: "人马宫", symbol: "\u2650\uFE0E", sound: "Sagittarius /ˌsædʒɪˈteəriəs/", meaning: "方向、探索" },
  { id: "capricorn", name: "摩羯宫", symbol: "\u2651\uFE0E", sound: "Capricorn /ˈkæprɪkɔːrn/", meaning: "自律、攀登" },
  { id: "aquarius", name: "宝瓶宫", symbol: "\u2652\uFE0E", sound: "Aquarius /əˈkweəriəs/", meaning: "分享、更新" },
  { id: "pisces", name: "双鱼宫", symbol: "\u2653\uFE0E", sound: "Pisces /ˈpaɪsiːz/", meaning: "共情、流动" },
] as const satisfies readonly RewardSymbol[];

const GEOMANTIC_DEFINITIONS = [
  { id: "populus", name: "众民", sound: "Populus", soundLabel: "拉丁名", meaning: "汇聚、接纳", pattern: "2222" },
  { id: "tristitia", name: "悲哀", sound: "Tristitia", soundLabel: "拉丁名", meaning: "沉静、反思", pattern: "2221" },
  { id: "albus", name: "白", sound: "Albus", soundLabel: "拉丁名", meaning: "清明、理性", pattern: "2212" },
  { id: "fortuna-major", name: "大福", sound: "Fortuna Major", soundLabel: "拉丁名", meaning: "长久成果、内在稳固", pattern: "2211" },
  { id: "rubeus", name: "赤红", sound: "Rubeus", soundLabel: "拉丁名", meaning: "热情、强烈", pattern: "2122" },
  { id: "acquisitio", name: "获得", sound: "Acquisitio", soundLabel: "拉丁名", meaning: "收获、成长", pattern: "2121" },
  { id: "conjunctio", name: "联结", sound: "Conjunctio", soundLabel: "拉丁名", meaning: "会合、协作", pattern: "2112" },
  { id: "caput-draconis", name: "龙首", sound: "Caput Draconis", soundLabel: "拉丁名", meaning: "开端、进入", pattern: "2111" },
  { id: "laetitia", name: "欢欣", sound: "Laetitia", soundLabel: "拉丁名", meaning: "喜悦、上升", pattern: "1222" },
  { id: "carcer", name: "囚笼", sound: "Carcer", soundLabel: "拉丁名", meaning: "边界、自律", pattern: "1221" },
  { id: "amissio", name: "失去", sound: "Amissio", soundLabel: "拉丁名", meaning: "放下、精简", pattern: "1212" },
  { id: "puella", name: "少女", sound: "Puella", soundLabel: "拉丁名", meaning: "温和、协调", pattern: "1211" },
  { id: "fortuna-minor", name: "小福", sound: "Fortuna Minor", soundLabel: "拉丁名", meaning: "及时助力、短程进展", pattern: "1122" },
  { id: "puer", name: "少年", sound: "Puer", soundLabel: "拉丁名", meaning: "勇气、发起", pattern: "1121" },
  { id: "cauda-draconis", name: "龙尾", sound: "Cauda Draconis", soundLabel: "拉丁名", meaning: "结束、释放", pattern: "1112" },
  { id: "via", name: "道路", sound: "Via", soundLabel: "拉丁名", meaning: "行进、变化", pattern: "1111" },
] as const;

const GEOMANTIC_FIGURES: readonly RewardSymbol[] = Object.freeze(
  GEOMANTIC_DEFINITIONS.map((figure, index) =>
    Object.freeze({
      ...figure,
      symbol: String.fromCodePoint(0x1cee0 + index),
    }),
  ),
);

export const MILESTONE_SYMBOL_SYSTEMS: readonly SymbolSystem[] = [
  {
    id: "elder-futhark",
    name: "Elder Futhark · 古弗萨克",
    description: "二十四个卢恩字符，依通行的古弗萨克顺序排列",
    symbols: ELDER_FUTHARK_RUNES,
  },
  {
    id: "classical-planets",
    name: "古典七行星",
    description: "按传统地心层次由内向外：月、水、金、日、火、木、土",
    symbols: CLASSICAL_PLANETS,
  },
  {
    id: "zodiac",
    name: "黄道十二宫",
    description: "依白羊宫至双鱼宫的传统黄道顺序排列",
    symbols: ZODIAC_SIGNS,
  },
  {
    id: "geomancy",
    name: "阿拉伯—欧洲土占十六象",
    description: "四行单双点构成的十六种土占图形，按 Unicode 结构顺序排列",
    symbols: GEOMANTIC_FIGURES,
  },
];

export const MILESTONE_STAGES: readonly MilestoneStage[] = Object.freeze(
  MILESTONE_SYMBOL_SYSTEMS.flatMap((system) =>
    system.symbols.map((reward) => ({ system, reward })),
  ).map(({ system, reward }, index) => {
    const cycle = index + 1;
    return Object.freeze({
      id: `${system.id}-${reward.id}`,
      cycle,
      thresholdSeconds: cycle * MILESTONE_CYCLE_SECONDS,
      systemId: system.id,
      systemName: system.name,
      reward,
    });
  }),
);

export function evaluateMilestoneProgress(totalSeconds: number): MilestoneProgress {
  const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const completedCycles = Math.floor(safeTotal / MILESTONE_CYCLE_SECONDS);
  const unlockedCount = Math.min(completedCycles, MILESTONE_STAGES.length);
  const completedStages = MILESTONE_STAGES.slice(0, unlockedCount);
  const currentStage = completedStages[completedStages.length - 1];
  const nextStage = MILESTONE_STAGES[unlockedCount];

  const elapsedInCycle = safeTotal % MILESTONE_CYCLE_SECONDS;
  const completedHexagramsInCycle = Math.floor(elapsedInCycle / HEXAGRAM_STEP_SECONDS);
  const elapsedInHexagram = elapsedInCycle % HEXAGRAM_STEP_SECONDS;
  const currentHexagram = MILESTONE_HEXAGRAMS[completedHexagramsInCycle];
  const nextHexagram = MILESTONE_HEXAGRAMS[
    (completedHexagramsInCycle + 1) % HEXAGRAMS_PER_CYCLE
  ];
  const hexagramProgress = elapsedInHexagram / HEXAGRAM_STEP_SECONDS;
  const remainingHexagramSeconds = HEXAGRAM_STEP_SECONDS - elapsedInHexagram;
  const cycleProgress = elapsedInCycle / MILESTONE_CYCLE_SECONDS;
  const remainingRewardSeconds = nextStage
    ? Math.max(0, nextStage.thresholdSeconds - safeTotal)
    : 0;

  return {
    totalSeconds: safeTotal,
    completedStages: [...completedStages],
    currentStage,
    nextStage,
    completedCycles,
    currentCycle: completedCycles + 1,
    currentHexagram,
    nextHexagram,
    completedHexagramsInCycle,
    hexagramProgress,
    remainingHexagramSeconds,
    cycleProgress,
    remainingRewardSeconds,
    progress: nextStage ? cycleProgress : 1,
    remainingSeconds: remainingRewardSeconds,
  };
}

export function buildMilestoneProgress(
  habits: readonly Habit[],
  events: readonly TrackerEvent[],
  runningTimer?: RunningTimer,
  now = Date.now(),
): MilestoneProgress {
  const durationHabitIds = new Set(
    habits.filter((habit) => habit.type === "duration").map((habit) => habit.id),
  );
  let totalSeconds = 0;
  for (const habitId of durationHabitIds) {
    totalSeconds += cumulativeDurationSeconds(habitId, [...events]);
  }
  if (runningTimer && durationHabitIds.has(runningTimer.habitId)) {
    totalSeconds += elapsedTimerSeconds(runningTimer, now);
  }
  return evaluateMilestoneProgress(totalSeconds);
}
