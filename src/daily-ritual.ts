import { keyToDate } from "./date-utils";

export interface DailyRitualPassage {
  id: string;
  source: string;
  original: string;
  translation: string;
}

export const DAILY_RITUAL_PASSAGES: readonly DailyRitualPassage[] = [
  {
    id: "daodejing-08-water",
    source: "《道德经》第八章",
    original: "上善若水。水善利万物而不争，处众人之所恶，故几于道。",
    translation: "最高的善像水：滋养万物而不争，安处众人不愿去的低处，因此接近于道。",
  },
  {
    id: "daodejing-10-hold-one",
    source: "《道德经》第十章",
    original: "载营魄抱一，能无离乎？专气致柔，能婴儿乎？涤除玄览，能无疵乎？",
    translation: "让身心合一而不分离，调匀气息而归于柔和，洗净内心的观照而不留蔽障。",
  },
  {
    id: "daodejing-15-clear",
    source: "《道德经》第十五章",
    original: "孰能浊以静之徐清？孰能安以动之徐生？",
    translation: "谁能让浑浊在安静中慢慢澄清？谁能在安定中行动，使生机渐渐显现？",
  },
  {
    id: "daodejing-16-return",
    source: "《道德经》第十六章",
    original: "致虚极，守静笃。万物并作，吾以观复。夫物芸芸，各复归其根。归根曰静，是谓复命。",
    translation: "让心空明到极处，守住深静。万物蓬勃生长，我由此看见它们终会返回根本；归根就是静。",
  },
  {
    id: "daodejing-22-whole",
    source: "《道德经》第二十二章",
    original: "曲则全，枉则直，洼则盈，敝则新，少则得，多则惑。",
    translation: "能弯曲反得保全，能屈就反得伸展；低洼得以充盈，陈旧得以更新，少取反而有所得。",
  },
  {
    id: "daodejing-28-stream",
    source: "《道德经》第二十八章",
    original: "知其雄，守其雌，为天下溪。为天下溪，常德不离，复归于婴儿。",
    translation: "知道刚强，也守住柔静，甘为天下的溪谷；如此常德不离，心性便能回到婴儿般纯真。",
  },
  {
    id: "daodejing-33-self-knowledge",
    source: "《道德经》第三十三章",
    original: "知人者智，自知者明。胜人者有力，自胜者强。知足者富，强行者有志。",
    translation: "了解别人是智慧，认识自己才算明澈；胜过别人是有力，战胜自己才是真正强大。",
  },
  {
    id: "daodejing-37-nonaction",
    source: "《道德经》第三十七章",
    original: "道常无为而无不为。",
    translation: "道从不勉强造作，却没有什么不能在其运行中自然成就。",
  },
  {
    id: "daodejing-44-enough",
    source: "《道德经》第四十四章",
    original: "知足不辱，知止不殆，可以长久。",
    translation: "懂得满足就不易受辱，知道适时停止就不易陷入危险，因此能够长久。",
  },
  {
    id: "daodejing-48-less",
    source: "《道德经》第四十八章",
    original: "为学日益，为道日损。损之又损，以至于无为。无为而无不为。",
    translation: "求学天天增加知识，体道则天天减去妄念；一减再减，直到不强作，于是无所不成。",
  },
  {
    id: "daodejing-64-first-step",
    source: "《道德经》第六十四章",
    original: "合抱之木，生于毫末；九层之台，起于累土；千里之行，始于足下。",
    translation: "合抱的大树从细芽长起，九层高台从一筐土筑起，千里远行从脚下第一步开始。",
  },
  {
    id: "daodejing-76-soft",
    source: "《道德经》第七十六章",
    original: "人之生也柔弱，其死也坚强。草木之生也柔脆，其死也枯槁。故坚强者死之徒，柔弱者生之徒。",
    translation: "人活着时柔软，死后变得僵硬；草木有生机时柔脆，枯死时干硬。柔弱更接近生命。",
  },
  {
    id: "qingjing-dao",
    source: "《清静经》",
    original: "大道无形，生育天地；大道无情，运行日月；大道无名，长养万物。吾不知其名，强名曰道。",
    translation: "大道没有固定形体，却化生天地；不凭私情，却运行日月；不可命名，却滋养万物，姑且称它为道。",
  },
  {
    id: "qingjing-mind",
    source: "《清静经》",
    original: "夫人神好清，而心扰之；人心好静，而欲牵之。常能遣其欲，而心自静；澄其心，而神自清。",
    translation: "人的精神本来喜清，杂念却来扰动；内心本来喜静，欲望却来牵引。放下欲念、澄清内心，精神自然清明。",
  },
  {
    id: "qingjing-return",
    source: "《清静经》",
    original: "清者浊之源，动者静之基。人能常清静，天地悉皆归。",
    translation: "清是浊的源头，动以静为根基。人若能常守清静，便能与天地运行的根本相契。",
  },
  {
    id: "qingjing-observe",
    source: "《清静经》",
    original: "内观其心，心无其心；外观其形，形无其形；远观其物，物无其物。三者既悟，唯见于空。",
    translation: "向内观心、向外观身、再远观万物，不执着于固定的心、形与物，便能体会空明。",
  },
];

function normalizedSeed(seed: string): string {
  if (typeof seed !== "string") throw new Error("Daily ritual seed must be a string");
  const normalized = seed.normalize("NFC").trim();
  if (!normalized) throw new Error("Daily ritual seed must not be empty");
  return normalized;
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getDailyRitualPassage(dateKey: string, seed: string): DailyRitualPassage {
  keyToDate(dateKey);
  const identity = `${dateKey}\u0000${normalizedSeed(seed)}\u0000daily-ritual`;
  return DAILY_RITUAL_PASSAGES[stableHash(identity) % DAILY_RITUAL_PASSAGES.length];
}
