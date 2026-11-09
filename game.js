/**
 * ============================================================================
 * 消しバトNeo 〜最大5文字・密着合体クラフト＆物理バトル〜
 * ============================================================================
 * 【仕様・UI/UX改善ポイント】
 * 1. 1画面完全収納:
 *    - 3カラムGridの minmax(0,1fr) 化・ボタン幅圧縮・作業台表示倍率(EDIT_VIEW_SCALE=1.32)の最適化により、
 *      1280x720〜フルHD・モバイル画面でも一切見切れ・横はみ出しを起こさず1画面に収まる設計。
 * 2. 最大5文字制限 (MAX_GLYPHS = 5):
 *    - 使用できる文字数を最大5文字に厳選。5文字満杯時はワンタップで「選択中の文字と置換」が可能。
 * 3. 全文字接触・単一連結制約 (enforceConnectedGlyphs):
 *    - 機体を構成するすべての文字が必ず互いに接して1つの塊（連結グラフ）になるよう物理・幾何学的に制限。
 *    - ドラッグ移動・サイズ変更・文字追加・削除のあらゆる操作で、離れた文字は隣接文字の輪郭接触位置へ
 *      磁力スナップし、重なりすぎた文字は外周へ押し出されて「すべての文字が綺麗に接する機体」を維持する。
 * ============================================================================
 */

// ============================================================================
// 1. WEB AUDIO SYNTHESIZER (Procedural Sound Effects)
// ============================================================================
function safeGetStorage(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetStorage(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
}

let currentLang = safeGetStorage('keshigomu_neo_lang', 'en');
function isEn() {
  return currentLang === 'en';
}

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.adMuted = false;
    this.tabMuted = false;
  }

  isAudible() {
    return this.enabled && !this.adMuted && !this.tabMuted;
  }

  setTabMuted(muted) {
    this.tabMuted = !!muted;
    if (this.ctx) {
      if (this.tabMuted && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      } else if (!this.tabMuted && this.isAudible() && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  playCancel() {
    this.playClick();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.isAudible()) {
      this.ctx.resume().catch(() => {});
    }
  }

  playClick() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playEquip() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [360, 540, 780].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);
      gain.gain.setValueAtTime(0.08, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.09);
    });
  }

  playShoot(powerRatio = 0.5) {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 150 + powerRatio * 140;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    gain.gain.setValueAtTime(0.24 * Math.max(0.3, powerRatio), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playHit(intensity = 0.6, isMetallic = true) {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(1, Math.max(0.15, intensity));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isMetallic ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isMetallic ? 320 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.15);
    gain.gain.setValueAtTime(0.32 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);

    if (isMetallic) {
      const clang = this.ctx.createOscillator();
      const cGain = this.ctx.createGain();
      clang.type = 'triangle';
      clang.frequency.setValueAtTime(1120, now);
      clang.frequency.exponentialRampToValueAtTime(390, now + 0.12);
      cGain.gain.setValueAtTime(0.16 * vol, now);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      clang.connect(cGain);
      cGain.connect(this.ctx.destination);
      clang.start(now);
      clang.stop(now + 0.14);
    }
  }

  playSkill() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 660, 880, 1180].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.13, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.13);
    });
  }

  playFall() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.47);
  }

  playWin() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
  playBoost() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playSpin() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.linearRampToValueAtTime(720, now + 0.06);
    osc.frequency.linearRampToValueAtTime(420, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playRough() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playBurst() {
    if (!this.isAudible()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Harsh metallic fracture transients (detuned sharp oscillators)
    [260, 480, 720, 1150].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq * (1.3 + idx * 0.2), now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.22 + idx * 0.04);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24 + idx * 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.012);
      osc.stop(now + 0.36);
    });

    // 2. Heavy explosive sub-bass impact rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.65);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.70);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.72);

    // 3. Crackling shatter noise burst
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.07));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) {}
  }
}

const sfx = new SoundSystem();

// ============================================================================
// 2. GLYPH MATERIALS, SKILLS, PALETTES, & 5-CHAR CONNECTED PRESETS
// ============================================================================

const MAX_GLYPHS = 5;
const EDIT_VIEW_SCALE = 1.32;

// Available Font Families for Glyph Construction
const GLYPH_FONTS = {
  heavy: {
    id: 'heavy',
    name: '極太角ゴシック',
    cssFamily: '"Dela Gothic One", "Impact", "Arial Black", "Hiragino Sans", "Yu Gothic", sans-serif',
    weight: '900',
    desc: '最大の重厚シルエット・圧倒的重装甲'
  },
  mecha: {
    id: 'mecha',
    name: '鋭角ブレード明朝',
    cssFamily: '"Kaisei Decol", "Hiragino Mincho ProN", "Yu Mincho", "MS PMincho", serif',
    weight: '700',
    desc: '刃物のような鋭利なウロコと鋭い払い'
  },
  stencil: {
    id: 'stencil',
    name: '弾力丸ゴシック',
    cssFamily: '"M PLUS Rounded 1c", "HGMaruGothicMPRO", "Hiragino Maru Gothic ProN", sans-serif',
    weight: '800',
    desc: '角が丸く弾力のある高反発シルエット'
  },
  brush: {
    id: 'brush',
    name: '豪快武神毛筆',
    cssFamily: '"Yuji Boku", "HGPGyoshotai", "HGGyoshotai", "Yu Mincho", serif',
    weight: '900',
    desc: '豪快な墨の勢い・躍動感ある武骨筆跡'
  },
  cyber: {
    id: 'cyber',
    name: 'サイバー等幅コード',
    cssFamily: '"Consolas", "Courier New", "SFMono-Regular", "Liberation Mono", monospace',
    weight: '700',
    desc: '直線的で機械的な近未来テクノコード'
  }
};

let defaultSelectedFont = 'heavy';

const GLYPH_MATERIALS = {
  // --- 1. 消しゴム (Eraser: 原点・超高摩擦・踏ん張り) ---
  eraser: {
    id: 'eraser',
    name: '消しゴム',
    weightMul: 1.00,
    atkMul: 0.95,
    defMul: 1.20,
    spdMul: 0.90,
    gripMul: 1.68,
    spinMul: 0.85,
    restitution: 0.68,
    defaultColor: '#f8fafc',
    defaultDepth: '#1e293b',
    strokeColor: '#38bdf8',
    metallic: false,
    matType: 'eraser'
  },

  // --- 2. 強化ゴム (Rubber: 超弾性・ボヨンと跳ね返す) ---
  rubber: {
    id: 'rubber',
    name: '強化ゴム',
    weightMul: 1.05,
    atkMul: 0.88,
    defMul: 1.30,
    spdMul: 0.88,
    gripMul: 1.50,
    spinMul: 0.80,
    restitution: 1.08,
    defaultColor: '#334155',
    defaultDepth: '#0f172a',
    strokeColor: '#64748b',
    metallic: false,
    matType: 'rubber'
  },

  // --- 3. 天然木材 (Wood: 超軽量・高回転・機敏) ---
  wood: {
    id: 'wood',
    name: '天然木材',
    weightMul: 0.68,
    atkMul: 0.90,
    defMul: 0.75,
    spdMul: 1.45,
    gripMul: 0.85,
    spinMul: 1.40,
    restitution: 0.82,
    defaultColor: '#d97706',
    defaultDepth: '#451a03',
    strokeColor: '#fde68a',
    metallic: false,
    matType: 'wood'
  },

  // --- 4. 強化ガラス (Glass: 超低摩擦・超滑走・クリスタル) ---
  glass: {
    id: 'glass',
    name: '強化ガラス',
    weightMul: 1.08,
    atkMul: 1.25,
    defMul: 0.80,
    spdMul: 1.38,
    gripMul: 0.45,
    spinMul: 1.30,
    restitution: 1.05,
    defaultColor: '#06b6d4',
    defaultDepth: '#083344',
    strokeColor: '#a5f3fc',
    metallic: false,
    matType: 'glass'
  },

  // --- 5. 花崗岩石 (Stone: 超超重量・不動の要塞・ノックバック激減) ---
  stone: {
    id: 'stone',
    name: '花崗岩石',
    weightMul: 1.58,
    atkMul: 1.15,
    defMul: 1.55,
    spdMul: 0.62,
    gripMul: 1.35,
    spinMul: 0.70,
    restitution: 0.65,
    defaultColor: '#64748b',
    defaultDepth: '#1e293b',
    strokeColor: '#94a3b8',
    metallic: false,
    matType: 'stone'
  },

  // --- 6. 粘着ゲル (Slime: 衝撃吸収・相手の勢いを殺す) ---
  slime: {
    id: 'slime',
    name: '粘着ゲル',
    weightMul: 0.88,
    atkMul: 0.80,
    defMul: 1.40,
    spdMul: 0.85,
    gripMul: 1.75,
    spinMul: 0.65,
    restitution: 0.38,
    defaultColor: '#10b981',
    defaultDepth: '#064e3b',
    strokeColor: '#6ee7b7',
    metallic: false,
    matType: 'slime'
  },

  // --- 7. チタン合金 (Titanium: 高剛性・バランス型メタル) ---
  titanium: {
    id: 'titanium',
    name: 'チタン合金',
    weightMul: 1.18,
    atkMul: 1.18,
    defMul: 1.25,
    spdMul: 1.05,
    gripMul: 0.95,
    spinMul: 1.05,
    restitution: 0.90,
    defaultColor: '#94a3b8',
    defaultDepth: '#1e293b',
    strokeColor: '#f1f5f9',
    metallic: true,
    matType: 'titanium'
  },

  // --- 8. ブレード鋼 (Blade: 攻撃特化・鋭角突き刺し) ---
  blade: {
    id: 'blade',
    name: 'ブレード鋼',
    weightMul: 1.06,
    atkMul: 1.58,
    defMul: 0.70,
    spdMul: 1.15,
    gripMul: 0.65,
    spinMul: 1.25,
    restitution: 0.96,
    defaultColor: '#ef4444',
    defaultDepth: '#450a0a',
    strokeColor: '#fecaca',
    metallic: true,
    matType: 'blade'
  },

  // --- 9. 純金ゴールド (Gold: 超高比重・絢爛豪華) ---
  gold: {
    id: 'gold',
    name: '純金ゴールド',
    weightMul: 1.50,
    atkMul: 1.24,
    defMul: 1.42,
    spdMul: 0.65,
    gripMul: 1.25,
    spinMul: 0.78,
    restitution: 0.88,
    defaultColor: '#f59e0b',
    defaultDepth: '#451a03',
    strokeColor: '#fef08a',
    metallic: true,
    matType: 'gold'
  },

  // --- 後方互換性エイリアス (Legacy compatibility) ---
  mecha: {
    id: 'mecha',
    name: 'チタン合金',
    weightMul: 1.18,
    atkMul: 1.18,
    defMul: 1.25,
    spdMul: 1.05,
    gripMul: 0.95,
    spinMul: 1.05,
    restitution: 0.90,
    defaultColor: '#38bdf8',
    defaultDepth: '#0f172a',
    strokeColor: '#e0f2fe',
    metallic: true,
    matType: 'titanium'
  },
  neon: {
    id: 'neon',
    name: '強化ガラス',
    weightMul: 1.08,
    atkMul: 1.25,
    defMul: 0.80,
    spdMul: 1.38,
    gripMul: 0.45,
    spinMul: 1.30,
    restitution: 1.05,
    defaultColor: '#06b6d4',
    defaultDepth: '#083344',
    strokeColor: '#a5f3fc',
    metallic: false,
    matType: 'glass'
  },
  chrome: {
    id: 'chrome',
    name: '強化ガラス',
    weightMul: 1.08,
    atkMul: 1.25,
    defMul: 0.80,
    spdMul: 1.38,
    gripMul: 0.45,
    spinMul: 1.30,
    restitution: 1.05,
    defaultColor: '#06b6d4',
    defaultDepth: '#083344',
    strokeColor: '#ffffff',
    metallic: false,
    matType: 'glass'
  },
  damascus: {
    id: 'damascus',
    name: 'ブレード鋼',
    weightMul: 1.06,
    atkMul: 1.58,
    defMul: 0.70,
    spdMul: 1.15,
    gripMul: 0.65,
    spinMul: 1.25,
    restitution: 0.96,
    defaultColor: '#ef4444',
    defaultDepth: '#450a0a',
    strokeColor: '#fecaca',
    metallic: true,
    matType: 'blade'
  },
  brass: {
    id: 'brass',
    name: '純金ゴールド',
    weightMul: 1.50,
    atkMul: 1.24,
    defMul: 1.42,
    spdMul: 0.65,
    gripMul: 1.25,
    spinMul: 0.78,
    restitution: 0.88,
    defaultColor: '#f59e0b',
    defaultDepth: '#451a03',
    strokeColor: '#fef08a',
    metallic: true,
    matType: 'gold'
  }
};

const GLYPH_SKILLS = {
  slash: {
    id: 'slash',
    title: '文字剣・一閃突破',
    desc: '滑走中に鋭い文字ブレードで前方へ高速斬り込み突進を放ち、衝突威力を大幅強化！'
  },
  buster: {
    id: 'buster',
    title: '漢字破砕・インパクト',
    desc: '滑走中に文字コアを爆発膨張させて周囲に超衝撃波を放ち、相手を強烈に弾き飛ばす！'
  },
  boost: {
    id: 'boost',
    title: '推進文字・ブースト',
    desc: '滑走中に文字スラスターを最大噴射し、進行方向へ鋭く再加速して相手を押し込む！'
  },
  vortex: {
    id: 'vortex',
    title: '渦巻文字・スピン',
    desc: '滑走中に超高速スピンを展開し、接触した相手を竜巻のように巻き込んで弾き飛ばす！'
  },
  anchor: {
    id: 'anchor',
    title: '鉄壁文字・アンカー',
    desc: '滑走中に重装文字の楔を机に撃ち込んでピタッと急停止し、場外落下を完全に防ぐ！'
  }
};

const PALETTE_CATEGORIES = {
  attack: [
    '▲', '▼', '◆', '★', 'V', 'A', 'X', 'Y',
    '剣', '刀', '槍', '刃', '針', '突', '矢', '牙',
    '斬', '撃', '破', '爪', '角', '†', '≪', '≫'
  ],
  armor: [
    '■', '●', '◆', '⬢', '盾', '鎧', '鉄', '鋼',
    '岩', '山', '城', '壁', '重', '塊', '砦', '剛',
    '王', '帝', '覇', '不動', '門', '礎', '鼎', '凸'
  ],
  speed: [
    '翼', '羽', '風', '疾', '迅', '雷', '電', '光',
    '閃', '噴', '飛', '翔', '流', '颯', '矢', '推進',
    'W', 'M', 'S', 'Z', '彡', '≫', '速', '突'
  ],
  special: [
    '龍', '竜', '神', '魔', '鬼', '炎', '焔', '爆',
    '轟', '渦', '廻', '零', '卍', '♾', 'Ω', 'α',
    '鳳', '凰', '虎', '狼', '獅子', '獄', '天', '星'
  ],
  english: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '7', '8'
  ],
  symbols: [
    '★', '⚔', '▲', '▼', '◆', '●', '■', '✕', '✦',
    'Ω', 'Ψ', 'Σ', '∞', '†', '‡', '※', '⬡', '◇'
  ]
};

// 5 Presets: Every preset uses at most 5 characters, all tightly touching!
const PRESET_MACHINES = [
  {
    id: 'preset_dragon_blade',
    name: '文字覇王・剣龍号',
    desc: '中央の『龍』に先端『▲』・左右の『剣』・後部『翼』が密着合体した5文字万能戦闘機',
    weldChassis: true,
    glyphs: [
      { char: '龍', x: 0,   y: 0,   angle: 0,   scale: 120, mat: 'mecha', color: '#38bdf8', depthColor: '#0f172a', flipX: false, flipY: false },
      { char: '▲',  x: 0,   y: -34, angle: 0,   scale: 105, mat: 'blade', color: '#ef4444', depthColor: '#450a0a', flipX: false, flipY: false },
      { char: '剣', x: -32, y: -4,  angle: -18, scale: 105, mat: 'blade', color: '#f8fafc', depthColor: '#334155', flipX: false, flipY: false },
      { char: '剣', x: 32,  y: -4,  angle: 18,  scale: 105, mat: 'blade', color: '#f8fafc', depthColor: '#334155', flipX: true,  flipY: false },
      { char: '翼', x: 0,   y: 34,  angle: 0,   scale: 110, mat: 'neon',  color: '#10b981', depthColor: '#064e3b', flipX: false, flipY: false }
    ]
  },
  {
    id: 'preset_heavy_fortress',
    name: '重装要塞・鉄壁王',
    desc: '黄金の『覇』を核に『盾』『鎧』『鋼』が隙間なく密着結束した超重量5文字要塞',
    weldChassis: true,
    glyphs: [
      { char: '覇', x: 0,   y: 0,   angle: 0,   scale: 125, mat: 'gold',   color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false },
      { char: '盾', x: 0,   y: -34, angle: 0,   scale: 110, mat: 'mecha',  color: '#38bdf8', depthColor: '#0f172a', flipX: false, flipY: false },
      { char: '鎧', x: -34, y: 2,   angle: -10, scale: 108, mat: 'rubber', color: '#f8fafc', depthColor: '#334155', flipX: false, flipY: false },
      { char: '鎧', x: 34,  y: 2,   angle: 10,  scale: 108, mat: 'rubber', color: '#f8fafc', depthColor: '#334155', flipX: true,  flipY: false },
      { char: '鋼', x: 0,   y: 34,  angle: 0,   scale: 108, mat: 'gold',   color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false }
    ]
  },
  {
    id: 'preset_sonic_valkyrie',
    name: '超音速・疾風閃号',
    desc: '鋭角『V』と『閃』に双『翼』と『噴』が密着結合した5文字ハイスピード機',
    weldChassis: true,
    glyphs: [
      { char: '閃', x: 0,   y: 0,   angle: 0,   scale: 115, mat: 'neon',  color: '#10b981', depthColor: '#064e3b', flipX: false, flipY: false },
      { char: 'V',  x: 0,   y: -33, angle: 180, scale: 110, mat: 'blade', color: '#ef4444', depthColor: '#450a0a', flipX: false, flipY: false },
      { char: '翼', x: -32, y: -4,  angle: -28, scale: 110, mat: 'neon',  color: '#38bdf8', depthColor: '#0f172a', flipX: false, flipY: false },
      { char: '翼', x: 32,  y: -4,  angle: 28,  scale: 110, mat: 'neon',  color: '#38bdf8', depthColor: '#0f172a', flipX: true,  flipY: false },
      { char: '噴', x: 0,   y: 33,  angle: 0,   scale: 105, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false }
    ]
  },
  {
    id: 'preset_crimson_nova',
    name: '獄炎破壊・轟爆号',
    desc: '『轟』を中心に『突』『牙』『爆』が一体化した超攻撃型5文字バスター機',
    weldChassis: true,
    glyphs: [
      { char: '轟', x: 0,   y: 0,   angle: 0,   scale: 122, mat: 'blade', color: '#ef4444', depthColor: '#450a0a', flipX: false, flipY: false },
      { char: '突', x: 0,   y: -34, angle: 0,   scale: 108, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false },
      { char: '牙', x: -33, y: -3,  angle: -22, scale: 106, mat: 'blade', color: '#f8fafc', depthColor: '#334155', flipX: false, flipY: false },
      { char: '牙', x: 33,  y: -3,  angle: 22,  scale: 106, mat: 'blade', color: '#f8fafc', depthColor: '#334155', flipX: true,  flipY: false },
      { char: '爆', x: 0,   y: 34,  angle: 0,   scale: 108, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false }
    ]
  },
  {
    id: 'preset_vortex_shuriken',
    name: '雷神渦巻・卍刃号',
    desc: '『渦』の四方に『刃』と『雷』を密着配置した5文字トルネードスピン機',
    weldChassis: true,
    glyphs: [
      { char: '渦', x: 0,   y: 0,   angle: 0,   scale: 118, mat: 'neon',  color: '#a855f7', depthColor: '#3b0764', flipX: false, flipY: false },
      { char: '刃', x: 0,   y: -33, angle: 0,   scale: 105, mat: 'blade', color: '#38bdf8', depthColor: '#0f172a', flipX: false, flipY: false },
      { char: '刃', x: 0,   y: 33,  angle: 180, scale: 105, mat: 'blade', color: '#38bdf8', depthColor: '#0f172a', flipX: false, flipY: false },
      { char: '雷', x: -33, y: 0,   angle: -90, scale: 105, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false },
      { char: '雷', x: 33,  y: 0,   angle: 90,  scale: 105, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false }
    ]
  }
];

// ============================================================================
// 3. OFF-SCREEN GLYPH PIXEL ANALYZER (Actual Character Shape Hitbox & Specs)
// ============================================================================
const glyphAnalysisCache = new Map();
const glyphMeasureCanvas = document.createElement('canvas');
glyphMeasureCanvas.width = 64;
glyphMeasureCanvas.height = 64;
const glyphMeasureCtx = glyphMeasureCanvas.getContext('2d', { willReadFrequently: true });

function extractFirstGrapheme(str) {
  const trimmed = (str || '').trim();
  if (!trimmed) return '▲';
  return Array.from(trimmed)[0];
}

/**
 * Renders the character at 1:1 base physical scale (35px font + bevel stroke centered at 32,32)
 * and extracts:
 * - shapeNodes: Multi-disc stroke collision primitives placed ONLY on actual character strokes!
 * - boundarySegments: Exact pixel-traced contour segments hugging every stroke, tip, and hollow!
 */
function analyzeGlyph(rawChar, fontStyle = 'heavy') {
  const char = extractFirstGrapheme(rawChar);
  const cacheKey = `${char}_${fontStyle || 'heavy'}`;
  if (glyphAnalysisCache.has(cacheKey)) {
    return glyphAnalysisCache.get(cacheKey);
  }

  const size = 64;
  const half = 32;
  glyphMeasureCtx.clearRect(0, 0, size, size);
  glyphMeasureCtx.fillStyle = '#ffffff';
  glyphMeasureCtx.strokeStyle = '#ffffff';
  glyphMeasureCtx.lineJoin = 'round';
  glyphMeasureCtx.miterLimit = 2;
  glyphMeasureCtx.lineWidth = 5.5;
  glyphMeasureCtx.textAlign = 'center';
  glyphMeasureCtx.textBaseline = 'middle';
  
  const fontObj = GLYPH_FONTS[fontStyle] || GLYPH_FONTS.heavy;
  glyphMeasureCtx.font = `${fontObj.weight} 35px ${fontObj.cssFamily}`;
  
  // Draw stroke + fill at (32, 32) so pixel coordinates map 1:1 to base local coordinates
  glyphMeasureCtx.strokeText(char, half, half);
  glyphMeasureCtx.fillText(char, half, half);

  const img = glyphMeasureCtx.getImageData(0, 0, size, size).data;
  const alphaAt = (x, y) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return 0;
    return img[(y * size + x) * 4 + 3];
  };

  let filled = 0;
  let edgePixels = 0;
  let topSharpPixels = 0;
  let minX = size, maxX = 0, minY = size, maxY = 0;

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (alphaAt(x, y) > 96) {
        filled++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const up = alphaAt(x, y - 1) <= 96;
        const dn = alphaAt(x, y + 1) <= 96;
        const lf = alphaAt(x - 1, y) <= 96;
        const rt = alphaAt(x + 1, y) <= 96;
        if (up || dn || lf || rt) {
          edgePixels++;
          if (y < size * 0.38 && (up || lf || rt)) {
            topSharpPixels++;
          }
        }
      }
    }
  }

  if (filled < 10) {
    minX = 16; maxX = 48; minY = 16; maxY = 48;
    filled = 360;
    edgePixels = 140;
  }

  // 1. Extract Actual Stroke Collision Nodes (4x4 cell resolution -> only where character ink exists)
  const cellStep = 4;
  const shapeNodes = [];
  for (let cy = 2; cy < size - 2; cy += cellStep) {
    for (let cx = 2; cx < size - 2; cx += cellStep) {
      let inkCount = 0;
      let sumX = 0;
      let sumY = 0;
      let touchesEmpty = false;

      for (let dy = 0; dy < cellStep; dy++) {
        for (let dx = 0; dx < cellStep; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          if (alphaAt(px, py) > 96) {
            inkCount++;
            sumX += px;
            sumY += py;
            if (
              alphaAt(px - 1, py) <= 96 ||
              alphaAt(px + 1, py) <= 96 ||
              alphaAt(px, py - 1) <= 96 ||
              alphaAt(px, py + 1) <= 96
            ) {
              touchesEmpty = true;
            }
          } else {
            touchesEmpty = true;
          }
        }
      }

      if (inkCount >= 3) {
        const meanX = sumX / inkCount;
        const meanY = sumY / inkCount;
        const lx = meanX - half;
        const ly = meanY - half;

        // Compute outward normal from local alpha gradient (points from inked interior toward empty space)
        let gx = 0;
        let gy = 0;
        const ix = Math.round(meanX);
        const iy = Math.round(meanY);
        for (let oy = -3; oy <= 3; oy++) {
          for (let ox = -3; ox <= 3; ox++) {
            if (ox === 0 && oy === 0) continue;
            const a = alphaAt(ix + ox, iy + oy) > 96 ? 1 : 0;
            gx -= ox * a;
            gy -= oy * a;
          }
        }
        let gLen = Math.hypot(gx, gy);
        if (gLen < 0.001) {
          const rLen = Math.hypot(lx, ly) || 1;
          gx = lx / rLen;
          gy = ly / rLen;
        } else {
          gx /= gLen;
          gy /= gLen;
        }

        // Local tip sharpness: fewer inked pixels in a 9x9 neighborhood means a sharper spike/blade tip
        let ringInk = 0;
        let ringTotal = 0;
        for (let oy = -4; oy <= 4; oy += 2) {
          for (let ox = -4; ox <= 4; ox += 2) {
            ringTotal++;
            if (alphaAt(ix + ox, iy + oy) > 96) ringInk++;
          }
        }
        const localFillRatio = ringInk / Math.max(1, ringTotal);
        const tipSharpness = Math.min(1, Math.max(0.15, (1 - localFillRatio) * 1.35));

        shapeNodes.push({
          lx: Number(lx.toFixed(1)),
          ly: Number(ly.toFixed(1)),
          r: Number((2.05 + (inkCount / 16) * 0.95).toFixed(2)),
          isBoundary: touchesEmpty,
          nx: Number(gx.toFixed(3)),
          ny: Number(gy.toFixed(3)),
          sharpness: Number(tipSharpness.toFixed(2))
        });
      }
    }
  }

  // Fallback if symbol had no nodes
  if (shapeNodes.length === 0) {
    shapeNodes.push({ lx: 0, ly: 0, r: 12, isBoundary: true, nx: 0, ny: -1, sharpness: 0.4 });
  }

  // Keep a fast subset of boundary nodes (plus key interior anchors) for real-time collision
  const boundaryNodes = shapeNodes.filter(n => n.isBoundary);
  const activeCollisionNodes = boundaryNodes.length >= 6 ? boundaryNodes : shapeNodes;

  // 2. Extract Exact Pixel-Contour Segments (2x2 grid Marching Boundary) for True Shape Visualization
  const gStep = 2;
  const gw = size / gStep;
  const boundarySegments = [];
  const cellFilled = (gx, gy) => {
    if (gx < 0 || gx >= gw || gy < 0 || gy >= gw) return false;
    const px = gx * gStep + 1;
    const py = gy * gStep + 1;
    return alphaAt(px, py) > 96;
  };

  for (let gy = 0; gy < gw; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!cellFilled(gx, gy)) continue;
      const x0 = gx * gStep - half;
      const y0 = gy * gStep - half;
      const x1 = (gx + 1) * gStep - half;
      const y1 = (gy + 1) * gStep - half;

      if (!cellFilled(gx, gy - 1)) boundarySegments.push({ x1: x0, y1: y0, x2: x1, y2: y0 });
      if (!cellFilled(gx, gy + 1)) boundarySegments.push({ x1: x0, y1: y1, x2: x1, y2: y1 });
      if (!cellFilled(gx - 1, gy)) boundarySegments.push({ x1: x0, y1: y0, x2: x0, y2: y1 });
      if (!cellFilled(gx + 1, gy)) boundarySegments.push({ x1: x1, y1: y0, x2: x1, y2: y1 });
    }
  }

  const bboxW = Math.max(14, maxX - minX + 1);
  const bboxH = Math.max(14, maxY - minY + 1);
  const aspect = bboxW / bboxH;

  const density = Math.min(1, filled / 1050);
  const complexity = Math.min(1, edgePixels / Math.max(110, filled * 0.52));
  const sharpness = Math.min(1, (topSharpPixels / Math.max(16, bboxW * 0.82)) * (1.15 - density * 0.35));

  const physW = Math.round(bboxW);
  const physH = Math.round(bboxH);
  const maxLocalRadius = shapeNodes.reduce((acc, n) => Math.max(acc, Math.hypot(n.lx, n.ly) + n.r), 14);

  // Compute spiky, polarized character stats (strong strengths + clear weaknesses, ranging 3..25)
  const codePoint = char.codePointAt(0) || 65;
  const microVarA = ((codePoint * 17) % 7) - 3; // -3..+3
  const microVarB = ((codePoint * 31) % 7) - 3;

  let skillId = 'slash';
  let archAtk = 0, archDef = 0, archSpd = 0, archGrip = 0, archSpin = 0;

  if ('▲▼◆★VAXY剣刀槍刃針突矢牙斬撃破爪角†≪≫'.includes(char)) {
    skillId = 'slash';
    archAtk = 10; archDef = -6; archSpd = 3; archGrip = -5; archSpin = 3;
  } else if ('■●⬢盾鎧鉄鋼岩山城壁重塊砦剛王帝覇不動門礎鼎凸'.includes(char)) {
    skillId = 'anchor';
    archAtk = -5; archDef = 11; archSpd = -8; archGrip = 10; archSpin = -7;
  } else if ('翼羽風疾迅雷電光閃噴飛翔流颯推進WMSZ彡速突'.includes(char)) {
    skillId = 'boost';
    archAtk = 1; archDef = -8; archSpd = 12; archGrip = -7; archSpin = 5;
  } else if ('渦廻零卍♾Ωα星輪円旋転'.includes(char)) {
    skillId = 'vortex';
    archAtk = 3; archDef = -6; archSpd = 4; archGrip = -8; archSpin = 13;
  } else if ('龍竜神魔鬼炎焔爆轟鳳凰虎狼獅子獄天'.includes(char)) {
    skillId = 'buster';
    archAtk = 9; archDef = 4; archSpd = -5; archGrip = -2; archSpin = 2;
  } else {
    if (sharpness > 0.54) {
      skillId = 'slash';
      archAtk = 7; archDef = -5; archSpd = 3; archGrip = -4; archSpin = 2;
    } else if (density > 0.56) {
      skillId = 'buster';
      archAtk = 4; archDef = 7; archSpd = -6; archGrip = 5; archSpin = -4;
    } else if (density < 0.34) {
      skillId = 'boost';
      archAtk = -2; archDef = -6; archSpd = 9; archGrip = -5; archSpin = 4;
    } else if (complexity > 0.62) {
      skillId = 'vortex';
      archAtk = 2; archDef = -4; archSpd = 2; archGrip = -5; archSpin = 9;
    } else {
      skillId = 'anchor';
      archAtk = -3; archDef = 6; archSpd = -4; archGrip = 7; archSpin = -3;
    }
  }

  const weight = Number(Math.max(1.4, 1.8 + density * 5.2 + complexity * 1.3 + (archDef > 0 ? 0.9 : -0.4)).toFixed(1));
  const atk = Math.max(3, Math.min(26, Math.round(7 + sharpness * 14 + complexity * 5 - density * 4 + archAtk + microVarA)));
  const def = Math.max(3, Math.min(26, Math.round(6 + density * 16 - sharpness * 5 + archDef - microVarA)));
  const spd = Math.max(3, Math.min(26, Math.round(8 + (1 - density) * 14 + sharpness * 4 - complexity * 3 + archSpd + microVarB)));
  const grip = Math.max(3, Math.min(26, Math.round(6 + density * 14 + (1 - Math.abs(aspect - 1) * 0.5) * 5 - sharpness * 4 + archGrip - microVarB)));
  const spin = Math.max(3, Math.min(26, Math.round(6 + complexity * 12 + Math.abs(aspect - 1) * 9 - density * 5 + archSpin + microVarA)));

  const result = {
    char,
    physW,
    physH,
    maxLocalRadius,
    shapeNodes: activeCollisionNodes,
    allShapeNodes: shapeNodes,
    boundarySegments,
    density,
    complexity,
    sharpness,
    weight,
    atk,
    def,
    spd,
    grip,
    spin,
    skillId
  };

  glyphAnalysisCache.set(cacheKey, result);
  return result;
}

// ============================================================================
// 4. RELAXED SHAPE-AWARE CONNECTION ENGINE (Free Overlap & Easy Linking)
// ============================================================================

/**
 * Returns the world/machine-space stroke nodes for a single glyph configuration `g`.
 */
function getGlyphTransformedNodes(g) {
  const info = analyzeGlyph(g.char, g.fontStyle || 'heavy');
  const sc = Math.max(0.50, Math.min(1.50, (g.scale || 105) / 100));
  const rad = ((g.angle || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = g.flipX ? -1 : 1;
  const sy = g.flipY ? -1 : 1;
  const gx = Number(g.x) || 0;
  const gy = Number(g.y) || 0;

  return info.shapeNodes.map(n => {
    const lx = n.lx * sx * sc;
    const ly = n.ly * sy * sc;
    return {
      x: gx + (lx * cos - ly * sin),
      y: gy + (lx * sin + ly * cos),
      r: n.r * sc
    };
  });
}

function getGlyphContactRadius(g) {
  const info = analyzeGlyph(g.char, g.fontStyle || 'heavy');
  const sc = Math.max(0.50, Math.min(1.50, (g.scale || 105) / 100));
  return Math.max(12, info.maxLocalRadius * sc);
}

/**
 * Computes the minimum stroke-to-stroke surface gap between two glyphs A and B,
 * along with the closest stroke points on A and B.
 * Negative gap means their strokes overlap; gap <= MAX_ALLOWED_GAP means they are connected!
 */
function measureStrokeBridgeBetweenGlyphs(gA, gB, cachedNodesA = null, cachedNodesB = null) {
  const nodesA = cachedNodesA || getGlyphTransformedNodes(gA);
  const nodesB = cachedNodesB || getGlyphTransformedNodes(gB);

  let minGap = Infinity;
  let bestA = { x: gA.x, y: gA.y, r: 4 };
  let bestB = { x: gB.x, y: gB.y, r: 4 };

  for (let i = 0; i < nodesA.length; i++) {
    const na = nodesA[i];
    for (let j = 0; j < nodesB.length; j++) {
      const nb = nodesB[j];
      const d = Math.hypot(nb.x - na.x, nb.y - na.y) - (na.r + nb.r);
      if (d < minGap) {
        minGap = d;
        bestA = na;
        bestB = nb;
      }
    }
  }

  return {
    gap: minGap,
    ax: bestA.x,
    ay: bestA.y,
    bx: bestB.x,
    by: bestB.y,
    midX: (bestA.x + bestB.x) * 0.5,
    midY: (bestA.y + bestB.y) * 0.5
  };
}

/**
 * Relaxed Machine Synthesis Constraint:
 * 1) Maximum of MAX_GLYPHS (5) characters.
 * 2) Characters can overlap as deeply as the player wants (no push-apart force!).
 * 3) Every character stays connected to the machine within a generous stroke-to-stroke tolerance
 *    (MAX_ALLOWED_GAP = 16px, so tips, diagonals, and close proximity all count as valid connection).
 * 4) Unselected characters are NEVER jostled when dragging a character, and recentering only happens
 *    when explicitly requested (e.g. clicking '重心整列').
 */
function enforceConnectedGlyphs(glyphs, activeGlyphId = null, recenter = false) {
  if (!Array.isArray(glyphs) || glyphs.length === 0) return [];

  while (glyphs.length > MAX_GLYPHS) {
    glyphs.pop();
  }
  glyphs.forEach(g => {
    g.char = extractFirstGrapheme(g.char);
    g.scale = Math.max(50, Math.min(150, Math.round(Number(g.scale) || 105)));
    g.x = Number.isFinite(g.x) ? Math.max(-115, Math.min(115, g.x)) : 0;
    g.y = Number.isFinite(g.y) ? Math.max(-115, Math.min(115, g.y)) : 0;
    g.angle = Number.isFinite(g.angle) ? g.angle : 0;
  });

  if (glyphs.length === 1) {
    if (recenter) {
      glyphs[0].x = 0;
      glyphs[0].y = 0;
    }
    return [];
  }

  const MAX_ALLOWED_GAP = 16; // Generous 16px stroke proximity allowance
  const SNAP_TARGET_GAP = 10; // Gentle pull target when dragged far away

  const n = glyphs.length;
  const nodesCache = glyphs.map(g => getGlyphTransformedNodes(g));
  const activeIdx = activeGlyphId ? glyphs.findIndex(g => g.id === activeGlyphId) : -1;

  // Anchor root is a stationary glyph when dragging activeIdx
  const rootIdx = (activeIdx === 0 && n > 1) ? 1 : 0;
  const inCluster = new Array(n).fill(false);
  inCluster[rootIdx] = true;
  let clusterCount = 1;

  while (clusterCount < n) {
    let bestOut = -1;
    let bestBridge = null;
    let bestGap = Infinity;

    for (let i = 0; i < n; i++) {
      if (inCluster[i]) continue;
      // Keep the actively dragged glyph for the final step so stationary glyphs form the base first
      if (i === activeIdx && clusterCount < n - 1) continue;

      for (let j = 0; j < n; j++) {
        if (!inCluster[j]) continue;
        const bridge = measureStrokeBridgeBetweenGlyphs(glyphs[i], glyphs[j], nodesCache[i], nodesCache[j]);
        if (bridge.gap < bestGap) {
          bestGap = bridge.gap;
          bestOut = i;
          bestBridge = bridge;
        }
      }
    }

    if (bestOut === -1) break;

    // Only pull gOut inward if its nearest stroke is further than MAX_ALLOWED_GAP from the cluster.
    // Overlapping (bestGap < 0) or touching/near (bestGap <= MAX_ALLOWED_GAP) is 100% allowed as-is!
    if (bestGap > MAX_ALLOWED_GAP && bestBridge) {
      const gOut = glyphs[bestOut];
      const dx = bestBridge.bx - bestBridge.ax; // vector from gOut's stroke to gIn's stroke
      const dy = bestBridge.by - bestBridge.ay;
      const dist = Math.hypot(dx, dy) || 1;
      const pullDist = bestGap - SNAP_TARGET_GAP;
      gOut.x = Math.round(Math.max(-115, Math.min(115, gOut.x + (dx / dist) * pullDist)));
      gOut.y = Math.round(Math.max(-115, Math.min(115, gOut.y + (dy / dist) * pullDist)));
      nodesCache[bestOut] = getGlyphTransformedNodes(gOut);
    }

    inCluster[bestOut] = true;
    clusterCount++;
  }

  // Optional recenter (only when user clicks '重心整列' or loads a fresh preset)
  if (recenter) {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += glyphs[i].x;
      sumY += glyphs[i].y;
    }
    const avgX = sumX / n;
    const avgY = sumY / n;
    for (let i = 0; i < n; i++) {
      glyphs[i].x = Math.round(Math.max(-115, Math.min(115, glyphs[i].x - avgX)));
      glyphs[i].y = Math.round(Math.max(-115, Math.min(115, glyphs[i].y - avgY)));
    }
  } else {
    for (let i = 0; i < n; i++) {
      glyphs[i].x = Math.round(Math.max(-115, Math.min(115, glyphs[i].x)));
      glyphs[i].y = Math.round(Math.max(-115, Math.min(115, glyphs[i].y)));
    }
  }

  return [];
}

// ============================================================================
// 5. PERSISTENT STATE & BUILD SPEC CALCULATOR (LocalStorage + Undo/Redo)
// ============================================================================
const STORAGE_KEY = 'KESHIBATO_NEO_GLYPH5_STATE_V3';

let glyphIdCounter = 1;
function makeGlyphId() {
  return 'glyph_' + (glyphIdCounter++) + '_' + Math.random().toString(36).slice(2, 6);
}

function cloneGlyphs(glyphs) {
  return glyphs.slice(0, MAX_GLYPHS).map(g => ({
    id: g.id || makeGlyphId(),
    char: extractFirstGrapheme(g.char),
    x: Math.round(Number(g.x) || 0),
    y: Math.round(Number(g.y) || 0),
    angle: Math.round(Number(g.angle) || 0),
    scale: Math.max(50, Math.min(150, Math.round(Number(g.scale) || 105))),
    mat: GLYPH_MATERIALS[g.mat] ? g.mat : 'mecha',
    color: g.color || '#38bdf8',
    depthColor: g.depthColor || '#0f172a',
    flipX: Boolean(g.flipX),
    flipY: Boolean(g.flipY)
  }));
}

function createBuildFromPreset(preset) {
  const glyphs = cloneGlyphs(preset.glyphs);
  enforceConnectedGlyphs(glyphs, null, true);
  return {
    name: preset.name,
    weldChassis: preset.weldChassis !== false,
    glyphs
  };
}

let savedSlots = PRESET_MACHINES.map(p => createBuildFromPreset(p));
let activeSlotIndex = 0;
let currentBuild = JSON.parse(JSON.stringify(savedSlots[0]));
let selectedGlyphId = currentBuild.glyphs[0]?.id || null;

// Defaults for newly added glyphs
let defaultNewMat = 'mecha';
let defaultNewColor = '#38bdf8';
let activePaletteCategory = 'attack';

// Undo / Redo Stacks for Craft Studio
const craftUndoStack = [];
const craftRedoStack = [];

function pushCraftUndo() {
  craftUndoStack.push(JSON.stringify(currentBuild));
  if (craftUndoStack.length > 35) craftUndoStack.shift();
  craftRedoStack.length = 0;
}

function saveStateToStorage() {
  try {
    savedSlots[activeSlotIndex] = JSON.parse(JSON.stringify(currentBuild));
    const payload = {
      savedSlots,
      activeSlotIndex
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Ignore storage quota errors
  }
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.savedSlots) && parsed.savedSlots.length >= 3) {
      savedSlots = parsed.savedSlots.map((slot, idx) => {
        if (!slot || !Array.isArray(slot.glyphs)) {
          return createBuildFromPreset(PRESET_MACHINES[idx % PRESET_MACHINES.length]);
        }
        const glyphs = cloneGlyphs(slot.glyphs);
        if (glyphs.length > 0) {
          enforceConnectedGlyphs(glyphs, null, false);
        }
        return {
          name: (slot.name || `文字機体 ${idx + 1}号機`).slice(0, 16),
          weldChassis: slot.weldChassis !== false,
          glyphs
        };
      });
      while (savedSlots.length < 5) {
        savedSlots.push(createBuildFromPreset(PRESET_MACHINES[savedSlots.length % PRESET_MACHINES.length]));
      }
      activeSlotIndex = Math.max(0, Math.min(savedSlots.length - 1, Number(parsed.activeSlotIndex) || 0));
      currentBuild = JSON.parse(JSON.stringify(savedSlots[activeSlotIndex]));
      selectedGlyphId = currentBuild.glyphs[0]?.id || null;
    }
  } catch (e) {
    // Fallback to defaults
  }
}

loadStateFromStorage();

/**
 * Computes aggregated physics specifications, true character-shape stroke colliders,
 * and active skill from the machine's constituent characters (1 to 5 glyphs).
 */
function calculateMachineSpec(build) {
  if (!build || !Array.isArray(build.glyphs) || build.glyphs.length === 0) {
    return {
      name: build?.name || '文字機体',
      weight: 0,
      boundingRadius: 16,
      comX: 0,
      comY: 0,
      subBoxes: [],
      atk: 0,
      def: 0,
      spd: 0,
      grip: 0,
      spin: 0,
      restitution: 0.5,
      friction: 0.90,
      knockbackResist: 1.0,
      maxLaunchSpeed: 10,
      buildType: isEn() ? 'UNDEPLOYABLE (0 GLYPHS)' : '未配置 (出撃不可)',
      activeSkill: {
        id: 'none',
        title: isEn() ? 'NONE' : 'なし',
        desc: isEn() ? 'Add at least 1 character glyph to compute specs and active skill.' : '文字を追加すると性能と必殺技が算出されます'
      },
      isEmpty: true
    };
  }

  const rawGlyphs = build.glyphs.slice(0, MAX_GLYPHS);

  const n = rawGlyphs.length;
  let totalWeight = 6.5; // Base core frame mass
  let weightedRestitution = 0;
  let weightSumForRest = 0;

  let comX = 0;
  let comY = 0;
  let totalGlyphMass = 0;

  const subBoxes = [];
  const skillScores = { slash: 0, buster: 0, boost: 0, vortex: 0, anchor: 0 };

  const partAtkList = [];
  const partDefList = [];
  const partSpdList = [];
  const partGripList = [];
  const partSpinList = [];

  rawGlyphs.forEach((g, idx) => {
    const info = analyzeGlyph(g.char, g.fontStyle || 'heavy');
    const mat = GLYPH_MATERIALS[g.mat] || GLYPH_MATERIALS.mecha;
    const scaleRatio = Math.max(0.50, Math.min(1.50, (g.scale || 105) / 100));

    const diminishing = 1 / Math.pow(idx + 1, 0.14);
    const gMass = info.weight * mat.weightMul * Math.pow(scaleRatio, 1.15) * diminishing;

    totalWeight += gMass;
    totalGlyphMass += gMass;
    comX += g.x * gMass;
    comY += g.y * gMass;

    // Formation position multipliers: where you place a character shapes its role!
    const frontFactor = g.y < -14 ? 1.28 : g.y > 14 ? 0.88 : 1.0;
    const rearFactor = g.y > 14 ? 1.26 : g.y < -14 ? 0.90 : 1.0;
    const radialDist = Math.hypot(g.x, g.y);
    const outerSpinFactor = radialDist > 22 ? 1.30 : 0.86;
    const compactCoreFactor = radialDist <= 18 ? 1.22 : 0.90;

    // Scale trade-off: bigger characters hit harder & defend better, smaller characters are nimbler
    const sizeHeavyMod = Math.pow(scaleRatio, 0.45);
    const sizeLightMod = Math.pow(1 / scaleRatio, 0.40);

    partAtkList.push(info.atk * mat.atkMul * sizeHeavyMod * frontFactor);
    partDefList.push(info.def * mat.defMul * sizeHeavyMod * compactCoreFactor);
    partSpdList.push(info.spd * mat.spdMul * sizeLightMod * rearFactor);
    partGripList.push(info.grip * mat.gripMul * sizeHeavyMod * compactCoreFactor);
    partSpinList.push(info.spin * (mat.spinMul || 1.0) * outerSpinFactor);

    weightedRestitution += mat.restitution * gMass;
    weightSumForRest += gMass;

    skillScores[info.skillId] = (skillScores[info.skillId] || 0) + gMass * (idx === 0 ? 1.35 : 1.0);

    const w = info.physW * scaleRatio;
    const h = info.physH * scaleRatio;
    subBoxes.push({
      id: g.id || `sub_${idx}`,
      char: info.char,
      localX: g.x,
      localY: g.y,
      w,
      h,
      maxLocalRadius: info.maxLocalRadius * scaleRatio,
      shapeNodes: info.shapeNodes,
      allShapeNodes: info.allShapeNodes,
      boundarySegments: info.boundarySegments,
      localAngle: ((g.angle || 0) * Math.PI) / 180,
      scaleRatio,
      matId: mat.id,
      color: g.color || mat.defaultColor,
      depthColor: g.depthColor || mat.defaultDepth,
      strokeColor: mat.strokeColor,
      flipX: Boolean(g.flipX),
      flipY: Boolean(g.flipY),
      sharpness: info.sharpness,
      restitution: mat.restitution,
      fontStyle: g.fontStyle || 'heavy'
    });
  });

  if (totalGlyphMass > 0) {
    comX /= totalGlyphMass;
    comY /= totalGlyphMass;
  }

  // Recenter subBoxes around Center of Mass and compute true stroke bounding radius
  let maxRadius = 20;
  subBoxes.forEach(sb => {
    sb.relX = sb.localX - comX;
    sb.relY = sb.localY - comY;
    const reach = Math.hypot(sb.relX, sb.relY) + sb.maxLocalRadius;
    if (reach > maxRadius) maxRadius = reach;
  });

  // Helper: combine average + peak specialty so stats don't bloat just by adding 5 characters
  const aggregateStat = arr => {
    const sorted = [...arr].sort((a, b) => b - a);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const peak = sorted.length >= 2 ? (sorted[0] * 0.60 + sorted[1] * 0.40) : sorted[0];
    return avg * 0.62 + peak * 0.38;
  };

  const baseAtk = 12 + aggregateStat(partAtkList) * 1.55;
  const baseDef = 12 + aggregateStat(partDefList) * 1.55;
  const baseSpd = 14 + aggregateStat(partSpdList) * 1.62;
  const baseGrip = 12 + aggregateStat(partGripList) * 1.55;
  const baseSpin = 12 + aggregateStat(partSpinList) * 1.62;

  // Cross-stat trade-offs to create spiky, distinct, non-capped stat profiles (デコボコな個性)
  const weightDelta = totalWeight - 28.0; // Positive = heavy, Negative = light
  const rawAtkFinal = baseAtk + (baseSpin > 58 ? 4 : 0) - (baseGrip > 62 ? 6 : 0);
  const rawDefFinal = baseDef + weightDelta * 0.75 - (baseSpd > 62 ? 8 : 0) - (baseAtk > 68 ? 5 : 0);
  const rawSpdFinal = baseSpd - weightDelta * 0.92 - (baseDef > 64 ? 8 : 0);
  const rawGripFinal = baseGrip + weightDelta * 0.68 - (baseSpin > 60 ? 8 : 0) - (baseSpd > 64 ? 6 : 0);
  const rawSpinFinal = baseSpin + (maxRadius - 44) * 0.35 - (baseGrip > 62 ? 8 : 0);

  const clampStat = v => Math.min(96, Math.max(15, Math.round(v)));
  const atk = clampStat(rawAtkFinal);
  const def = clampStat(rawDefFinal);
  const spd = clampStat(rawSpdFinal);
  const grip = clampStat(rawGripFinal);
  const spin = clampStat(rawSpinFinal);

  let bestSkillId = 'slash';
  let bestSkillScore = -1;
  for (const [k, score] of Object.entries(skillScores)) {
    if (score > bestSkillScore) {
      bestSkillScore = score;
      bestSkillId = k;
    }
  }
  const activeSkill = GLYPH_SKILLS[bestSkillId] || GLYPH_SKILLS.slash;

  // Expressive build type classification based on the machine's dominant peak and weakness
  const statPairs = [
    { key: 'atk', val: atk, label: isEn() ? 'BLADE STRIKER' : '撃滅ブレード特化' },
    { key: 'def', val: def, label: isEn() ? 'IRON TANK' : '重装鉄壁タンク' },
    { key: 'spd', val: spd, label: isEn() ? 'SONIC SPEEDSTER' : '超音速ストライカー' },
    { key: 'grip', val: grip, label: isEn() ? 'HIGH-GRIP FORTRESS' : '高グリップ不動要塞' },
    { key: 'spin', val: spin, label: isEn() ? 'TORNADO SPINNER' : '超回転トルネード型' }
  ].sort((a, b) => b.val - a.val);

  let buildType = statPairs[0].label;
  if (statPairs[0].val - statPairs[4].val < 18) {
    buildType = isEn() ? 'ALL-ROUND BALANCER' : '万能バランス型';
  } else if (statPairs[0].key === 'atk' && statPairs[1].key === 'spd' && statPairs[1].val >= 65) {
    buildType = isEn() ? 'BLITZ SLASHER' : '高速斬撃アタッカー';
  } else if (statPairs[0].key === 'atk' && statPairs[1].key === 'def' && statPairs[1].val >= 62) {
    buildType = isEn() ? 'HEAVY BUSTER' : '重撃バスター型';
  } else if (statPairs[0].key === 'def' && statPairs[1].key === 'grip' && statPairs[1].val >= 62) {
    buildType = isEn() ? 'ANCHOR FORTRESS' : '不沈アンカー要塞';
  } else if (statPairs[0].key === 'spin' && statPairs[1].key === 'atk' && statPairs[1].val >= 62) {
    buildType = isEn() ? 'STORM SHURIKEN' : '暴風シュリケン型';
  }

  // Physics constants: Balanced for tactile eraser friction + responsive launch
  const friction = 0.970 - (grip - 45) * 0.00036;
  const maxLaunchSpeed = 16.5 + (spd - 45) * 0.135;
  const restitution = (weightSumForRest > 0 ? weightedRestitution / weightSumForRest : 0.88) + (atk - 50) * 0.0034;
  const knockbackResist = 1 + (totalWeight - 18) * 0.028 + (def - 50) * 0.0075;

  return {
    name: build?.name || '名無しの文字機体',
    weldChassis: build?.weldChassis !== false,
    glyphCount: n,
    weight: Number(totalWeight.toFixed(1)),
    atk,
    def,
    spd,
    grip,
    spin,
    buildType,
    activeSkill,
    comX,
    comY,
    boundingRadius: Math.min(96, Math.max(20, maxRadius)),
    subBoxes,
    friction: Math.min(0.980, Math.max(0.942, friction)),
    maxLaunchSpeed: Math.min(24.5, Math.max(12.5, maxLaunchSpeed)),
    restitution: Math.min(1.12, Math.max(0.74, restitution)),
    knockbackResist: Math.max(0.62, knockbackResist)
  };
}

// ============================================================================
// 6. 2.5D GLYPH MECHA RENDERER (With True Character-Shape Hitbox Contour)
// ============================================================================

function drawEraserMachine(ctx, x, y, angle, build, options = {}) {
  const spec = options.cachedSpec || calculateMachineSpec(build);
  const scale = options.scale || 1.0;
  const isBlueprint = Boolean(options.isBlueprint);
  const showShapeHitbox = Boolean(options.showShapeHitbox || options.isBlueprint);
  const highlightGlyphId = options.highlightGlyphId || null;
  const useRawOrigin = Boolean(options.useRawOrigin);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Drop shadow under entire machine
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.beginPath();
  ctx.ellipse(3, 5, spec.boundingRadius * 0.65, spec.boundingRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Energy Weld Rings at nearest stroke contact points between adjacent characters
  if (spec.weldChassis && spec.subBoxes.length > 1) {
    ctx.save();
    for (let i = 0; i < spec.subBoxes.length; i++) {
      for (let j = i + 1; j < spec.subBoxes.length; j++) {
        const a = spec.subBoxes[i];
        const b = spec.subBoxes[j];
        const ax = useRawOrigin ? a.localX : a.relX;
        const ay = useRawOrigin ? a.localY : a.relY;
        const bx = useRawOrigin ? b.localX : b.relX;
        const by = useRawOrigin ? b.localY : b.relY;

        const rSum = a.maxLocalRadius + b.maxLocalRadius;
        const dist = Math.hypot(bx - ax, by - ay);

        if (dist <= rSum + 18) {
          const t = a.maxLocalRadius / Math.max(1, rSum);
          const wx = ax + (bx - ax) * t;
          const wy = ay + (by - ay) * t;

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.beginPath();
          ctx.arc(wx, wy, 6.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(wx, wy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // Render each character layer in order (2.5D Extruded Block Typography)
  spec.subBoxes.forEach(sb => {
    const gx = useRawOrigin ? sb.localX : sb.relX;
    const gy = useRawOrigin ? sb.localY : sb.relY;

    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(sb.localAngle);

    const sx = sb.flipX ? -1 : 1;
    const sy = sb.flipY ? -1 : 1;
    ctx.scale(sx, sy);

    const fontPx = Math.round(35 * sb.scaleRatio);
    const fontObj = GLYPH_FONTS[sb.fontStyle] || GLYPH_FONTS.heavy;
    ctx.font = `${fontObj.weight} ${fontPx}px ${fontObj.cssFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. 3D Extruded Depth Layers with Machine-Finished Bevel Shadow
    const depthSteps = 4;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    for (let d = depthSteps; d >= 1; d--) {
      const dx = (d * 1.15) * sx;
      const dy = (d * 1.55) * sy;
      
      // Dynamic shaded extrusion
      ctx.fillStyle = sb.depthColor || '#0c1018';
      ctx.strokeStyle = sb.depthColor || '#0c1018';
      ctx.lineWidth = Math.max(4.2, fontPx * 0.17);
      ctx.strokeText(sb.char, dx, dy);
      ctx.fillText(sb.char, dx, dy);
    }

    // 2. Tactical Chassis Outline & Precision Edge
    const mat = GLYPH_MATERIALS[sb.matId] || GLYPH_MATERIALS.mecha;
    const baseCol = sb.color || mat.defaultColor || '#38bdf8';
    const isMatChrome = sb.matId === 'chrome';
    const isMatTitanium = sb.matId === 'titanium';
    const isMatDamascus = sb.matId === 'damascus';
    const isMatBrass = sb.matId === 'brass';
    const isMatGold = sb.matId === 'gold';
    const isMatBlade = sb.matId === 'blade';
    const isMatNeon = sb.matId === 'neon';

    const brightness = getHexBrightness(baseCol);
    let outlineCol;
    if (isMatNeon) {
      outlineCol = baseCol;
    } else if (isMatChrome || isMatTitanium) {
      outlineCol = lightenHex(baseCol, 45);
    } else if (isMatGold || isMatBrass) {
      outlineCol = lightenHex(baseCol, 38);
    } else if (isMatBlade) {
      outlineCol = lightenHex(baseCol, 40);
    } else {
      outlineCol = brightness < 45 ? lightenHex(baseCol, 35) : '#0f172a';
    }
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = Math.max(4.5, fontPx * 0.19);
    ctx.strokeText(sb.char, 0, 0);

    // 3. Multi-Material Procedural Shader Fill (Diverse Materials + User Custom Surface Color)
    const grad = ctx.createLinearGradient(-fontPx * 0.35, -fontPx * 0.45, fontPx * 0.35, fontPx * 0.45);
    const mId = sb.matId || 'eraser';

    if (mId === 'eraser') {
      // 1. Eraser: Smooth matte texture with soft bevel lighting
      grad.addColorStop(0, lightenHex(baseCol, 36));
      grad.addColorStop(0.40, lightenHex(baseCol, 12));
      grad.addColorStop(0.70, baseCol);
      grad.addColorStop(1, darkenHex(baseCol, 24));
    } else if (mId === 'wood') {
      // 2. Natural Wood: Realistic grain striations modulated by surface color
      grad.addColorStop(0, lightenHex(baseCol, 30));
      grad.addColorStop(0.24, baseCol);
      grad.addColorStop(0.48, darkenHex(baseCol, 26));
      grad.addColorStop(0.74, lightenHex(baseCol, 10));
      grad.addColorStop(1, darkenHex(baseCol, 42));
    } else if (mId === 'glass' || mId === 'chrome' || mId === 'neon') {
      // 3. Crystal Glass & Reflective: Brilliant specular catchlight and deep luster
      grad.addColorStop(0, lightenHex(baseCol, 65));
      grad.addColorStop(0.20, lightenHex(baseCol, 35));
      grad.addColorStop(0.50, baseCol);
      grad.addColorStop(0.72, darkenHex(baseCol, 18));
      grad.addColorStop(0.86, lightenHex(baseCol, 38));
      grad.addColorStop(1, lightenHex(baseCol, 60));
    } else if (mId === 'stone') {
      // 4. Granite & Basalt Rock: Heavy mineral matte finish
      grad.addColorStop(0, lightenHex(baseCol, 24));
      grad.addColorStop(0.30, baseCol);
      grad.addColorStop(0.60, darkenHex(baseCol, 22));
      grad.addColorStop(0.80, darkenHex(baseCol, 36));
      grad.addColorStop(1, darkenHex(baseCol, 18));
    } else if (mId === 'slime') {
      // 5. Viscous Slime Gel: Translucent core illumination
      grad.addColorStop(0, lightenHex(baseCol, 48));
      grad.addColorStop(0.35, lightenHex(baseCol, 22));
      grad.addColorStop(0.68, baseCol);
      grad.addColorStop(1, darkenHex(baseCol, 20));
    } else if (mId === 'rubber') {
      // 6. Matte Elastomer Tire Rubber: High-density friction texture
      grad.addColorStop(0, lightenHex(baseCol, 20));
      grad.addColorStop(0.45, baseCol);
      grad.addColorStop(1, darkenHex(baseCol, 36));
    } else if (mId === 'blade' || mId === 'damascus') {
      // 7. Tempered Blade Steel: High-contrast razor edge bevel
      grad.addColorStop(0, lightenHex(baseCol, 52));
      grad.addColorStop(0.26, baseCol);
      grad.addColorStop(0.50, darkenHex(baseCol, 42));
      grad.addColorStop(0.76, darkenHex(baseCol, 16));
      grad.addColorStop(1, lightenHex(baseCol, 28));
    } else if (mId === 'gold' || mId === 'brass') {
      // 8. Solid Gold / Brass: Rich reflective metallic gleam
      grad.addColorStop(0, lightenHex(baseCol, 48));
      grad.addColorStop(0.22, lightenHex(baseCol, 24));
      grad.addColorStop(0.48, baseCol);
      grad.addColorStop(0.54, darkenHex(baseCol, 36));
      grad.addColorStop(0.80, lightenHex(baseCol, 26));
      grad.addColorStop(1, baseCol);
    } else {
      // 9. Titanium Alloy & Advanced Composites: Precision machined aerospace sheen
      grad.addColorStop(0, lightenHex(baseCol, 42));
      grad.addColorStop(0.25, lightenHex(baseCol, 16));
      grad.addColorStop(0.48, baseCol);
      grad.addColorStop(0.56, darkenHex(baseCol, 26));
      grad.addColorStop(0.80, lightenHex(baseCol, 12));
      grad.addColorStop(1, darkenHex(baseCol, 18));
    }

    ctx.fillStyle = grad;
    ctx.fillText(sb.char, 0, 0);

    // 4. Crisp Top-Left Specular Rim Light (Metal Bevel Catchlight)
    ctx.strokeStyle = isMatChrome || isMatTitanium
      ? 'rgba(255, 255, 255, 0.85)'
      : isMatDamascus
      ? 'rgba(203, 213, 225, 0.65)'
      : 'rgba(255, 255, 255, 0.60)';
    ctx.lineWidth = Math.max(1.3, fontPx * 0.042);
    ctx.strokeText(sb.char, -0.6 * sx, -0.9 * sy);

    // 5. True Character-Shape Hitbox Contour Overlay (hugging actual strokes, notches, & spikes)
    if (showShapeHitbox && sb.boundarySegments) {
      const isSelected = Boolean(highlightGlyphId && sb.id === highlightGlyphId);
      ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.92)' : 'rgba(52, 211, 153, 0.58)';
      ctx.lineWidth = isSelected ? 1.35 : 0.95;
      ctx.beginPath();
      const sc = sb.scaleRatio;
      for (let k = 0; k < sb.boundarySegments.length; k++) {
        const seg = sb.boundarySegments[k];
        ctx.moveTo(seg.x1 * sc, seg.y1 * sc);
        ctx.lineTo(seg.x2 * sc, seg.y2 * sc);
      }
      ctx.stroke();
    }

    ctx.restore();

    // Blueprint Selection & Transform Gizmo Handles (when selected in editor)
    if (isBlueprint && highlightGlyphId && sb.id === highlightGlyphId) {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(sb.localAngle);

      const hw = sb.w * 0.5 + 5;
      const hh = sb.h * 0.5 + 5;

      // Subtle guide frame connecting the rotation & scale handles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
      ctx.setLineDash([]);

      // Rotation handle stem (top)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(0, -hh - 15);
      ctx.stroke();

      // Rotation handle knob
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -hh - 17, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Scale handle knob (bottom-right)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.rect(hw - 5.5, hh - 5.5, 11, 11);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  });

  // Blueprint Center of Mass Crosshair
  if (isBlueprint) {
    const cx = useRawOrigin ? spec.comX : 0;
    const cy = useRawOrigin ? spec.comY : 0;
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function getHexBrightness(hex) {
  const num = parseInt((hex || '#38bdf8').replace('#', ''), 16) || 0x38bdf8;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function lightenHex(hex, percent) {
  const num = parseInt((hex || '#38bdf8').replace('#', ''), 16) || 0x38bdf8;
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenHex(hex, percent) {
  const num = parseInt((hex || '#38bdf8').replace('#', ''), 16) || 0x38bdf8;
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// 7. PIXEL-ACCURATE CHARACTER-SHAPE COLLISION DETECTOR (Stroke-Node Mesh)
// ============================================================================

/**
 * Transforms all character stroke collision nodes of `unit` into world coordinates.
 * Every node corresponds to an actual inked stroke segment of a character.
 */
function getWorldShapeColliders(unit, scaleMod = 0.90) {
  const spec = unit.spec;
  const cosU = Math.cos(unit.angle);
  const sinU = Math.sin(unit.angle);

  return spec.subBoxes.map(sb => {
    const rx = sb.relX * scaleMod;
    const ry = sb.relY * scaleMod;
    const wx = unit.x + (rx * cosU - ry * sinU);
    const wy = unit.y + (rx * sinU + ry * cosU);
    const wAngle = unit.angle + sb.localAngle;
    const c = Math.cos(wAngle);
    const s = Math.sin(wAngle);
    const sx = sb.flipX ? -1 : 1;
    const sy = sb.flipY ? -1 : 1;
    const sc = sb.scaleRatio * scaleMod;

    const worldNodes = sb.shapeNodes.map(n => {
      const lx = n.lx * sx * sc;
      const ly = n.ly * sy * sc;
      return {
        x: wx + (lx * c - ly * s),
        y: wy + (lx * s + ly * c),
        r: n.r * sc,
        sharpness: n.sharpness
      };
    });

    return {
      cx: wx,
      cy: wy,
      boundR: sb.maxLocalRadius * scaleMod + 3,
      sharpness: sb.sharpness,
      restitution: sb.restitution,
      worldNodes
    };
  });
}

/**
 * Detects collision between two machines using their actual character stroke shapes!
 * Empty areas around/inside characters ('▲', 'V', '十', '★', '凹', 'L', etc.) do NOT collide.
 */
function detectCompoundCollision(unitA, unitB, scaleMod = 0.90) {
  const dx = unitB.x - unitA.x;
  const dy = unitB.y - unitA.y;
  const maxR = (unitA.spec.boundingRadius + unitB.spec.boundingRadius) * scaleMod + 8;
  if (dx * dx + dy * dy > maxR * maxR) return null;

  const shapesA = getWorldShapeColliders(unitA, scaleMod);
  const shapesB = getWorldShapeColliders(unitB, scaleMod);

  let maxOverlap = 0;
  let sumNx = 0;
  let sumNy = 0;
  let sumCx = 0;
  let sumCy = 0;
  let weightSum = 0;
  let bestSharpnessSum = 0.4;

  for (let i = 0; i < shapesA.length; i++) {
    const sA = shapesA[i];
    for (let j = 0; j < shapesB.length; j++) {
      const sB = shapesB[j];
      const cdx = sB.cx - sA.cx;
      const cdy = sB.cy - sA.cy;
      const cMax = sA.boundR + sB.boundR;
      if (cdx * cdx + cdy * cdy > cMax * cMax) continue;

      const nodesA = sA.worldNodes;
      const nodesB = sB.worldNodes;

      for (let naIdx = 0; naIdx < nodesA.length; naIdx++) {
        const na = nodesA[naIdx];
        for (let nbIdx = 0; nbIdx < nodesB.length; nbIdx++) {
          const nb = nodesB[nbIdx];
          const ndx = nb.x - na.x;
          const ndy = nb.y - na.y;
          const rSum = na.r + nb.r;
          const dSq = ndx * ndx + ndy * ndy;

          if (dSq < rSum * rSum) {
            const d = Math.sqrt(dSq);
            const overlap = rSum - d;
            let nx, ny;
            if (d > 0.001) {
              nx = ndx / d;
              ny = ndy / d;
            } else {
              const fallbackD = Math.hypot(unitB.x - unitA.x, unitB.y - unitA.y) || 1;
              nx = (unitB.x - unitA.x) / fallbackD;
              ny = (unitB.y - unitA.y) / fallbackD;
            }

            const w = overlap * overlap + 0.05;
            sumNx += nx * w;
            sumNy += ny * w;
            sumCx += ((na.x + nb.x) * 0.5) * w;
            sumCy += ((na.y + nb.y) * 0.5) * w;
            weightSum += w;

            if (overlap > maxOverlap) {
              maxOverlap = overlap;
            }
            const pairSharp = (na.sharpness || sA.sharpness || 0.3) + (nb.sharpness || sB.sharpness || 0.3);
            if (pairSharp > bestSharpnessSum) {
              bestSharpnessSum = pairSharp;
            }
          }
        }
      }
    }
  }

  if (weightSum <= 0 || maxOverlap <= 0) return null;

  let nx = sumNx / weightSum;
  let ny = sumNy / weightSum;
  const nLen = Math.hypot(nx, ny);
  if (nLen > 0.001) {
    nx /= nLen;
    ny /= nLen;
  } else {
    const d = Math.hypot(dx, dy) || 1;
    nx = dx / d;
    ny = dy / d;
  }

  // Ensure normal points generally from unitA to unitB
  if (dx * nx + dy * ny < 0 && maxOverlap > 3.5) {
    // Keep local stroke normal unless deeply inverted
    const d = Math.hypot(dx, dy) || 1;
    nx = nx * 0.5 + (dx / d) * 0.5;
    ny = ny * 0.5 + (dy / d) * 0.5;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
  }

  return {
    overlap: maxOverlap,
    nx,
    ny,
    contactX: sumCx / weightSum,
    contactY: sumCy / weightSum,
    sharpnessSum: bestSharpnessSum
  };
}

// ============================================================================
// 8. CRAFT WORKBENCH & LIVE TEST RANGE CONTROLLER
// ============================================================================

const craftCanvas = document.getElementById('craftCanvas');
const craftCtx = craftCanvas.getContext('2d');
let workbenchMode = 'edit'; // 'edit' | 'test'

// Blueprint Editor Drag State
let editorDragMode = null; // 'move' | 'rotate' | 'scale' | null
let editorDragStartMouse = { x: 0, y: 0 };
let editorDragInitialGlyph = null;

// Test Range Physics State
let testPlayerUnit = null;
let testDummies = [];
let testParticles = [];
let testSlingshot = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };

function resizeCraftCanvas() {
  const wrap = document.getElementById('workbenchCanvasWrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  craftCanvas.width = Math.max(300, Math.floor(rect.width));
  craftCanvas.height = Math.max(240, Math.floor(rect.height));
}

function getSelectedGlyph() {
  if (!currentBuild.glyphs.length) return null;
  let found = currentBuild.glyphs.find(g => g.id === selectedGlyphId);
  if (!found) {
    selectedGlyphId = currentBuild.glyphs[0].id;
    found = currentBuild.glyphs[0];
  }
  return found;
}

/**
 * Finds the best outer contact spot around the existing connected machine for a newly added character.
 */
function findBestAttachmentPosition(existingGlyphs, newChar, newScale = 105, preferredSide = 0) {
  if (!existingGlyphs.length) return { x: 0, y: 0 };
  const tempNew = { char: newChar, scale: newScale, x: 0, y: 0 };
  const rNew = getGlyphContactRadius(tempNew);

  // Candidate directions around the first or currently selected glyph
  const anchor = existingGlyphs.find(g => g.id === selectedGlyphId) || existingGlyphs[0];
  const rAnchor = getGlyphContactRadius(anchor);
  const targetDist = (rAnchor + rNew) * 0.80;

  const candidateAngles = preferredSide !== 0
    ? [preferredSide > 0 ? 0 : Math.PI, -Math.PI / 2, Math.PI / 2, preferredSide > 0 ? -Math.PI / 4 : -3 * Math.PI / 4]
    : [-Math.PI / 2, Math.PI / 2, -Math.PI * 0.78, -Math.PI * 0.22, Math.PI * 0.78, Math.PI * 0.22, Math.PI, 0];

  let bestPos = { x: anchor.x, y: anchor.y - targetDist };
  let bestClearance = -Infinity;

  for (const ang of candidateAngles) {
    const cx = anchor.x + Math.cos(ang) * targetDist;
    const cy = anchor.y + Math.sin(ang) * targetDist;
    let minOtherDist = Infinity;
    for (const g of existingGlyphs) {
      const d = Math.hypot(cx - g.x, cy - g.y) - getGlyphContactRadius(g);
      if (d < minOtherDist) minOtherDist = d;
    }
    if (minOtherDist > bestClearance) {
      bestClearance = minOtherDist;
      bestPos = { x: Math.round(cx), y: Math.round(cy) };
    }
  }
  return bestPos;
}

/**
 * Replaces the currently selected glyph's character (used when at 5/5 limit or clicking Replace).
 */
function replaceSelectedGlyphChar(rawChar) {
  const g = getSelectedGlyph();
  if (!g) return;
  const ch = extractFirstGrapheme(rawChar);
  pushCraftUndo();
  g.char = ch;
  g.mat = defaultNewMat;
  g.color = defaultNewColor;
  g.depthColor = (GLYPH_MATERIALS[defaultNewMat] || GLYPH_MATERIALS.mecha).defaultDepth;
  enforceConnectedGlyphs(currentBuild.glyphs, g.id, true);
  sfx.playEquip();
  activeCraftSubTab = 'tune'; // Open transformer & appearance for the newly added character!
  saveStateToStorage();
  updateCraftUI();
  if (workbenchMode === 'test') initTestRange();
}

function addCharacterToBuild(rawString, useMirrorPair = false, autoReplaceWhenFull = false) {
  const chars = Array.from((rawString || '').trim()).filter(c => c.trim().length > 0);
  if (!chars.length) return;

  // If already at 5 characters:
  if (currentBuild.glyphs.length >= MAX_GLYPHS) {
    if (autoReplaceWhenFull) {
      replaceSelectedGlyphChar(chars[0]);
      showBattleToast(`5文字上限: 選択中の文字を『${chars[0]}』に置換しました`);
      return;
    }
    showBattleToast(`最大${MAX_GLYPHS}文字までです（「選択文字を置換」で入れ替え可能）`);
    return;
  }

  pushCraftUndo();
  const matObj = GLYPH_MATERIALS[defaultNewMat] || GLYPH_MATERIALS.mecha;

  chars.forEach(ch => {
    if (currentBuild.glyphs.length >= MAX_GLYPHS) return;

    if (useMirrorPair && currentBuild.glyphs.length <= MAX_GLYPHS - 2) {
      const leftPos = findBestAttachmentPosition(currentBuild.glyphs, ch, 105, -1);
      const leftGlyph = {
        id: makeGlyphId(),
        char: ch,
        x: -Math.max(22, Math.abs(leftPos.x)),
        y: leftPos.y,
        angle: -15,
        scale: 105,
        mat: defaultNewMat,
        fontStyle: defaultSelectedFont || 'heavy',
        color: defaultNewColor,
        depthColor: matObj.defaultDepth,
        flipX: false,
        flipY: false
      };
      const rightGlyph = {
        id: makeGlyphId(),
        char: ch,
        x: Math.max(22, Math.abs(leftPos.x)),
        y: leftPos.y,
        angle: 15,
        scale: 105,
        mat: defaultNewMat,
        fontStyle: defaultSelectedFont || 'heavy',
        color: defaultNewColor,
        depthColor: matObj.defaultDepth,
        flipX: true,
        flipY: false
      };
      currentBuild.glyphs.push(leftGlyph, rightGlyph);
      selectedGlyphId = rightGlyph.id;
    } else {
      const pos = findBestAttachmentPosition(currentBuild.glyphs, ch, 108, 0);
      const newG = {
        id: makeGlyphId(),
        char: ch,
        x: pos.x,
        y: pos.y,
        angle: 0,
        scale: 108,
        mat: defaultNewMat,
        fontStyle: defaultSelectedFont || 'heavy',
        color: defaultNewColor,
        depthColor: matObj.defaultDepth,
        flipX: false,
        flipY: false
      };
      currentBuild.glyphs.push(newG);
      selectedGlyphId = newG.id;
    }
  });

  // Enforce connected touching constraint across all glyphs
  enforceConnectedGlyphs(currentBuild.glyphs, selectedGlyphId, true);

  sfx.playEquip();
  saveStateToStorage();
  updateCraftUI();
  if (workbenchMode === 'test') initTestRange();
}

function buildMachineFromWord(wordStr) {
  const chars = Array.from((wordStr || '').trim()).filter(c => c.trim().length > 0).slice(0, MAX_GLYPHS);
  if (!chars.length) return;

  pushCraftUndo();
  const matKeys = ['mecha', 'blade', 'neon', 'gold', 'rubber'];
  const newGlyphs = [];

  // Tightly connected formation templates for 1..5 characters
  const slotCoords = [
    { x: 0,   y: 0,   angle: 0,   scale: 120 }, // #0 Core
    { x: 0,   y: -34, angle: 0,   scale: 108 }, // #1 Front Vanguard
    { x: -32, y: -2,  angle: -16, scale: 106 }, // #2 Left Wing
    { x: 32,  y: -2,  angle: 16,  scale: 106 }, // #3 Right Wing
    { x: 0,   y: 34,  angle: 0,   scale: 108 }  // #4 Rear Thruster
  ];

  chars.forEach((ch, idx) => {
    const coord = slotCoords[idx] || { x: 0, y: 0, angle: 0, scale: 105 };
    const matKey = matKeys[idx % matKeys.length];
    const mat = GLYPH_MATERIALS[matKey];

    newGlyphs.push({
      id: makeGlyphId(),
      char: ch,
      x: coord.x,
      y: coord.y,
      angle: coord.angle,
      scale: coord.scale,
      mat: matKey,
      color: mat.defaultColor,
      depthColor: mat.defaultDepth,
      flipX: false,
      flipY: false
    });
  });

  enforceConnectedGlyphs(newGlyphs, null, true);

  currentBuild.name = `${chars.join('')}号`;
  currentBuild.glyphs = newGlyphs;
  selectedGlyphId = newGlyphs[0].id;

  sfx.playEquip();
  saveStateToStorage();
  updateCraftUI();
  if (workbenchMode === 'test') initTestRange();
}

function generateRandomGlyphMachine() {
  pushCraftUndo();
  const cores = ['龍', '覇', '神', '轟', '渦', '帝', '魔', '鋼'];
  const fronts = ['▲', 'V', '剣', '突', '槍', '★', '◆', '牙'];
  const wings = ['翼', '刃', '刀', '閃', '雷', '炎', '爪', '盾'];
  const rears = ['噴', '轟', '爆', '風', '電', '推進', '王', '鎧'];

  const coreChar = cores[Math.floor(Math.random() * cores.length)];
  const frontChar = fronts[Math.floor(Math.random() * fronts.length)];
  const wingChar = wings[Math.floor(Math.random() * wings.length)];
  const rearChar = rears[Math.floor(Math.random() * rears.length)];

  const colors = ['#38bdf8', '#ef4444', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#f8fafc'];
  const cMain = colors[Math.floor(Math.random() * colors.length)];
  const cSub = colors[Math.floor(Math.random() * colors.length)];

  const newGlyphs = [
    { id: makeGlyphId(), char: coreChar,  x: 0,   y: 0,   angle: 0,   scale: 120, mat: 'mecha', color: cMain,     depthColor: '#0f172a', flipX: false, flipY: false },
    { id: makeGlyphId(), char: frontChar, x: 0,   y: -34, angle: 0,   scale: 108, mat: 'blade', color: '#ef4444', depthColor: '#450a0a', flipX: false, flipY: false },
    { id: makeGlyphId(), char: wingChar,  x: -32, y: -3,  angle: -20, scale: 106, mat: 'neon',  color: cSub,      depthColor: '#0f172a', flipX: false, flipY: false },
    { id: makeGlyphId(), char: wingChar,  x: 32,  y: -3,  angle: 20,  scale: 106, mat: 'neon',  color: cSub,      depthColor: '#0f172a', flipX: true,  flipY: false },
    { id: makeGlyphId(), char: rearChar,  x: 0,   y: 34,  angle: 0,   scale: 108, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03', flipX: false, flipY: false }
  ];

  enforceConnectedGlyphs(newGlyphs, null, true);

  currentBuild.name = `真・${coreChar}${wingChar}${frontChar}号`;
  currentBuild.weldChassis = true;
  currentBuild.glyphs = newGlyphs;
  selectedGlyphId = newGlyphs[0].id;

  sfx.playEquip();
  saveStateToStorage();
  updateCraftUI();
  if (workbenchMode === 'test') initTestRange();
}

function initTestRange() {
  const w = craftCanvas.width || 680;
  const h = craftCanvas.height || 440;
  const spec = calculateMachineSpec(currentBuild);

  testPlayerUnit = {
    x: w * 0.5,
    y: h * 0.72,
    vx: 0,
    vy: 0,
    angle: 0,
    angVel: 0,
    build: currentBuild,
    spec,
    skillReady: true
  };

  const dummyPreset1 = PRESET_MACHINES[1];
  const dummyPreset2 = PRESET_MACHINES[3];
  testDummies = [
    {
      x: w * 0.34,
      y: h * 0.28,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      angVel: 0,
      build: dummyPreset1,
      spec: calculateMachineSpec(dummyPreset1)
    },
    {
      x: w * 0.66,
      y: h * 0.28,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      angVel: 0,
      build: dummyPreset2,
      spec: calculateMachineSpec(dummyPreset2)
    }
  ];
  testParticles = [];
}

function spawnParticles(arr, x, y, color, count = 12, speed = 5) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.3 + Math.random() * 0.7) * speed;
    arr.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1.0,
      decay: 0.03 + Math.random() * 0.03,
      size: 2.5 + Math.random() * 3.5,
      color
    });
  }
}

function updateAndDrawCraftWorkbench() {
  const w = craftCanvas.width;
  const h = craftCanvas.height;
  craftCtx.clearRect(0, 0, w, h);

  // Apex Tactical Hangar Dock Canvas
  craftCtx.fillStyle = '#080c14';
  craftCtx.fillRect(0, 0, w, h);

  const gridStep = 32;
  craftCtx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
  craftCtx.lineWidth = 1;
  craftCtx.beginPath();
  for (let gx = (w / 2) % gridStep; gx < w; gx += gridStep) {
    craftCtx.moveTo(gx, 0);
    craftCtx.lineTo(gx, h);
  }
  for (let gy = (h / 2) % gridStep; gy < h; gy += gridStep) {
    craftCtx.moveTo(0, gy);
    craftCtx.lineTo(w, gy);
  }
  craftCtx.stroke();

  // Subtle Diagonal Hazard Hash in Corners
  craftCtx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  craftCtx.lineWidth = 1;
  craftCtx.beginPath();
  for (let d = -h; d < w + h; d += 24) {
    craftCtx.moveTo(d, 0);
    craftCtx.lineTo(d + h, h);
  }
  craftCtx.stroke();

  if (workbenchMode === 'edit') {
    const cx = w * 0.5;
    const cy = h * 0.49;

    // Blueprint Reference Rings & Axes
    craftCtx.save();
    craftCtx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
    craftCtx.lineWidth = 1.3;
    craftCtx.setLineDash([6, 5]);
    craftCtx.beginPath();
    craftCtx.moveTo(cx, 18);
    craftCtx.lineTo(cx, h - 28);
    craftCtx.moveTo(24, cy);
    craftCtx.lineTo(w - 24, cy);
    craftCtx.stroke();

    craftCtx.beginPath();
    craftCtx.arc(cx, cy, 62 * EDIT_VIEW_SCALE, 0, Math.PI * 2);
    craftCtx.stroke();
    craftCtx.setLineDash([]);

    // Forward Direction Indicator
    craftCtx.fillStyle = 'rgba(56, 189, 248, 0.88)';
    craftCtx.font = '800 11px system-ui, sans-serif';
    craftCtx.textAlign = 'center';
    craftCtx.fillText(isEn() ? '▲ FRONT // LAUNCH DIRECTION' : '▲ FRONT // 机上射出正面', cx, 22);
    craftCtx.restore();

    // Draw the user's character machine at EDIT_VIEW_SCALE (1.32x) so it fits cleanly inside the canvas
    drawEraserMachine(craftCtx, cx, cy, 0, currentBuild, {
      scale: EDIT_VIEW_SCALE,
      isBlueprint: true,
      highlightGlyphId: selectedGlyphId,
      useRawOrigin: true
    });

    if (currentBuild.glyphs.length === 0) {
      craftCtx.save();
      craftCtx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      craftCtx.font = '800 13px system-ui, sans-serif';
      craftCtx.textAlign = 'center';
      craftCtx.fillText(isEn() ? 'NO GLYPHS PLACED (0 / 5)' : '文字が配置されていません', cx, cy - 8);
      craftCtx.font = '700 11.5px system-ui, sans-serif';
      craftCtx.fillStyle = '#00e5ff';
      craftCtx.fillText(isEn() ? 'Click "+ ADD GLYPH" at top-right to add characters' : '右上の「＋ 文字追加」から文字を配置してください', cx, cy + 14);
      craftCtx.restore();
    }
  } else {
    // Test Shoot Mode on Workbench
    if (!testPlayerUnit) initTestRange();

    const pad = 24;
    craftCtx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    craftCtx.lineWidth = 3;
    craftCtx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    const allUnits = [testPlayerUnit, ...testDummies];

    // Update physics (Synchronized with balanced arena physics)
    allUnits.forEach(u => {
      u.x += u.vx;
      u.y += u.vy;
      u.angle += u.angVel;
      u.vx *= u.spec.friction;
      u.vy *= u.spec.friction;
      u.angVel *= 0.952;

      if (Math.hypot(u.vx, u.vy) < 0.06) {
        u.vx = 0;
        u.vy = 0;
        u.angVel = 0;
      }

      const r = Math.min(48, u.spec.boundingRadius * 0.72);
      if (u.x - r < pad) { u.x = pad + r; u.vx = Math.abs(u.vx) * 0.8; sfx.playHit(0.3, false); }
      if (u.x + r > w - pad) { u.x = w - pad - r; u.vx = -Math.abs(u.vx) * 0.8; sfx.playHit(0.3, false); }
      if (u.y - r < pad) { u.y = pad + r; u.vy = Math.abs(u.vy) * 0.8; sfx.playHit(0.3, false); }
      if (u.y + r > h - pad) { u.y = h - pad - r; u.vy = -Math.abs(u.vy) * 0.8; sfx.playHit(0.3, false); }
    });

    // Character-Shape Collisions on Test Range
    for (let i = 0; i < allUnits.length; i++) {
      for (let j = i + 1; j < allUnits.length; j++) {
        const uA = allUnits[i];
        const uB = allUnits[j];
        const hit = detectCompoundCollision(uA, uB, 0.92);
        if (hit) {
          const sep = hit.overlap * 0.58 + 0.5;
          uA.x -= hit.nx * sep;
          uA.y -= hit.ny * sep;
          uB.x += hit.nx * sep;
          uB.y += hit.ny * sep;

          const rvx = uB.vx - uA.vx;
          const rvy = uB.vy - uA.vy;
          const velAlongNormal = rvx * hit.nx + rvy * hit.ny;
          if (velAlongNormal < 0) {
            const e = Math.min(1.12, (uA.spec.restitution + uB.spec.restitution) * 0.52);
            const mA = uA.spec.weight;
            const mB = uB.spec.weight;
            let jImpulse = -(1 + e) * velAlongNormal;
            jImpulse /= (1 / mA + 1 / mB);
            jImpulse *= 1 + hit.sharpnessSum * 0.14;

            const impX = jImpulse * hit.nx;
            const impY = jImpulse * hit.ny;
            uA.vx -= impX / mA;
            uA.vy -= impY / mA;
            uB.vx += impX / mB;
            uB.vy += impY / mB;

            // Rotational torque from exact stroke contact point relative to each unit's center of mass
            const torqueA = ((hit.contactX - uA.x) * (-impY) - (hit.contactY - uA.y) * (-impX)) * 0.00038;
            const torqueB = ((hit.contactX - uB.x) * impY - (hit.contactY - uB.y) * impX) * 0.00038;
            uA.angVel += Math.max(-0.28, Math.min(0.28, torqueA));
            uB.angVel += Math.max(-0.28, Math.min(0.28, torqueB));

            sfx.playHit(Math.min(1, Math.abs(velAlongNormal) / 10), true);
            spawnParticles(testParticles, hit.contactX, hit.contactY, '#f59e0b', 14, 6);
          }
        }
      }
    }

    // Draw Dummies & Player (with subtle real character-shape hitbox contour visible in test range)
    testDummies.forEach(d => {
      drawEraserMachine(craftCtx, d.x, d.y, d.angle, d.build, {
        cachedSpec: d.spec,
        scale: 0.92,
        showShapeHitbox: true
      });
    });
    drawEraserMachine(craftCtx, testPlayerUnit.x, testPlayerUnit.y, testPlayerUnit.angle, testPlayerUnit.build, {
      cachedSpec: testPlayerUnit.spec,
      scale: 0.92,
      showShapeHitbox: true
    });

    // Slingshot Aiming Arrow
    if (testSlingshot.active) {
      const dx = testSlingshot.startX - testSlingshot.curX;
      const dy = testSlingshot.startY - testSlingshot.curY;
      const dist = Math.min(140, Math.hypot(dx, dy));
      if (dist > 8) {
        const ang = Math.atan2(dy, dx);
        craftCtx.save();
        craftCtx.strokeStyle = '#38bdf8';
        craftCtx.lineWidth = 4;
        craftCtx.setLineDash([8, 5]);
        craftCtx.beginPath();
        craftCtx.moveTo(testPlayerUnit.x, testPlayerUnit.y);
        craftCtx.lineTo(
          testPlayerUnit.x + Math.cos(ang) * dist * 1.35,
          testPlayerUnit.y + Math.sin(ang) * dist * 1.35
        );
        craftCtx.stroke();
        craftCtx.restore();
      }
    }

    // Particles
    for (let i = testParticles.length - 1; i >= 0; i--) {
      const p = testParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        testParticles.splice(i, 1);
        continue;
      }
      craftCtx.fillStyle = p.color;
      craftCtx.globalAlpha = p.life;
      craftCtx.beginPath();
      craftCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      craftCtx.fill();
      craftCtx.globalAlpha = 1;
    }
  }
}

// ============================================================================
// 9. BLUEPRINT CANVAS POINTER INTERACTION (Shape-Aware Hit Test & Free Drag)
// ============================================================================

function getCanvasPointerPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function hitTestBlueprintGlyphs(canvasX, canvasY) {
  const cx = craftCanvas.width * 0.5;
  const cy = craftCanvas.height * 0.49;
  const lx = (canvasX - cx) / EDIT_VIEW_SCALE;
  const ly = (canvasY - cy) / EDIT_VIEW_SCALE;

  // 1. Check active glyph's Rotation & Scale handles first
  const sel = getSelectedGlyph();
  if (sel) {
    const info = analyzeGlyph(sel.char, sel.fontStyle || 'heavy');
    const sc = (sel.scale || 105) / 100;
    const hw = info.physW * sc * 0.5 + 5;
    const hh = info.physH * sc * 0.5 + 5;
    const rad = ((sel.angle || 0) * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const dx = lx - sel.x;
    const dy = ly - sel.y;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    if (Math.hypot(rx - 0, ry - (-hh - 17)) <= 12) {
      return { mode: 'rotate', glyph: sel };
    }
    if (Math.hypot(rx - hw, ry - hh) <= 12) {
      return { mode: 'scale', glyph: sel };
    }
  }

  // 2. First pass: exact stroke-node hit test (top layer to bottom layer) so clicking through
  // empty corners of a character selects the character behind it accurately
  for (let i = currentBuild.glyphs.length - 1; i >= 0; i--) {
    const g = currentBuild.glyphs[i];
    const info = analyzeGlyph(g.char, g.fontStyle || 'heavy');
    const sc = (g.scale || 105) / 100;
    const rad = ((g.angle || 0) * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const sx = g.flipX ? -1 : 1;
    const sy = g.flipY ? -1 : 1;
    const dx = lx - g.x;
    const dy = ly - g.y;
    const rx = (dx * cos - dy * sin) * sx;
    const ry = (dx * sin + dy * cos) * sy;

    const nodes = info.allShapeNodes || info.shapeNodes;
    for (let k = 0; k < nodes.length; k++) {
      const nd = nodes[k];
      if (Math.hypot(rx - nd.lx * sc, ry - nd.ly * sc) <= nd.r * sc + 4.5) {
        return { mode: 'move', glyph: g };
      }
    }
  }

  // 3. Fallback pass: bounding box hit test for easy touch selection
  for (let i = currentBuild.glyphs.length - 1; i >= 0; i--) {
    const g = currentBuild.glyphs[i];
    const info = analyzeGlyph(g.char, g.fontStyle || 'heavy');
    const sc = (g.scale || 105) / 100;
    const hw = info.physW * sc * 0.5 + 3;
    const hh = info.physH * sc * 0.5 + 3;
    const rad = ((g.angle || 0) * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const dx = lx - g.x;
    const dy = ly - g.y;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    if (Math.abs(rx) <= hw && Math.abs(ry) <= hh) {
      return { mode: 'move', glyph: g };
    }
  }

  return null;
}

craftCanvas.addEventListener('pointerdown', evt => {
  const pos = getCanvasPointerPos(craftCanvas, evt);
  if (workbenchMode === 'edit') {
    const hit = hitTestBlueprintGlyphs(pos.x, pos.y);
    if (hit) {
      pushCraftUndo();
      selectedGlyphId = hit.glyph.id;
      activeCraftSubTab = 'tune'; // Auto-focus to transformer & appearance for this character!
      editorDragMode = hit.mode;
      editorDragStartMouse = pos;
      editorDragInitialGlyph = { ...hit.glyph };
      sfx.playClick();
      updateCraftUI();
      craftCanvas.setPointerCapture(evt.pointerId);
    } else {
      editorDragMode = null;
    }
  } else {
    if (!testPlayerUnit) initTestRange();
    testSlingshot.active = true;
    testSlingshot.startX = pos.x;
    testSlingshot.startY = pos.y;
    testSlingshot.curX = pos.x;
    testSlingshot.curY = pos.y;
    craftCanvas.setPointerCapture(evt.pointerId);
  }
});

craftCanvas.addEventListener('pointermove', evt => {
  const pos = getCanvasPointerPos(craftCanvas, evt);
  if (workbenchMode === 'edit') {
    if (!editorDragMode || !editorDragInitialGlyph) return;
    const g = getSelectedGlyph();
    if (!g) return;

    const cx = craftCanvas.width * 0.5;
    const cy = craftCanvas.height * 0.49;

    if (editorDragMode === 'move') {
      const dx = (pos.x - editorDragStartMouse.x) / EDIT_VIEW_SCALE;
      const dy = (pos.y - editorDragStartMouse.y) / EDIT_VIEW_SCALE;
      g.x = Math.max(-115, Math.min(115, Math.round(editorDragInitialGlyph.x + dx)));
      g.y = Math.max(-115, Math.min(115, Math.round(editorDragInitialGlyph.y + dy)));
      enforceConnectedGlyphs(currentBuild.glyphs, g.id, false);
    } else if (editorDragMode === 'rotate') {
      const gx = cx + g.x * EDIT_VIEW_SCALE;
      const gy = cy + g.y * EDIT_VIEW_SCALE;
      const ang = Math.atan2(pos.y - gy, pos.x - gx) + Math.PI / 2;
      let deg = Math.round((ang * 180) / Math.PI);
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;
      g.angle = Math.round(deg / 5) * 5;
      enforceConnectedGlyphs(currentBuild.glyphs, g.id, false);
    } else if (editorDragMode === 'scale') {
      const gx = cx + g.x * EDIT_VIEW_SCALE;
      const gy = cy + g.y * EDIT_VIEW_SCALE;
      const startDist = Math.max(12, Math.hypot(editorDragStartMouse.x - gx, editorDragStartMouse.y - gy));
      const curDist = Math.max(12, Math.hypot(pos.x - gx, pos.y - gy));
      const newScale = Math.round(editorDragInitialGlyph.scale * (curDist / startDist));
      g.scale = Math.max(50, Math.min(150, newScale));
      enforceConnectedGlyphs(currentBuild.glyphs, g.id, false);
    }

    saveStateToStorage();
    updateCraftUI(true);
  } else if (testSlingshot.active) {
    testSlingshot.curX = pos.x;
    testSlingshot.curY = pos.y;
  }
});

window.addEventListener('pointerup', () => {
  if (workbenchMode === 'edit' && editorDragMode) {
    editorDragMode = null;
    editorDragInitialGlyph = null;
    // Keep exact placement without auto-recentering the whole machine
    enforceConnectedGlyphs(currentBuild.glyphs, selectedGlyphId, false);
    saveStateToStorage();
    updateCraftUI();
  } else if (workbenchMode === 'test' && testSlingshot.active) {
    testSlingshot.active = false;
    if (testPlayerUnit) {
      const dx = testSlingshot.startX - testSlingshot.curX;
      const dy = testSlingshot.startY - testSlingshot.curY;
      const dist = Math.min(140, Math.hypot(dx, dy));
      if (dist > 8) {
        const power = (dist / 140) * testPlayerUnit.spec.maxLaunchSpeed;
        const ang = Math.atan2(dy, dx);
        testPlayerUnit.vx = Math.cos(ang) * power;
        testPlayerUnit.vy = Math.sin(ang) * power;
        testPlayerUnit.angVel = 0;
        testPlayerUnit.skillStock = 99; testPlayerUnit.lastSkillThreshold = 100;
        sfx.playShoot(dist / 140);
      }
    }
  }
});

// Mouse wheel on blueprint scales selected glyph
craftCanvas.addEventListener('wheel', evt => {
  if (workbenchMode !== 'edit') return;
  evt.preventDefault();
  const g = getSelectedGlyph();
  if (!g) return;
  const delta = evt.deltaY < 0 ? 6 : -6;
  g.scale = Math.max(50, Math.min(150, (g.scale || 105) + delta));
  enforceConnectedGlyphs(currentBuild.glyphs, g.id, false);
  saveStateToStorage();
  updateCraftUI();
}, { passive: false });

// ============================================================================
// 10. CRAFT STUDIO UI BINDINGS & SYNCHRONIZATION
// ============================================================================

function updateLiveTypedCharPreview() {
  const inputEl = document.getElementById('glyphKeyboardInput');
  if (!inputEl) return;
  const ch = extractFirstGrapheme(inputEl.value || '剣');
  const info = analyzeGlyph(ch, defaultSelectedFont || 'heavy');
  const skill = GLYPH_SKILLS[info.skillId] || GLYPH_SKILLS.slash;

  document.getElementById('previewCharBox').textContent = ch;
  document.getElementById('previewCharTitle').textContent = isEn() ? `GLYPH '${ch}' ANALYSIS` : `『${ch}』の解析スペック`;
  document.getElementById('previewCharStats').textContent = isEn()
    ? `Mass: ${info.weight}g / ATK+${info.atk} DEF+${info.def} SPD+${info.spd} SPIN+${info.spin}`
    : `重さ:${info.weight}g / 攻+${info.atk} 防+${info.def} 速+${info.spd} 転+${info.spin}`;
  document.getElementById('previewCharSkill').textContent = isEn()
    ? `Skill: ${skill.title}`
    : `必殺: ${skill.title}`;
}

function renderPaletteGrid() {
  const grid = document.getElementById('glyphPaletteGrid');
  if (!grid) return;
  const chars = PALETTE_CATEGORIES[activePaletteCategory] || PALETTE_CATEGORIES.attack;
  grid.innerHTML = '';

  chars.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'palette-char-btn';
    btn.textContent = ch;
    btn.title = currentBuild.glyphs.length >= MAX_GLYPHS
      ? (isEn() ? `Replace selected character with '${ch}'` : `『${ch}』を選択中の文字と置換`)
      : (isEn() ? `Add '${ch}' to machine` : `『${ch}』を機体に密着追加`);
    btn.addEventListener('click', () => {
      document.getElementById('glyphKeyboardInput').value = ch;
      updateLiveTypedCharPreview();
      const useMirror = document.getElementById('mirrorPairCheck')?.checked;
      // When at 5/5, clicking a palette char automatically replaces the selected character!
      addCharacterToBuild(ch, useMirror, true);
    });
    grid.appendChild(btn);
  });
}

function renderPresetMachinesList() {
  const container = document.getElementById('presetMachinesList');
  if (!container) return;
  container.innerHTML = '';

  PRESET_MACHINES.forEach(preset => {
    const spec = calculateMachineSpec(preset);
    const card = document.createElement('div');
    card.className = 'item-card';
    const previewChars = preset.glyphs.slice(0, MAX_GLYPHS).map(g => g.char).join('');
    card.innerHTML = `
      <div class="item-card-header">
        <span class="item-name">${preset.name}</span>
        <span class="item-badge">${spec.weight}g / ${preset.glyphs.length} ${isEn() ? 'Glyphs' : '文字'}</span>
      </div>
      <div class="item-desc">${preset.desc}</div>
      <div class="item-stats-mini">
        <span>${isEn() ? 'Build' : '構成'}: [${previewChars}]</span>
        <span>${isEn() ? `ATK ${spec.atk} DEF ${spec.def} SPD ${spec.spd}` : `攻${spec.atk} 防${spec.def} 速${spec.spd}`}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      pushCraftUndo();
      currentBuild = createBuildFromPreset(preset);
      selectedGlyphId = currentBuild.glyphs[0]?.id || null;
      sfx.playEquip();
      saveStateToStorage();
      updateCraftUI();
      if (workbenchMode === 'test') initTestRange();
    });
    container.appendChild(card);
  });
}

function updateCraftUI(skipLists = false) {
  // Always ensure connected constraint is satisfied
  if (!editorDragMode) {
    enforceConnectedGlyphs(currentBuild.glyphs, selectedGlyphId, false);
  }

  // Render Dynamic Character Slot Tabs ([1:龍] [2:▲] [3:剣] ... and [+])
  renderGlyphSlotTabs();

  const spec = calculateMachineSpec(currentBuild);
  const sel = getSelectedGlyph();
  const count = currentBuild.glyphs.length;

  // Update Character Count Badges
  const countBadge = document.getElementById('inputPanelCountBadge');
  if (countBadge) {
    countBadge.textContent = isEn() ? `${count} / ${MAX_GLYPHS} GLYPHS` : `${count} / ${MAX_GLYPHS} 文字`;
  }
  const specCountEl = document.getElementById('specCharCountText');
  if (specCountEl) {
    specCountEl.textContent = String(count);
  }
  const layerCountEl = document.getElementById('layerCountLabel');
  if (layerCountEl) {
    layerCountEl.textContent = String(count);
  }

  // Right Column Spec Analyzer
  document.getElementById('specMachineName').textContent = currentBuild.name;
  document.getElementById('specTotalWeight').textContent = `${spec.weight.toFixed(1)}g`;
  document.getElementById('specBuildType').textContent = spec.buildType;

  const setBar = (valId, barId, val) => {
    document.getElementById(valId).textContent = val;
    document.getElementById(barId).style.width = `${Math.min(100, Math.max(8, val))}%`;
  };
  setBar('statAtkVal', 'statAtkBar', spec.atk);
  setBar('statDefVal', 'statDefBar', spec.def);
  setBar('statSpdVal', 'statSpdBar', spec.spd);
  setBar('statGripVal', 'statGripBar', spec.grip);
  setBar('statSpinVal', 'statSpinBar', spec.spin);

  document.getElementById('specSkillTitle').textContent = spec.activeSkill.title;
  document.getElementById('specSkillDesc').textContent = spec.activeSkill.desc;

  // Deploy CTA & Navigation state when 0 glyphs
  const isEmpty = (count === 0);
  const goToBattleBtn = document.getElementById('goToBattleFromSpecBtn');
  if (goToBattleBtn) {
    goToBattleBtn.classList.toggle('disabled', isEmpty);
    goToBattleBtn.textContent = isEn()
      ? (isEmpty ? 'CANNOT DEPLOY (0 GLYPHS)' : 'SORTIE TO BATTLE (VS CPU / P2P)')
      : (isEmpty ? '出撃不可 (文字0個)' : 'この機体でバトル出撃');
    goToBattleBtn.title = isEn()
      ? (isEmpty ? 'Place at least 1 glyph to sortie' : 'Deploy this machine to battle')
      : (isEmpty ? '文字が0個のため出撃できません' : 'この文字機体でバトル出撃');
  }
  const tabBattleBtn = document.getElementById('tabBattleBtn');
  if (tabBattleBtn) {
    tabBattleBtn.classList.toggle('disabled-tab', isEmpty);
    tabBattleBtn.title = isEn()
      ? (isEmpty ? 'Place at least 1 glyph to sortie' : 'Battle Arena [2]')
      : (isEmpty ? '文字が0個のため出撃できません' : 'バトル出撃');
  }

  // Fine-Tune Controls for Selected Glyph
  const tuneBox = document.getElementById('fineTuneBox');
  const headerBox = document.getElementById('selectedGlyphHeaderBox');
  if (sel) {
    tuneBox?.classList.remove('no-selection');
    headerBox?.classList.remove('no-selection');
    document.getElementById('selectedGlyphTitle').textContent = isEn()
      ? `SELECTED: '${sel.char}' TUNING`
      : `選択中: 『${sel.char}』の変形・調整`;
    const editCharInput = document.getElementById('editSelectedCharInput');
    if (document.activeElement !== editCharInput) {
      editCharInput.value = sel.char;
    }
    document.getElementById('tuneScale').value = sel.scale;
    document.getElementById('tuneScaleVal').textContent = `${sel.scale}%`;
    document.getElementById('tuneAngle').value = sel.angle;
    document.getElementById('tuneAngleVal').textContent = `${sel.angle}°`;
    document.getElementById('tuneOffsetX').value = Math.round(sel.x);
    document.getElementById('tuneOffsetXVal').textContent = `${Math.round(sel.x)}`;
    document.getElementById('tuneOffsetY').value = Math.round(sel.y);
    document.getElementById('tuneOffsetYVal').textContent = `${Math.round(sel.y)}`;

    const colorInput = document.getElementById('selectedColorInput');
    if (colorInput && document.activeElement !== colorInput) {
      colorInput.value = sel.color || '#38bdf8';
    }
    const depthColorInput = document.getElementById('selectedDepthColorInput');
    if (depthColorInput && document.activeElement !== depthColorInput) {
      depthColorInput.value = sel.depthColor || '#0f172a';
    }
    const selFontBox = document.getElementById('selectedFontSelect');
    if (selFontBox) {
      selFontBox.value = sel.fontStyle || 'heavy';
    }

    document.querySelectorAll('#selectedMaterialGroup .mat-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mat === sel.mat);
    });
  } else {
    tuneBox?.classList.add('no-selection');
    headerBox?.classList.add('no-selection');
    document.getElementById('selectedGlyphTitle').textContent = isEn() ? 'NO GLYPH (CLICK + TO ADD)' : '文字未配置 (右上の「＋」から追加)';
  }

  const nameInput = document.getElementById('customEraserNameInput');
  if (document.activeElement !== nameInput) {
    nameInput.value = currentBuild.name;
  }
  document.getElementById('weldChassisCheck').checked = currentBuild.weldChassis !== false;

  // Save Slots Bar (concise text so it never stretches the middle column)
  document.querySelectorAll('#saveSlotsGroup .save-slot-btn').forEach((btn, idx) => {
    const slotBuild = savedSlots[idx];
    const charsPreview = slotBuild ? slotBuild.glyphs.slice(0, 5).map(g => g.char).join('') : '';
    btn.classList.toggle('active', idx === activeSlotIndex);
    btn.textContent = isEn() ? `SLOT ${idx + 1}: [${charsPreview}]` : `${idx + 1}号機: [${charsPreview}]`;
  });

  if (skipLists) return;

  // Constituent Glyph Summary List (Right Sidebar)
  const summaryUl = document.getElementById('equippedPartsSummaryList');
  summaryUl.innerHTML = '';
  currentBuild.glyphs.forEach(g => {
    const mat = GLYPH_MATERIALS[g.mat] || GLYPH_MATERIALS.mecha;
    const info = analyzeGlyph(g.char, g.fontStyle || 'heavy');
    const li = document.createElement('li');
    if (g.id === selectedGlyphId) li.style.borderColor = '#38bdf8';
    li.innerHTML = `
      <div>
        <span class="part-slot-tag" style="background:${g.color};color:#0f172a">${g.char}</span>
        <strong>${mat.name}</strong> <small>(${g.scale}%)</small>
      </div>
      <span>+${(info.weight * mat.weightMul * (g.scale / 100)).toFixed(1)}g</span>
    `;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      selectedGlyphId = g.id;
      sfx.playClick();
      updateCraftUI();
    });
    summaryUl.appendChild(li);
  });

  // Layers List in Left Sidebar Tab 3
  const layersList = document.getElementById('glyphLayersList');
  if (layersList) {
    layersList.innerHTML = '';
    currentBuild.glyphs.forEach((g, idx) => {
      const mat = GLYPH_MATERIALS[g.mat] || GLYPH_MATERIALS.mecha;
      const row = document.createElement('div');
      row.className = 'glyph-layer-item' + (g.id === selectedGlyphId ? ' active' : '');
      row.innerHTML = `
        <div class="glyph-layer-left">
          <div class="glyph-layer-char" style="color:${g.color}">${g.char}</div>
          <div class="glyph-layer-meta">
            <strong>#${idx + 1} ${mat.name}</strong>
            <span>位置(${Math.round(g.x)}, ${Math.round(g.y)}) / ${g.scale}% / ${g.angle}°</span>
          </div>
        </div>
      `;
      row.addEventListener('click', () => {
        selectedGlyphId = g.id;
        sfx.playClick();
        updateCraftUI();
      });
      layersList.appendChild(row);
    });
  }
}


let activeCraftSubTab = 'tune'; // 'tune' | 'input' | 'config'

function renderGlyphSlotTabs() {
  const container = document.getElementById('glyphSlotTabs');
  if (!container) return;
  container.innerHTML = '';

  const glyphs = currentBuild.glyphs || [];

  glyphs.forEach((g, idx) => {
    const btn = document.createElement('button');
    const isCurrent = (activeCraftSubTab === 'tune' && g.id === selectedGlyphId);
    btn.className = 'glyph-slot-tab' + (isCurrent ? ' active' : '');
    btn.innerHTML = `<span class="slot-num">${idx + 1}</span><span class="slot-char" style="color:${g.color || '#fff'}">${g.char}</span>`;
    btn.title = `#${idx + 1} 『${g.char}』の変形・外装`;
    btn.addEventListener('click', () => {
      selectedGlyphId = g.id;
      activeCraftSubTab = 'tune';
      sfx.playClick();
      updateCraftUI();
    });
    container.appendChild(btn);
  });

  // Plus button (+)
  const addBtn = document.getElementById('tabAddGlyphBtn');
  if (addBtn) {
    const isFull = glyphs.length >= MAX_GLYPHS;
    addBtn.classList.toggle('disabled', isFull);
    addBtn.classList.toggle('active', activeCraftSubTab === 'input');
    addBtn.title = isFull ? '最大5文字のため満杯です (文字タブから置換または削除可能)' : '新しい文字を追加';
  }

  // Preset button
  const configBtn = document.getElementById('tabConfigBtn');
  if (configBtn) {
    configBtn.classList.toggle('active', activeCraftSubTab === 'config');
  }

  // Synchronize Panels Visibility
  document.getElementById('panel-tune')?.classList.toggle('active', activeCraftSubTab === 'tune');
  document.getElementById('panel-input')?.classList.toggle('active', activeCraftSubTab === 'input');
  document.getElementById('panel-config')?.classList.toggle('active', activeCraftSubTab === 'config');
}

// Setup Dynamic Glyph Slot Tabs and Navigation
function switchToCraftSubTab(tabName) {
  activeCraftSubTab = tabName;
  updateCraftUI();
}

document.getElementById('tabAddGlyphBtn')?.addEventListener('click', () => {
  if (currentBuild.glyphs.length >= MAX_GLYPHS) {
    showBattleToast('最大5文字のため満杯です（文字タブを選んで置換または削除で変更可能）');
    return;
  }
  activeCraftSubTab = 'input';
  sfx.playClick();
  updateCraftUI();
});

document.getElementById('tabConfigBtn')?.addEventListener('click', () => {
  activeCraftSubTab = 'config';
  sfx.playClick();
  updateCraftUI();
});

// Keyboard Character Input & Add / Replace Button
document.getElementById('glyphKeyboardInput')?.addEventListener('input', updateLiveTypedCharPreview);
document.getElementById('glyphKeyboardInput')?.addEventListener('keydown', evt => {
  if (evt.key === 'Enter') {
    evt.preventDefault();
    const val = document.getElementById('glyphKeyboardInput').value;
    const mirror = document.getElementById('mirrorPairCheck')?.checked;
    addCharacterToBuild(val, mirror, false);
  }
});

document.getElementById('addTypedGlyphBtn')?.addEventListener('click', () => {
  const val = document.getElementById('glyphKeyboardInput').value;
  const mirror = document.getElementById('mirrorPairCheck')?.checked;
  addCharacterToBuild(val, mirror, false);
});

document.getElementById('replaceTypedGlyphBtn')?.addEventListener('click', () => {
  const val = document.getElementById('glyphKeyboardInput').value;
  replaceSelectedGlyphChar(val);
});

// Palette Category Tabs
document.querySelectorAll('#paletteCategoryTabs .mini-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    sfx.playClick();
    document.querySelectorAll('#paletteCategoryTabs .mini-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePaletteCategory = btn.dataset.palcat;
    renderPaletteGrid();
  });
});

// Default Material & Color Swatches for New Characters
document.querySelectorAll('#defaultMaterialGroup .mat-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    sfx.playClick();
    document.querySelectorAll('#defaultMaterialGroup .mat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    defaultNewMat = btn.dataset.mat;
    const mat = GLYPH_MATERIALS[defaultNewMat];
    if (mat) defaultNewColor = mat.defaultColor;
    // Also apply immediately to selected glyph for instant feedback
    const sel = getSelectedGlyph();
    if (sel) {
      sel.mat = defaultNewMat;
      sel.color = defaultNewColor;
      sel.depthColor = mat.defaultDepth;
      saveStateToStorage();
      updateCraftUI();
    }
  });
});

document.querySelectorAll('#quickColorSwatches .color-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    sfx.playClick();
    document.querySelectorAll('#quickColorSwatches .color-swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    defaultNewColor = sw.dataset.col;
    const sel = getSelectedGlyph();
    if (sel) {
      sel.color = defaultNewColor;
      saveStateToStorage();
      updateCraftUI();
    }
  });
});

// Selected Glyph Tuning Controls
document.getElementById('editSelectedCharInput')?.addEventListener('input', evt => {
  const sel = getSelectedGlyph();
  if (!sel) return;
  const raw = evt.target.value;
  if (raw && raw.trim().length > 0) {
    sel.char = extractFirstGrapheme(raw);
    enforceConnectedGlyphs(currentBuild.glyphs, sel.id, true);
    saveStateToStorage();
    updateCraftUI();
  }
});

document.getElementById('flipSelectedXBtn')?.addEventListener('click', () => {
  const sel = getSelectedGlyph();
  if (!sel) return;
  pushCraftUndo();
  sel.flipX = !sel.flipX;
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('flipSelectedYBtn')?.addEventListener('click', () => {
  const sel = getSelectedGlyph();
  if (!sel) return;
  pushCraftUndo();
  sel.flipY = !sel.flipY;
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('duplicateGlyphBtn')?.addEventListener('click', () => {
  const sel = getSelectedGlyph();
  if (!sel) return;
  if (currentBuild.glyphs.length >= MAX_GLYPHS) {
    showBattleToast(`最大${MAX_GLYPHS}文字のため複製できません`);
    return;
  }
  pushCraftUndo();
  const pos = findBestAttachmentPosition(currentBuild.glyphs, sel.char, sel.scale, 0);
  const copy = { ...sel, id: makeGlyphId(), x: pos.x, y: pos.y };
  currentBuild.glyphs.push(copy);
  selectedGlyphId = copy.id;
  enforceConnectedGlyphs(currentBuild.glyphs, copy.id, true);
  sfx.playEquip();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('mirrorCopyGlyphBtn')?.addEventListener('click', () => {
  const sel = getSelectedGlyph();
  if (!sel) return;
  if (currentBuild.glyphs.length >= MAX_GLYPHS) {
    showBattleToast(`最大${MAX_GLYPHS}文字のため対称コピーできません`);
    return;
  }
  pushCraftUndo();
  const copy = {
    ...sel,
    id: makeGlyphId(),
    x: -sel.x || 28,
    y: sel.y,
    angle: -sel.angle,
    flipX: !sel.flipX
  };
  currentBuild.glyphs.push(copy);
  selectedGlyphId = copy.id;
  enforceConnectedGlyphs(currentBuild.glyphs, copy.id, true);
  sfx.playEquip();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('deleteGlyphBtn')?.addEventListener('click', () => {
  if (currentBuild.glyphs.length === 0) {
    showBattleToast('削除する文字がありません');
    return;
  }
  pushCraftUndo();
  currentBuild.glyphs = currentBuild.glyphs.filter(g => g.id !== selectedGlyphId);
  selectedGlyphId = currentBuild.glyphs[0]?.id || null;
  if (currentBuild.glyphs.length > 0) {
    enforceConnectedGlyphs(currentBuild.glyphs, selectedGlyphId, true);
  } else {
    activeCraftSubTab = 'input';
  }
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

['tuneScale', 'tuneAngle', 'tuneOffsetX', 'tuneOffsetY'].forEach(sliderId => {
  const el = document.getElementById(sliderId);
  if (!el) return;
  el.addEventListener('input', () => {
    const sel = getSelectedGlyph();
    if (!sel) return;
    if (sliderId === 'tuneScale') sel.scale = Number(el.value);
    if (sliderId === 'tuneAngle') sel.angle = Number(el.value);
    if (sliderId === 'tuneOffsetX') sel.x = Number(el.value);
    if (sliderId === 'tuneOffsetY') sel.y = Number(el.value);
    enforceConnectedGlyphs(currentBuild.glyphs, sel.id, false);
    saveStateToStorage();
    updateCraftUI(true);
  });
  el.addEventListener('change', () => {
    const sel = getSelectedGlyph();
    enforceConnectedGlyphs(currentBuild.glyphs, sel ? sel.id : null, false);
    saveStateToStorage();
    updateCraftUI();
  });
});

document.querySelectorAll('[data-rotstep]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sel = getSelectedGlyph();
    if (!sel) return;
    pushCraftUndo();
    let next = (sel.angle || 0) + Number(btn.dataset.rotstep);
    if (next > 180) next -= 360;
    if (next < -180) next += 360;
    sel.angle = next;
    sfx.playClick();
    saveStateToStorage();
    updateCraftUI();
  });
});

document.querySelectorAll('[data-rotset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sel = getSelectedGlyph();
    if (!sel) return;
    pushCraftUndo();
    sel.angle = Number(btn.dataset.rotset);
    sfx.playClick();
    saveStateToStorage();
    updateCraftUI();
  });
});

document.getElementById('centerGlyphXBtn')?.addEventListener('click', () => {
  const sel = getSelectedGlyph();
  if (!sel) return;
  pushCraftUndo();
  sel.x = 0;
  enforceConnectedGlyphs(currentBuild.glyphs, sel.id, true);
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('layerUpBtn')?.addEventListener('click', () => {
  const idx = currentBuild.glyphs.findIndex(g => g.id === selectedGlyphId);
  if (idx >= 0 && idx < currentBuild.glyphs.length - 1) {
    pushCraftUndo();
    const tmp = currentBuild.glyphs[idx];
    currentBuild.glyphs[idx] = currentBuild.glyphs[idx + 1];
    currentBuild.glyphs[idx + 1] = tmp;
    sfx.playClick();
    saveStateToStorage();
    updateCraftUI();
  }
});

document.getElementById('layerDownBtn')?.addEventListener('click', () => {
  const idx = currentBuild.glyphs.findIndex(g => g.id === selectedGlyphId);
  if (idx > 0) {
    pushCraftUndo();
    const tmp = currentBuild.glyphs[idx];
    currentBuild.glyphs[idx] = currentBuild.glyphs[idx - 1];
    currentBuild.glyphs[idx - 1] = tmp;
    sfx.playClick();
    saveStateToStorage();
    updateCraftUI();
  }
});

document.querySelectorAll('#selectedMaterialGroup .mat-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    const sel = getSelectedGlyph();
    if (!sel) return;
    pushCraftUndo();
    sel.mat = btn.dataset.mat;
    const mat = GLYPH_MATERIALS[sel.mat] || GLYPH_MATERIALS.mecha;
    sel.color = mat.defaultColor;
    sel.depthColor = mat.defaultDepth;
    sfx.playEquip();
    saveStateToStorage();
    updateCraftUI();
  });
});

['input', 'change'].forEach(evName => {
  document.getElementById('selectedColorInput')?.addEventListener(evName, evt => {
    const sel = getSelectedGlyph();
    if (!sel) return;
    sel.color = evt.target.value;
    defaultNewColor = sel.color;
    saveStateToStorage();
    updateCraftUI(true);
  });

  document.getElementById('selectedDepthColorInput')?.addEventListener(evName, evt => {
    const sel = getSelectedGlyph();
    if (!sel) return;
    sel.depthColor = evt.target.value;
    saveStateToStorage();
    updateCraftUI(true);
  });
});

document.getElementById('selectedColorInput')?.addEventListener('change', () => {
  pushCraftUndo();
});
document.getElementById('selectedDepthColorInput')?.addEventListener('change', () => {
  pushCraftUndo();
});

document.getElementById('customEraserNameInput')?.addEventListener('input', evt => {
  currentBuild.name = evt.target.value.slice(0, 16) || '名無しの文字機体';
  saveStateToStorage();
  updateCraftUI(true);
});

document.getElementById('weldChassisCheck')?.addEventListener('change', evt => {
  currentBuild.weldChassis = evt.target.checked;
  saveStateToStorage();
  updateCraftUI(true);
});

document.getElementById('autoCenterAllBtn')?.addEventListener('click', () => {
  pushCraftUndo();
  enforceConnectedGlyphs(currentBuild.glyphs, null, true);
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('buildFromWordBtn')?.addEventListener('click', () => {
  const word = document.getElementById('wordFormationInput')?.value || '超電磁龍神';
  buildMachineFromWord(word);
});

// Top-Right Quick Add Character Flow
function triggerAddGlyphFlow() {
  if (currentBuild.glyphs.length >= MAX_GLYPHS) {
    showBattleToast('最大5文字のため満杯です（選択中の文字を置換するか削除してください）');
    return;
  }
  activeCraftSubTab = 'input';
  sfx.playClick();
  updateCraftUI();
  setTimeout(() => {
    const inputEl = document.getElementById('glyphKeyboardInput');
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  }, 50);
}

document.getElementById('wbAddGlyphBtn')?.addEventListener('click', triggerAddGlyphFlow);
document.getElementById('boardAddGlyphBtn')?.addEventListener('click', triggerAddGlyphFlow);

// Workbench Toolbar Buttons
document.getElementById('wbModeEditBtn')?.addEventListener('click', () => {
  workbenchMode = 'edit';
  document.getElementById('wbModeEditBtn').classList.add('active');
  document.getElementById('wbModeTestBtn').classList.remove('active');
  document.getElementById('workbenchHint').classList.remove('hidden');
  document.getElementById('testRangeControls').classList.add('hidden');
  document.getElementById('boardAddGlyphBtn')?.classList.remove('hidden');
  sfx.playClick();
});

document.getElementById('wbModeTestBtn')?.addEventListener('click', () => {
  if (!currentBuild.glyphs || currentBuild.glyphs.length === 0) {
    showBattleToast('文字が0個のため試し撃ちはできません。文字を追加してください');
    return;
  }
  workbenchMode = 'test';
  document.getElementById('wbModeTestBtn').classList.add('active');
  document.getElementById('wbModeEditBtn').classList.remove('active');
  document.getElementById('workbenchHint').classList.add('hidden');
  document.getElementById('testRangeControls').classList.remove('hidden');
  document.getElementById('boardAddGlyphBtn')?.classList.add('hidden');
  initTestRange();
  sfx.playClick();
});

document.getElementById('resetTestDummyBtn')?.addEventListener('click', () => {
  initTestRange();
  sfx.playClick();
});

document.getElementById('testFireSkillBtn')?.addEventListener('click', () => {
  if (workbenchMode === 'test' && testPlayerUnit) {
    activateUnitSkill(testPlayerUnit, testDummies, testParticles);
  }
});

document.getElementById('undoCraftBtn')?.addEventListener('click', () => {
  if (!craftUndoStack.length) return;
  craftRedoStack.push(JSON.stringify(currentBuild));
  currentBuild = JSON.parse(craftUndoStack.pop());
  enforceConnectedGlyphs(currentBuild.glyphs, null, true);
  selectedGlyphId = currentBuild.glyphs[0]?.id || null;
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('redoCraftBtn')?.addEventListener('click', () => {
  if (!craftRedoStack.length) return;
  craftUndoStack.push(JSON.stringify(currentBuild));
  currentBuild = JSON.parse(craftRedoStack.pop());
  enforceConnectedGlyphs(currentBuild.glyphs, null, true);
  selectedGlyphId = currentBuild.glyphs[0]?.id || null;
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
});

document.getElementById('randomBuildBtn')?.addEventListener('click', () => {
  generateRandomGlyphMachine();
});

document.getElementById('clearPartsBtn')?.addEventListener('click', () => {
  pushCraftUndo();
  currentBuild.glyphs = [];
  selectedGlyphId = null;
  activeCraftSubTab = 'input';
  sfx.playClick();
  saveStateToStorage();
  updateCraftUI();
  if (workbenchMode === 'test') {
    workbenchMode = 'edit';
    document.getElementById('wbModeEditBtn')?.classList.add('active');
    document.getElementById('wbModeTestBtn')?.classList.remove('active');
    document.getElementById('workbenchHint')?.classList.remove('hidden');
    document.getElementById('testRangeControls')?.classList.add('hidden');
    document.getElementById('boardAddGlyphBtn')?.classList.remove('hidden');
  }
});

// Save Slots Switching
document.querySelectorAll('#saveSlotsGroup .save-slot-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const slotIdx = Number(btn.dataset.slot);
    savedSlots[activeSlotIndex] = JSON.parse(JSON.stringify(currentBuild));
    activeSlotIndex = slotIdx;
    currentBuild = JSON.parse(JSON.stringify(savedSlots[activeSlotIndex]));
    enforceConnectedGlyphs(currentBuild.glyphs, null, true);
    selectedGlyphId = currentBuild.glyphs[0]?.id || null;
    sfx.playClick();
    saveStateToStorage();
    updateCraftUI();
    if (workbenchMode === 'test') initTestRange();
  });
});

// ============================================================================
// 11. BATTLE ARENA ENGINE (Multi-OBB Physics, CPU AI, Smart Undo, Sudden Death)
// ============================================================================

const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');

let activeView = 'craft'; // 'craft' | 'battle'
let battleState = {
  mode: 'cpu-normal',
  stage: 'standard',
  turn: 1,
  activePlayer: 1, // 1 or 2
  phase: 'aim',    // 'aim' | 'moving' | 'round_end' | 'match_over'
  p1Score: 0,
  p2Score: 0,
  suddenDeathShrink: 0,
  units: [],
  obstacles: [],
  bumpers: [],
  boostPads: [],
  spinPads: [],
  frictionZones: [],
  particles: [],
  burstDebris: [],
  screenShake: 0,
  flashAlpha: 0,
  undoHistory: []
};

let battleSlingshot = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };
let selectedSpinType = 'normal'; // 'top' | 'normal' | 'back'
let cpuThinkTimeout = null;


const ALL_STAGE_IDS = [
  'standard', 'stationery', 'pinball', 'bridge', 'colosseum',
  'crossroad', 'islands', 'gridlock', 'ice_glass', 'volcano'
];

function getRandomStageId() {
  return ALL_STAGE_IDS[Math.floor(Math.random() * ALL_STAGE_IDS.length)];
}

// 10 Distinct Dynamic Battle Stages
const BATTLE_STAGES = {
  standard: {
    id: 'standard',
    name: 'スタンダード木製机',
    deskType: 'wood',
    frictionMul: 1.0,
    wMult: 1.0,
    hMult: 1.0,
    isRound: false,
    startSuddenDeath: 0,
    desc: '標準的な木製机。純粋な文字性能と体幹が試される王道ステージ。'
  },
  stationery: {
    id: 'stationery',
    name: '定規文房具ギミック机',
    deskType: 'wood',
    frictionMul: 1.0,
    wMult: 1.0,
    hMult: 1.0,
    isRound: false,
    startSuddenDeath: 0,
    desc: 'ハの字に置かれた2本のアクリル定規が壁面反射を生む。'
  },
  pinball: {
    id: 'pinball',
    name: 'ピンボールバンパー机',
    deskType: 'cyber',
    frictionMul: 0.95,
    wMult: 1.05,
    hMult: 1.0,
    isRound: false,
    startSuddenDeath: 0,
    desc: '高反発バンパーが複数配置され、跳弾と不意のノックバックが連鎖する。'
  },
  bridge: {
    id: 'bridge',
    name: '天王山・一本橋アリーナ',
    deskType: 'carbon',
    frictionMul: 1.0,
    wMult: 0.55,
    hMult: 1.15,
    isRound: false,
    startSuddenDeath: 0,
    desc: '幅が極端に狭い一本橋。わずかな押し出しで場外へ転落する超危険地帯。'
  },
  colosseum: {
    id: 'colosseum',
    name: '円形コロシアム机',
    deskType: 'steel',
    frictionMul: 1.0,
    wMult: 0.92,
    hMult: 0.92,
    isRound: true,
    startSuddenDeath: 0,
    desc: '角のない円盤ステージ。360度全方位が崖っぷちの決闘場。'
  },
  crossroad: {
    id: 'crossroad',
    name: '十字路クロスアリーナ',
    deskType: 'wood',
    frictionMul: 1.0,
    wMult: 1.05,
    hMult: 1.05,
    isRound: false,
    startSuddenDeath: 0,
    desc: '4隅に大型ブロック障害物があり、中央の交差点での激突が勝負を決める。'
  },
  islands: {
    id: 'islands',
    name: 'ツイン浮島・超加速ハイウェイ',
    deskType: 'wood',
    frictionMul: 1.0,
    wMult: 1.12,
    hMult: 0.88,
    isRound: false,
    startSuddenDeath: 0,
    desc: '中央ブリッジに双方向ハイパー加速板を配備。橋に飛び乗ることで相手陣へロケット突撃できる積極的戦闘ステージ。'
  },
  gridlock: {
    id: 'gridlock',
    name: '迷路ペンシルヘッジ',
    deskType: 'carbon',
    frictionMul: 0.98,
    wMult: 1.0,
    hMult: 1.0,
    isRound: false,
    startSuddenDeath: 0,
    desc: '鉛筆のバリケードが4箇所に林立。相手を障害物に叩きつけて大ダメージ。'
  },
  ice_glass: {
    id: 'ice_glass',
    name: '超低摩擦ガラステーブル',
    deskType: 'glass',
    frictionMul: 0.38,
    wMult: 1.0,
    hMult: 1.0,
    isRound: false,
    startSuddenDeath: 0,
    desc: '磨き抜かれたガラステーブル。摩擦が極小で、ブレーキ不能の超高速滑走戦。'
  },
  volcano: {
    id: 'volcano',
    name: '崩落縮小ボルケーノ',
    deskType: 'magma',
    frictionMul: 1.05,
    wMult: 1.0,
    hMult: 1.0,
    isRound: false,
    startSuddenDeath: 28,
    desc: '赤熱した崩落机。ターンごとに外周が急速に崩落していく過酷なサバイバル。'
  }
};

function getDeskBounds() {
  const w = gameCanvas.width || 960;
  const h = gameCanvas.height || 560;
  const stg = BATTLE_STAGES[battleState.stage] || BATTLE_STAGES.standard;
  const maxAllowedW = w * 0.90;
  const maxAllowedH = h * 0.88;
  const baseW = Math.min(w * 0.78, 760) * (stg.wMult || 1.0);
  const baseH = Math.min(h * 0.78, 460) * (stg.hMult || 1.0);
  const shrink = battleState.suddenDeathShrink || 0;
  const dw = Math.min(maxAllowedW, Math.max(stg.isRound ? 200 : 180, baseW - shrink * 2));
  const dh = Math.min(maxAllowedH, Math.max(stg.isRound ? 200 : 160, baseH - shrink * 1.4));
  const radius = Math.min(dw, dh) * 0.5;
  return {
    left: (w - dw) * 0.5,
    top: (h - dh) * 0.5,
    right: (w + dw) * 0.5,
    bottom: (h + dh) * 0.5,
    width: dw,
    height: dh,
    radius,
    isRound: Boolean(stg.isRound),
    deskType: stg.deskType || 'wood',
    cx: w * 0.5,
    cy: h * 0.5
  };
}

function resizeBattleCanvas() {
  const container = document.getElementById('arenaContainer');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  gameCanvas.width = Math.max(320, Math.floor(rect.width));
  gameCanvas.height = Math.max(260, Math.floor(rect.height));
}

function showBattleToast(msg) {
  const toast = document.getElementById('battleToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

function showCenterBanner(sub, main, desc, duration = 1500) {
  const banner = document.getElementById('centerBanner');
  if (!banner) return;
  document.getElementById('bannerSub').textContent = sub;
  document.getElementById('bannerMain').textContent = main;
  document.getElementById('bannerDesc').textContent = desc;
  banner.classList.remove('hidden');
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    banner.classList.add('hidden');
  }, duration);
}

function createRivalBuild() {
  const mode = battleState.mode || 'cpu-expert';
  if (mode === 'p2p-online' && window.p2pState && window.p2pState.remoteBuild) {
    const rb = JSON.parse(JSON.stringify(window.p2pState.remoteBuild));
    if (Array.isArray(rb.glyphs) && rb.glyphs.length > 0) {
      enforceConnectedGlyphs(rb.glyphs, null, true);
      return rb;
    }
  }
  if (mode === 'cpu-expert') {
    const expertBosses = [
      {
        name: isEn() ? 'OMEGA NEMESIS // 滅神' : '超絶極光・滅神',
        weldChassis: true,
        glyphs: [
          { id: 'ex1', char: '滅', x: 0,   y: 0,   angle: 0,   scale: 135, mat: 'blade', color: '#ef4444', depthColor: '#450a0a' },
          { id: 'ex2', char: '極', x: 0,   y: -32, angle: 0,   scale: 120, mat: 'blade', color: '#f43f5e', depthColor: '#881337' },
          { id: 'ex3', char: '神', x: -32, y: 0,   angle: -25, scale: 115, mat: 'mecha', color: '#38bdf8', depthColor: '#0f172a' },
          { id: 'ex4', char: '神', x: 32,  y: 0,   angle: 25,  scale: 115, mat: 'mecha', color: '#38bdf8', depthColor: '#0f172a', flipX: true },
          { id: 'ex5', char: '鉄', x: 0,   y: 34,  angle: 0,   scale: 125, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03' }
        ]
      },
      {
        name: isEn() ? 'TITAN COLOSSUS // 巨霊' : '鋼鉄重塞・巨霊',
        weldChassis: true,
        glyphs: [
          { id: 'exb1', char: '巨', x: 0,   y: 0,   angle: 0,   scale: 135, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03' },
          { id: 'exb2', char: '霊', x: 0,   y: -30, angle: 0,   scale: 118, mat: 'blade', color: '#f8fafc', depthColor: '#334155' },
          { id: 'exb3', char: '塞', x: -34, y: 4,   angle: -15, scale: 118, mat: 'rubber', color: '#10b981', depthColor: '#064e3b' },
          { id: 'exb4', char: '塞', x: 34,  y: 4,   angle: 15,  scale: 118, mat: 'rubber', color: '#10b981', depthColor: '#064e3b', flipX: true },
          { id: 'exb5', char: '重', x: 0,   y: 34,  angle: 0,   scale: 125, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03' }
        ]
      }
    ];
    const picked = expertBosses[Math.floor(Math.random() * expertBosses.length)];
    return createBuildFromPreset(picked);
  }
  if (mode === 'cpu-hard') {
    const bosses = [
      {
        name: isEn() ? 'OVERLORD GOU // 覇王' : '覇王・剛',
        weldChassis: true,
        glyphs: [
          { id: 'b1', char: '剛', x: 0,   y: 0,   angle: 0,   scale: 125, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03' },
          { id: 'b2', char: '覇', x: 0,   y: -34, angle: 0,   scale: 112, mat: 'blade', color: '#ef4444', depthColor: '#450a0a' },
          { id: 'b3', char: '刃', x: -33, y: -3,  angle: -20, scale: 108, mat: 'blade', color: '#f8fafc', depthColor: '#334155' },
          { id: 'b4', char: '刃', x: 33,  y: -3,  angle: 20,  scale: 108, mat: 'blade', color: '#f8fafc', depthColor: '#334155', flipX: true },
          { id: 'b5', char: '鉄', x: 0,   y: 34,  angle: 0,   scale: 110, mat: 'gold',  color: '#f59e0b', depthColor: '#451a03' }
        ]
      },
      PRESET_MACHINES[1],
      PRESET_MACHINES[3]
    ];
    const picked = bosses[Math.floor(Math.random() * bosses.length)];
    return createBuildFromPreset(picked);
  }
  const idx = 1 + Math.floor(Math.random() * (PRESET_MACHINES.length - 1));
  return createBuildFromPreset(PRESET_MACHINES[idx]);
}

function setupStageGimmicks() {
  const desk = getDeskBounds();
  battleState.obstacles = [];
  battleState.bumpers = [];
  battleState.boostPads = [];
  battleState.spinPads = [];
  battleState.frictionZones = [];

  const stg = BATTLE_STAGES[battleState.stage] || BATTLE_STAGES.standard;
  if (stg.startSuddenDeath && battleState.suddenDeathShrink === 0) {
    battleState.suddenDeathShrink = stg.startSuddenDeath;
  }

  const sid = stg.id;
  if (sid === 'stationery') {
    // 2 Acrylic Rulers placed safely on far flanks (Spawn safe: >120px)
    battleState.obstacles.push(
      { x: desk.cx - desk.width * 0.38, y: desk.cy, w: 18, h: 130, angle: 0 },
      { x: desk.cx + desk.width * 0.38, y: desk.cy, w: 18, h: 130, angle: 0 }
    );
    // 2 Balanced Boost Pads on mid flanks to assist tactical flanking
    battleState.boostPads.push(
      { id: 'bp_st1', x: desk.cx - desk.width * 0.36, y: desk.cy + desk.height * 0.16, w: 38, h: 60, angle: -Math.PI * 0.45, boostForce: 2.8 },
      { id: 'bp_st2', x: desk.cx + desk.width * 0.36, y: desk.cy - desk.height * 0.16, w: 38, h: 60, angle: Math.PI * 0.55, boostForce: 2.8 }
    );
  } else if (sid === 'pinball') {
    // 4 Bumpers positioned strictly outside spawn zones
    battleState.bumpers.push(
      { x: desk.cx - desk.width * 0.40, y: desk.cy, r: 22 },
      { x: desk.cx + desk.width * 0.40, y: desk.cy, r: 22 },
      { x: desk.cx - desk.width * 0.36, y: desk.cy - desk.height * 0.34, r: 20 },
      { x: desk.cx + desk.width * 0.36, y: desk.cy + desk.height * 0.34, r: 20 }
    );
    // Center Gentle Turntable (accents without tossing units off desk)
    battleState.spinPads.push(
      { id: 'sp_pb', x: desk.cx, y: desk.cy, r: 32, spinForce: 0.04, vortexForce: 0.14, currentAngle: 0, rotSpeed: 0.04 }
    );
  } else if (sid === 'bridge') {
    // Center Narrow Bridge: Moderate High-Friction Tactical Zone (not sticky glue)
    battleState.frictionZones.push(
      { x: desk.cx, y: desk.cy, w: desk.width * 0.60, h: 60, angle: 0, frictionMul: 0.92 }
    );
    // Catapult Boost Pads entering the central clash bridge
    battleState.boostPads.push(
      { id: 'bp_br1', x: desk.cx, y: desk.cy + desk.height * 0.16, w: 46, h: 40, angle: -Math.PI / 2, boostForce: 3.2 },
      { id: 'bp_br2', x: desk.cx, y: desk.cy - desk.height * 0.16, w: 46, h: 40, angle: Math.PI / 2, boostForce: 3.2 }
    );
    // 2 Guard rails on narrow outer flanks
    battleState.obstacles.push(
      { x: desk.cx - desk.width * 0.44, y: desk.cy, w: 10, h: 80, angle: 0 },
      { x: desk.cx + desk.width * 0.44, y: desk.cy, w: 10, h: 80, angle: 0 }
    );
  } else if (sid === 'colosseum') {
    // Tasteful Colosseum Center Hub (balanced radius and torque)
    battleState.spinPads.push(
      { id: 'sp_col', x: desk.cx, y: desk.cy, r: desk.width * 0.12, spinForce: 0.035, vortexForce: 0.12, currentAngle: 0, rotSpeed: 0.035 }
    );
    // Outer Ring Deceleration Zones
    battleState.frictionZones.push(
      { x: desk.cx - desk.width * 0.32, y: desk.cy - desk.height * 0.18, w: 48, h: 40, angle: 0.3, frictionMul: 0.92 },
      { x: desk.cx + desk.width * 0.32, y: desk.cy + desk.height * 0.18, w: 48, h: 40, angle: 0.3, frictionMul: 0.92 }
    );
  } else if (sid === 'crossroad') {
    // 4 Corner Blocks placed safely at outer borders
    const bx = desk.width * 0.40;
    const by = desk.height * 0.38;
    battleState.obstacles.push(
      { x: desk.cx - bx, y: desk.cy - by, w: 34, h: 34, angle: 0 },
      { x: desk.cx + bx, y: desk.cy - by, w: 34, h: 34, angle: 0 },
      { x: desk.cx - bx, y: desk.cy + by, w: 34, h: 34, angle: 0 },
      { x: desk.cx + bx, y: desk.cy + by, w: 34, h: 34, angle: 0 }
    );
    // 4 Cross Directional Boosters pointing inward
    battleState.boostPads.push(
      { id: 'bp_cr1', x: desk.cx, y: desk.cy + desk.height * 0.18, w: 42, h: 38, angle: -Math.PI / 2, boostForce: 3.0 },
      { id: 'bp_cr2', x: desk.cx, y: desk.cy - desk.height * 0.18, w: 42, h: 38, angle: Math.PI / 2, boostForce: 3.0 },
      { id: 'bp_cr3', x: desk.cx - desk.width * 0.20, y: desk.cy, w: 38, h: 42, angle: 0, boostForce: 3.0 },
      { id: 'bp_cr4', x: desk.cx + desk.width * 0.20, y: desk.cy, w: 38, h: 42, angle: Math.PI, boostForce: 3.0 }
    );
    // Center Intersection Turntable
    battleState.spinPads.push(
      { id: 'sp_cr', x: desk.cx, y: desk.cy, r: 26, spinForce: 0.04, vortexForce: 0.14, currentAngle: 0, rotSpeed: 0.05 }
    );
  } else if (sid === 'islands') {
    // Balanced Aggressive Highway: Boosters give tactical attack propulsion
    battleState.boostPads.push(
      { id: 'bp_isl1', x: desk.cx - 24, y: desk.cy + desk.height * 0.14, w: 38, h: 54, angle: -Math.PI * 0.48, boostForce: 3.4 },
      { id: 'bp_isl2', x: desk.cx + 24, y: desk.cy - desk.height * 0.14, w: 38, h: 54, angle: Math.PI * 0.52, boostForce: 3.4 }
    );
    // Side Guide Bumpers on the bridge to focus the collision lane
    battleState.obstacles.push(
      { x: desk.cx - desk.width * 0.20, y: desk.cy, w: 12, h: 88, angle: 0 },
      { x: desk.cx + desk.width * 0.20, y: desk.cy, w: 12, h: 88, angle: 0 }
    );
    // Central Tactical Clash Vortex
    battleState.spinPads.push(
      { id: 'sp_isl', x: desk.cx, y: desk.cy, r: 24, spinForce: 0.04, vortexForce: 0.15, currentAngle: 0, rotSpeed: 0.05 }
    );
  } else if (sid === 'gridlock') {
    // Midfield Pencil Obstacles (clearing spawns)
    battleState.obstacles.push(
      { x: desk.cx - desk.width * 0.18, y: desk.cy - 12, w: 14, h: 85, angle: 0.25 },
      { x: desk.cx + desk.width * 0.18, y: desk.cy + 12, w: 14, h: 85, angle: -0.25 }
    );
    // Moderate Deceleration Sandpaper crossing zone
    battleState.frictionZones.push(
      { x: desk.cx, y: desk.cy, w: 65, h: 50, angle: 0, frictionMul: 0.92 }
    );
    // Outer flanking boost runways
    battleState.boostPads.push(
      { id: 'bp_gr1', x: desk.cx - desk.width * 0.36, y: desk.cy + desk.height * 0.12, w: 36, h: 52, angle: -Math.PI / 2, boostForce: 3.0 },
      { id: 'bp_gr2', x: desk.cx + desk.width * 0.36, y: desk.cy - desk.height * 0.12, w: 36, h: 52, angle: Math.PI / 2, boostForce: 3.0 }
    );
  } else if (sid === 'ice_glass') {
    // Low friction desk: 2 Grip Mats for strategic stopping
    battleState.frictionZones.push(
      { x: desk.cx - desk.width * 0.20, y: desk.cy, w: 68, h: 68, angle: 0, frictionMul: 0.88 },
      { x: desk.cx + desk.width * 0.20, y: desk.cy, w: 68, h: 68, angle: 0, frictionMul: 0.88 }
    );
    // Center Drift Spinner Turntable
    battleState.spinPads.push(
      { id: 'sp_ice', x: desk.cx, y: desk.cy, r: 28, spinForce: 0.035, vortexForce: 0.15, currentAngle: 0, rotSpeed: 0.04 }
    );
  } else if (sid === 'volcano') {
    // Central hazard core
    battleState.bumpers.push(
      { x: desk.cx, y: desk.cy, r: 24 }
    );
    // Magma Jet Boosters (Spawn safe: distance > 130px)
    battleState.boostPads.push(
      { id: 'bp_vol1', x: desk.cx - desk.width * 0.12, y: desk.cy + desk.height * 0.08, w: 38, h: 46, angle: -Math.PI * 0.35, boostForce: 3.2 },
      { id: 'bp_vol2', x: desk.cx + desk.width * 0.12, y: desk.cy - desk.height * 0.08, w: 38, h: 46, angle: Math.PI * 0.65, boostForce: 3.2 }
    );
    // 2 Basalt High-Friction Footings
    battleState.frictionZones.push(
      { x: desk.cx, y: desk.cy + desk.height * 0.16, w: 54, h: 32, angle: 0, frictionMul: 0.92 },
      { x: desk.cx, y: desk.cy - desk.height * 0.16, w: 54, h: 32, angle: 0, frictionMul: 0.92 }
    );
  }
}

function initBattleMatch() {
  hideMatchResultModal();
  clearTimeout(cpuThinkTimeout);
  resizeBattleCanvas();
  if (!battleState.mode) battleState.mode = selectedSortieDiff || 'cpu-expert';
  let selectedStage = battleState.rawStage || selectedSortieStage || document.getElementById('sortieStageSelect')?.value || 'random';
  if (selectedStage === 'random') {
    selectedStage = getRandomStageId();
  }
  battleState.stage = selectedStage;
  battleState.p1Score = 0;
  battleState.p2Score = 0;
  battleState.undoHistory = [];
  startBattleRound(1);
}

function startBattleRound(roundNum) {
  clearTimeout(cpuThinkTimeout);
  battleState.turn = 1;

  // Determine starting player from battleState.turnOrder
  const orderSetting = battleState.turnOrder || selectedSortieOrder || 'p1-first';
  let startingPlayer = 1;
  if (orderSetting === 'p2-first') {
    startingPlayer = 2;
  } else if (orderSetting === 'random') {
    startingPlayer = Math.random() < 0.5 ? 1 : 2;
  }
  battleState.startingPlayer = startingPlayer;
  battleState.activePlayer = startingPlayer;
  battleState.phase = 'aim';
  battleState.suddenDeathShrink = 0;
  battleState.particles = [];
  battleState.burstDebris = [];
  battleState.screenShake = 0;
  battleState.flashAlpha = 0;

  const desk = getDeskBounds();
  setupStageGimmicks();

  let p1Build, p2Build;
  if (battleState.mode === 'p2p-online' && window.p2pState && window.p2pState.connected) {
    if (window.p2pState.myPlayerNum === 1) {
      p1Build = JSON.parse(JSON.stringify(currentBuild));
      enforceConnectedGlyphs(p1Build.glyphs, null, true);
      p2Build = createRivalBuild();
    } else {
      p1Build = createRivalBuild();
      p2Build = JSON.parse(JSON.stringify(currentBuild));
      enforceConnectedGlyphs(p2Build.glyphs, null, true);
    }
  } else {
    p1Build = JSON.parse(JSON.stringify(currentBuild));
    enforceConnectedGlyphs(p1Build.glyphs, null, true);
    p2Build = createRivalBuild();
  }

  const p1Spec = calculateMachineSpec(p1Build);
  const p2Spec = calculateMachineSpec(p2Build);

  // Stage-Adaptive Fair Spawn Positions (guaranteeing generous edge margin & no 1-turn kill)
  let p1StartX, p1StartY, p2StartX, p2StartY;
  if (desk.isRound) {
    const r = desk.radius * 0.46;
    const angle = Math.PI * 0.25;
    p1StartX = desk.cx - Math.cos(angle) * r;
    p1StartY = desk.cy + Math.sin(angle) * r;
    p2StartX = desk.cx + Math.cos(angle) * r;
    p2StartY = desk.cy - Math.sin(angle) * r;
  } else if (battleState.stage === 'bridge') {
    p1StartX = desk.cx - 16;
    p1StartY = desk.bottom - desk.height * 0.22;
    p2StartX = desk.cx + 16;
    p2StartY = desk.top + desk.height * 0.22;
  } else if (battleState.stage === 'ice_glass') {
    p1StartX = desk.cx - desk.width * 0.16;
    p1StartY = desk.bottom - desk.height * 0.20;
    p2StartX = desk.cx + desk.width * 0.16;
    p2StartY = desk.top + desk.height * 0.20;
  } else if (battleState.stage === 'gridlock') {
    p1StartX = desk.cx - desk.width * 0.17;
    p1StartY = desk.bottom - desk.height * 0.22;
    p2StartX = desk.cx + desk.width * 0.17;
    p2StartY = desk.top + desk.height * 0.22;
  } else {
    p1StartX = desk.cx - desk.width * 0.19;
    p1StartY = desk.bottom - desk.height * 0.23;
    p2StartX = desk.cx + desk.width * 0.19;
    p2StartY = desk.top + desk.height * 0.23;
  }

  battleState.units = [
    {
      id: 1,
      x: p1StartX,
      y: p1StartY,
      vx: 0,
      vy: 0,
      angle: 0,
      angVel: 0,
      damagePct: 0,
      skillStock: 0,
      lastSkillThreshold: 0,
      skillCooldown: 0,
      spinType: 'normal',
      fallen: false,
      burst: false,
      boostCooldown: 0,
      lastBoostPadId: null,
      build: p1Build,
      spec: p1Spec
    },
    {
      id: 2,
      x: p2StartX,
      y: p2StartY,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      angVel: 0,
      damagePct: 0,
      skillStock: 0,
      lastSkillThreshold: 0,
      skillCooldown: 0,
      spinType: 'normal',
      fallen: false,
      burst: false,
      boostCooldown: 0,
      lastBoostPadId: null,
      build: p2Build,
      spec: p2Spec
    }
  ];

  if (window._pendingRewardedSkillBonus && roundNum === 1) {
    window._pendingRewardedSkillBonus = false;
    battleState.units[0].skillStock = (battleState.units[0].skillStock || 0) + 1;
  }

  saveBattleUndoSnapshot();
  updateBattleHUD();
  const isOnline = (battleState.mode === 'p2p-online');
  const isHumanP2 = (battleState.mode === 'pvp' || isOnline);
  const orderDesc = isEn()
    ? ((battleState.activePlayer === 1)
        ? '1P GOES FIRST! DRAG & RELEASE TO LAUNCH!'
        : (isHumanP2 ? '2P GOES FIRST! GET READY!' : 'CPU GOES FIRST! WATCH OUT FOR INITIAL IMPACT!'))
    : ((battleState.activePlayer === 1)
        ? '1P 先手で開始！引っ張って狙え！'
        : (isHumanP2 ? '2P 先手で開始！' : 'CPU 先手で開始！相手の初手を警戒せよ！'));
  showCenterBanner(`ROUND ${roundNum}`, 'FIGHT!!', orderDesc, 1400);

  // If CPU starts first (1P is second)
  if (battleState.activePlayer === 2 && !isHumanP2) {
    cpuThinkTimeout = setTimeout(executeCPUTurn, 1600);
  }
}

function saveBattleUndoSnapshot() {
  const snap = {
    turn: battleState.turn,
    activePlayer: battleState.activePlayer,
    p1Score: battleState.p1Score,
    p2Score: battleState.p2Score,
    suddenDeathShrink: battleState.suddenDeathShrink,
    units: battleState.units.map(u => ({
      id: u.id,
      x: u.x,
      y: u.y,
      angle: u.angle,
      damagePct: u.damagePct,
      skillStock: u.skillStock || 0,
      lastSkillThreshold: u.lastSkillThreshold || 0,
      fallen: false
    }))
  };
  battleState.undoHistory.push(JSON.stringify(snap));
  if (battleState.undoHistory.length > 20) battleState.undoHistory.shift();
}

function undoBattleTurn() {
  if (battleState.undoHistory.length === 0) {
    showBattleToast(isEn() ? 'No earlier turn to undo' : 'これ以上戻せる手番がありません');
    return;
  }
  clearTimeout(cpuThinkTimeout);
  const raw = battleState.undoHistory.pop();
  const snap = JSON.parse(raw);

  battleState.turn = snap.turn;
  battleState.activePlayer = 1; // Always rewind to start of Player 1's turn!
  battleState.phase = 'aim';
  battleState.p1Score = snap.p1Score;
  battleState.p2Score = snap.p2Score;
  battleState.suddenDeathShrink = snap.suddenDeathShrink;

  snap.units.forEach((su, idx) => {
    const u = battleState.units[idx];
    if (u) {
      u.x = su.x;
      u.y = su.y;
      u.vx = 0;
      u.vy = 0;
      u.angle = su.angle;
      u.angVel = 0;
      u.damagePct = su.damagePct;
      u.skillStock = su.skillStock || 0;
      u.lastSkillThreshold = su.lastSkillThreshold || 0;
      u.fallen = false;
      u.burst = false;
    }
  });

  battleState.burstDebris = [];
  battleState.screenShake = 0;
  battleState.flashAlpha = 0;
  sfx.playClick();
  showBattleToast(isEn() ? 'UNDO // Rewound to start of your turn' : 'UNDO // 思考開始前の手番冒頭まで巻き戻しました');
  updateBattleHUD();
}

function addUnitDamage(unit, amount) {
  if (!unit || unit.fallen) return;
  const oldPct = unit.damagePct;
  unit.damagePct = Math.min(260, Math.round(oldPct + amount));

  if (unit.lastSkillThreshold === undefined) {
    unit.lastSkillThreshold = 0;
  }

  let gained = 0;
  while (unit.damagePct >= unit.lastSkillThreshold + 10) {
    unit.lastSkillThreshold += 10;
    unit.skillStock = (unit.skillStock || 0) + 1;
    gained++;
  }

  if (gained > 0) {
    sfx.playSkill();
    showBattleToast(isEn() ? `${unit.id === 1 ? '1P' : '2P/CPU'} SKILL CHARGED +${gained}! Damage ${unit.damagePct}% (Stock: ${unit.skillStock})` : `${unit.id === 1 ? '1P' : 'CPU'} 必殺技チャージ +${gained}！ 蓄積ダメージ ${unit.damagePct}% (ストック: ${unit.skillStock})`);
  }
  updateBattleHUD();
}

function activateUnitSkill(unit, targetUnits, particleArr) {
  if (!unit || unit.fallen) return;
  if ((unit.skillStock || 0) <= 0) return;
  if (unit.skillCooldown && unit.skillCooldown > 0) return;

  unit.skillStock -= 1;
  unit.skillCooldown = 15;
  sfx.playSkill();

  const skillId = unit.spec.activeSkill.id;
  const curSpd = Math.hypot(unit.vx, unit.vy);
  // Activates at any timing from launch until full stop
  const moveAng = (curSpd > 0.08) ? Math.atan2(unit.vy, unit.vx) : unit.angle;

  if (skillId === 'slash') {
    unit.vx += Math.cos(moveAng) * 5.5;
    unit.vy += Math.sin(moveAng) * 5.5;
    spawnParticles(particleArr, unit.x, unit.y, '#ef4444', 24, 8);
  } else if (skillId === 'boost') {
    unit.vx += Math.cos(moveAng) * 6.8;
    unit.vy += Math.sin(moveAng) * 6.8;
    spawnParticles(particleArr, unit.x, unit.y, '#10b981', 24, 9);
  } else if (skillId === 'anchor') {
    unit.vx = 0;
    unit.vy = 0;
    unit.angVel = 0;
    spawnParticles(particleArr, unit.x, unit.y, '#38bdf8', 20, 5);
  } else if (skillId === 'vortex') {
    unit.angVel = 0.55;
    targetUnits.forEach(t => {
      if (t === unit || t.fallen) return;
      const d = Math.hypot(t.x - unit.x, t.y - unit.y);
      if (d < 150) {
        const a = Math.atan2(t.y - unit.y, t.x - unit.x);
        t.vx += Math.cos(a + 0.35) * 6.0;
        t.vy += Math.sin(a + 0.35) * 6.0;
        t.angVel += 0.35;
      }
    });
    spawnParticles(particleArr, unit.x, unit.y, '#a855f7', 28, 9);
  } else if (skillId === 'buster') {
    targetUnits.forEach(t => {
      if (t === unit || t.fallen) return;
      const d = Math.hypot(t.x - unit.x, t.y - unit.y);
      if (d < 160) {
        const a = Math.atan2(t.y - unit.y, t.x - unit.x);
        const force = (1 - d / 170) * 9.2;
        t.vx += Math.cos(a) * force;
        t.vy += Math.sin(a) * force;
      }
    });
    spawnParticles(particleArr, unit.x, unit.y, '#f59e0b', 30, 10);
  }

  showBattleToast(isEn() ? `${unit.id === 1 ? '1P' : '2P/CPU'} ULTIMATE SKILL: ${unit.spec.activeSkill.title} (${unit.skillStock} left)` : `${unit.id === 1 ? '1P' : 'CPU'} 必殺技発動: ${unit.spec.activeSkill.title} (残り ${unit.skillStock} 回)`);
  updateBattleHUD();
}

function launchUnit(unit, powerRatio, angle, spinType) {
  // Balanced responsive launch speed
  const launchSpd = Math.max(3.2, powerRatio * unit.spec.maxLaunchSpeed);
  unit.vx = Math.cos(angle) * launchSpd;
  unit.vy = Math.sin(angle) * launchSpd;
  unit.spinType = spinType || 'normal';
  unit.angVel = (spinType === 'top' ? 0.04 : spinType === 'back' ? -0.04 : 0);
  unit.skillReady = true;
  unit.skillUsedThisTurn = false;

  battleState.phase = 'moving';
  sfx.playShoot(powerRatio);
  updateBattleHUD();
}

function executeCPUTurn() {
  if (battleState.phase !== 'aim' || battleState.activePlayer !== 2) return;
  const cpu = battleState.units[1];
  const p1 = battleState.units[0];
  if (!cpu || !p1 || cpu.fallen || p1.fallen) return;

  const desk = getDeskBounds();
  const mode = battleState.mode || 'cpu-normal';

  // Vector to Player
  const dx = p1.x - cpu.x;
  const dy = p1.y - cpu.y;
  const directDist = Math.hypot(dx, dy);
  const directAngle = Math.atan2(dy, dx);

  // Player distance to desk edges (find nearest edge for lethal push-out)
  const distToLeft = p1.x - desk.left;
  const distToRight = desk.right - p1.x;
  const distToTop = p1.y - desk.top;
  const distToBottom = desk.bottom - p1.y;
  const minEdgeDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

  // Multi-Candidate Trajectory & Impact Search
  const angleOffsets = (mode === 'cpu-expert')
    ? [-0.32, -0.22, -0.14, -0.06, 0, 0.06, 0.14, 0.22, 0.32]
    : (mode === 'cpu-hard')
      ? [-0.20, -0.10, 0, 0.10, 0.20]
      : [-0.08, 0, 0.08];

  const powerSteps = (mode === 'cpu-expert')
    ? [0.48, 0.62, 0.76, 0.88, 0.98]
    : (mode === 'cpu-hard')
      ? [0.55, 0.72, 0.88]
      : [0.58, 0.75];

  const spinCandidates = (mode === 'cpu-expert' || mode === 'cpu-hard')
    ? ['normal', 'back', 'top']
    : ['normal', 'back'];

  let bestScore = -Infinity;
  let bestAngle = directAngle;
  let bestPower = 0.74;
  let bestSpin = 'normal';

  // Evaluate candidate shots using virtual physics approximation
  for (const aOff of angleOffsets) {
    const testAngle = directAngle + aOff;
    for (const testPower of powerSteps) {
      for (const testSpin of spinCandidates) {
        let score = 0;

        const launchSpd = (cpu.spec.maxLaunchSpeed || 16) * testPower;
        const vx = Math.cos(testAngle) * launchSpd;
        const vy = Math.sin(testAngle) * launchSpd;

        // Intersection with P1's bounding sphere
        const tColl = Math.max(0, (dx * vx + dy * vy) / (vx * vx + vy * vy + 0.001));
        const closestX = cpu.x + vx * tColl;
        const closestY = cpu.y + vy * tColl;
        const missDist = Math.hypot(closestX - p1.x, closestY - p1.y);
        const contactRadius = (cpu.spec.boundingRadius || 28) + (p1.spec.boundingRadius || 28);

        if (missDist < contactRadius * 1.15) {
          score += 150; // Successful hit candidate

          // Knockback transfer calculation
          const massRatio = Math.max(0.65, Math.min(1.45, cpu.spec.weight / (p1.spec.weight + 0.001)));
          const atkMult = (cpu.spec.atk || 60) / 60;
          const hitPower = launchSpd * massRatio * atkMult * (1 - missDist / (contactRadius * 1.3));

          // Post-collision P1 position estimate
          const p1KnockAngle = Math.atan2(p1.y - closestY, p1.x - closestX);
          const p1FinalX = p1.x + Math.cos(p1KnockAngle) * hitPower * 14;
          const p1FinalY = p1.y + Math.sin(p1KnockAngle) * hitPower * 14;

          // Check if P1 is knocked out of desk
          const p1RingOut = desk.isRound
            ? Math.hypot(p1FinalX - desk.cx, p1FinalY - desk.cy) > desk.radius
            : (p1FinalX < desk.left || p1FinalX > desk.right || p1FinalY < desk.top || p1FinalY > desk.bottom);

          if (p1RingOut) {
            score += 1500; // Tremendous reward for ring-out kill!
          } else {
            const p1DistToEdge = desk.isRound
              ? desk.radius - Math.hypot(p1FinalX - desk.cx, p1FinalY - desk.cy)
              : Math.min(p1FinalX - desk.left, desk.right - p1FinalX, p1FinalY - desk.top, desk.bottom - p1FinalY);
            score += (160 - Math.max(0, p1DistToEdge)) * 3;
          }

          // Estimate post-collision CPU position
          // Backspin stops CPU quickly after hit! Topspin drives through!
          const reboundFriction = (testSpin === 'back') ? 0.35 : (testSpin === 'top') ? 0.90 : 0.62;
          const cpuFinalX = closestX + vx * reboundFriction * 6;
          const cpuFinalY = closestY + vy * reboundFriction * 6;

          const cpuRingOut = desk.isRound
            ? Math.hypot(cpuFinalX - desk.cx, cpuFinalY - desk.cy) > desk.radius * 0.96
            : (cpuFinalX < desk.left + 15 || cpuFinalX > desk.right - 15 || cpuFinalY < desk.top + 15 || cpuFinalY > desk.bottom - 15);

          if (cpuRingOut) {
            score -= 3500; // Strict penalty for self ring-out!
          } else {
            // Reward staying safe near center
            const cpuDistFromCenter = Math.hypot(cpuFinalX - desk.cx, cpuFinalY - desk.cy);
            score -= cpuDistFromCenter * 0.35;
          }

          // Backspin tactical bonus when playing near edge
          if (testSpin === 'back' && minEdgeDist < 90) {
            score += 200;
          }
          // Topspin lethal push bonus when P1 is near edge
          if (testSpin === 'top' && minEdgeDist < 60) {
            score += 260;
          }
        } else {
          score -= 500 + missDist * 2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestAngle = testAngle;
          bestPower = testPower;
          bestSpin = testSpin;
        }
      }
    }
  }

  // Jitter based on difficulty mode
  const jitterMag = (mode === 'cpu-expert') ? 0.012 : (mode === 'cpu-hard') ? 0.035 : 0.10;
  bestAngle += (Math.random() - 0.5) * jitterMag;

  const spinLabels = isEn()
    ? { top: 'DRIVE', normal: 'NORMAL', back: 'BRAKE' }
    : { top: '前進', normal: '標準', back: '急停止' };
  showBattleToast(isEn()
    ? `${cpu.spec.name} [${spinLabels[bestSpin] || 'NORMAL'}] locks on & fires!`
    : `${cpu.spec.name} [${spinLabels[bestSpin] || '標準'}] 精密狙い撃ち!`);
  launchUnit(cpu, bestPower, bestAngle, bestSpin);

  // High-performance tactical skill trigger
  if ((cpu.skillStock || 0) > 0 && !cpu.fallen) {
    const cpuSkillChecker = setInterval(() => {
      if (battleState.phase !== 'moving' || cpu.fallen || (cpu.skillStock || 0) <= 0) {
        clearInterval(cpuSkillChecker);
        return;
      }
      const dNow = Math.hypot(p1.x - cpu.x, p1.y - cpu.y);
      const curDesk = getDeskBounds();
      const distToEdge = curDesk.isRound
        ? curDesk.radius - Math.hypot(cpu.x - curDesk.cx, cpu.y - curDesk.cy)
        : Math.min(cpu.x - curDesk.left, curDesk.right - cpu.x, cpu.y - curDesk.top, curDesk.bottom - cpu.y);

      const skillId = cpu.spec.activeSkill.id;
      let shouldFire = false;
      if (skillId === 'anchor' && distToEdge < 45) shouldFire = true;
      else if ((skillId === 'slash' || skillId === 'boost' || skillId === 'buster') && dNow < 120) shouldFire = true;
      else if (skillId === 'vortex' && dNow < 140) shouldFire = true;
      else if (mode === 'cpu-expert' && dNow < 95) shouldFire = true;

      if (shouldFire) {
        clearInterval(cpuSkillChecker);
        activateUnitSkill(cpu, battleState.units, battleState.particles);
      }
    }, 60);
  }
}


// ============================================================================
// BURST FINISHER SYSTEM (Damage% & Machine Geometry Structural Fracture)
// ============================================================================

function checkBurstCondition(defender, attacker, hit, impactMag) {
  const dmg = defender.damagePct || 0;
  // Below 25% damage: Structural integrity is solid, cannot burst
  if (dmg < 25) return false;

  const spec = defender.spec;
  const glyphs = defender.build?.glyphs || [];
  if (glyphs.length < 2) return false; // Single glyph cannot shatter into pieces

  // 1. Machine Geometry & Structural Dispersion Calculation
  // Calculates average dispersion distance of glyph joints from center of mass:
  // Compact cluster machines have low dispersion (joints reinforced by adjacent glyphs).
  // Long, spindly or high-aspect ratio machines have high dispersion (higher mechanical moment).
  const numGlyphs = Math.max(1, spec.subBoxes.length);
  const avgDist = spec.subBoxes.reduce((acc, b) => acc + Math.hypot(b.relX, b.relY), 0) / numGlyphs;
  const dispersion = Math.min(1.6, Math.max(0.75, avgDist / 28.0));

  // 2. Armor Rigidity (Higher Def & Weight reinforce weld bonds)
  const rigidity = Math.max(0.65, (spec.def * 0.70 + spec.weight * 2.0) / 100);

  // 3. Attacker Cutting / Shear Intensity (Attack stat + Blade Stroke Sharpness)
  const atkBonus = 1.0 + (attacker.spec.atk - 50) * 0.008;
  const sharpnessBonus = 1.0 + (hit.sharpnessSum || 0) * 0.12;

  // 4. Physical Impact Force (Impact velocity normalized)
  const impactStress = Math.max(0.2, (impactMag - 2.0) / 7.5);

  // 5. Exponential Damage Instability: At ~40% damage, firmly within lethal burst territory!
  const damageFactor = Math.pow(Math.max(0, (dmg - 22) / 22.0), 1.35);

  const totalStress = (damageFactor * impactStress * atkBonus * sharpnessBonus * dispersion) / (rigidity * 1.65);

  // Thresholds:
  // totalStress >= 1.10 -> Guaranteed Critical Fracture (100%)
  // totalStress >= 0.45 -> Probabilistic Fracture (0% to 100%)
  if (totalStress >= 1.10) return true;
  if (totalStress >= 0.45) {
    const chance = (totalStress - 0.45) / 0.65;
    return Math.random() < chance;
  }
  return false;
}

function spawnBurstSparks(arr, x, y, impactAngle, count = 120) {
  const sparkColors = ['#ffffff', '#fef08a', '#f59e0b', '#f97316', '#ef4444', '#00e5ff'];

  // High-velocity spark streaks
  for (let i = 0; i < count; i++) {
    const a = impactAngle + (Math.random() - 0.5) * Math.PI * 1.85;
    const speed = 7 + Math.random() * 24;
    const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    arr.push({
      isSpark: true,
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 14,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      drag: 0.90 + Math.random() * 0.05,
      life: 1.0,
      decay: 0.014 + Math.random() * 0.024,
      size: 1.6 + Math.random() * 2.8,
      color
    });
  }

  // Expanding shockwave rings
  arr.push({
    isShockwave: true,
    x,
    y,
    r: 6,
    speed: 9.0,
    maxR: 95,
    lineWidth: 5.0,
    life: 1.0,
    decay: 0.035,
    color: '#ffffff'
  });
  arr.push({
    isShockwave: true,
    x,
    y,
    r: 10,
    speed: 13.0,
    maxR: 135,
    lineWidth: 3.5,
    life: 1.0,
    decay: 0.030,
    color: '#f59e0b'
  });

  // Glowing core fireball fragments
  for (let j = 0; j < 35; j++) {
    const ca = Math.random() * Math.PI * 2;
    const csp = 2.5 + Math.random() * 8.5;
    arr.push({
      x,
      y,
      vx: Math.cos(ca) * csp,
      vy: Math.sin(ca) * csp,
      life: 1.0,
      decay: 0.03 + Math.random() * 0.04,
      size: 4 + Math.random() * 6,
      color: j % 2 === 0 ? '#ffedd5' : '#ea580c'
    });
  }
}

function triggerBurstMachine(victim, attacker, hit, impactMag, isRemote = false) {
  if (victim.burst) return;
  victim.burst = true;
  victim.fallen = true; // Mark as fallen so standard round resolution picks up victory!

  // 1. Shatter Machine into Individual Glyph Physics Debris
  const scale = 0.90;
  const vSpec = victim.spec;
  const glyphs = victim.build?.glyphs || [];

  glyphs.forEach(g => {
    const relX = (g.x - vSpec.cx) * scale;
    const relY = (g.y - vSpec.cy) * scale;
    const cos = Math.cos(victim.angle);
    const sin = Math.sin(victim.angle);
    const worldX = victim.x + (relX * cos - relY * sin);
    const worldY = victim.y + (relX * sin + relY * cos);

    let burstAng = Math.atan2(worldY - hit.contactY, worldX - hit.contactX);
    if (Math.hypot(worldX - hit.contactX, worldY - hit.contactY) < 5) {
      burstAng = Math.random() * Math.PI * 2;
    }
    burstAng += (Math.random() - 0.5) * 0.7;
    const burstSpeed = 7 + Math.random() * 11 + Math.min(6, impactMag * 0.35);

    battleState.burstDebris.push({
      x: worldX,
      y: worldY,
      vx: Math.cos(burstAng) * burstSpeed,
      vy: Math.sin(burstAng) * burstSpeed,
      angle: victim.angle + (g.angle * Math.PI / 180),
      angVel: (Math.random() - 0.5) * 0.65,
      char: g.char,
      scale: (g.scale || 100) * scale,
      mat: g.mat,
      color: g.color,
      depthColor: g.depthColor,
      font: g.font || 'heavy',
      life: 1.0,
      floorFriction: 0.94
    });
  });

  // 2. Spectacular Burst Sparks & Shockwave Blast
  const impactAng = Math.atan2(victim.y - attacker.y, victim.x - attacker.x);
  spawnBurstSparks(battleState.particles, hit.contactX, hit.contactY, impactAng, 120);

  // 3. Screen Impact: Flash & Heavy Shake
  battleState.screenShake = 24;
  battleState.flashAlpha = 0.70;

  // 4. Sound & Audio
  sfx.playBurst();

  // 5. Broadcast in P2P Online Mode
  if (!isRemote && battleState.mode === 'p2p-online' && window.p2pState?.connected && window.p2pState.isHost && window.p2pState.conn) {
    window.p2pState.conn.send({
      type: 'BURST_EVENT',
      victimId: victim.id,
      contactX: hit.contactX,
      contactY: hit.contactY,
      impactMag
    });
  }

  // 6. Center Banner & Toast
  showBattleToast(isEn() ? 'CRITICAL BURST! Machine structure fractured!' : 'バースト発生！機体接合部が完全破断！');
}

function drawBurstDebris(ctx) {
  if (!battleState.burstDebris || battleState.burstDebris.length === 0) return;

  for (let i = battleState.burstDebris.length - 1; i >= 0; i--) {
    const d = battleState.burstDebris[i];
    d.x += d.vx;
    d.y += d.vy;
    d.angle += d.angVel;
    d.vx *= d.floorFriction;
    d.vy *= d.floorFriction;
    d.angVel *= 0.95;
    d.life -= 0.006;

    if (d.life <= 0) {
      battleState.burstDebris.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.globalAlpha = Math.max(0, Math.min(1, d.life * 1.6));

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 18 * (d.scale / 100), 18 * (d.scale / 100), 0, 0, Math.PI * 2);
    ctx.fill();

    const fontObj = GLYPH_FONTS[d.font] || GLYPH_FONTS.heavy;
    const fontSize = Math.round(36 * (d.scale / 100));
    ctx.font = `${fontObj.weight} ${fontSize}px ${fontObj.cssFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3D Depth
    ctx.fillStyle = d.depthColor || '#1e293b';
    for (let depth = 4; depth > 0; depth--) {
      ctx.fillText(d.char, depth * 0.7, depth * 0.9);
    }

    // Main Face
    ctx.fillStyle = d.color || '#38bdf8';
    ctx.fillText(d.char, 0, 0);

    // Fracture weld glow on edge
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.strokeText(d.char, 0, 0);

    ctx.restore();
  }
}

function updateBattlePhysicsAndRender() {
  const w = gameCanvas.width;
  const h = gameCanvas.height;
  gameCtx.clearRect(0, 0, w, h);

  let shakeX = 0, shakeY = 0;
  if (battleState.screenShake > 0) {
    shakeX = (Math.random() - 0.5) * battleState.screenShake;
    shakeY = (Math.random() - 0.5) * battleState.screenShake;
    battleState.screenShake *= 0.88;
    if (battleState.screenShake < 0.5) battleState.screenShake = 0;
  }

  gameCtx.save();
  if (shakeX !== 0 || shakeY !== 0) {
    gameCtx.translate(shakeX, shakeY);
  }

  const desk = getDeskBounds();

  // Draw Classroom Floor & Desk Surface
  gameCtx.fillStyle = '#090f1d';
  gameCtx.fillRect(0, 0, w, h);

  // Dynamic Desk Rendering per Stage Type (Wood, Carbon, Steel, Glass, Magma)
  if (desk.isRound) {
    // Round Colosseum Surface
    gameCtx.fillStyle = '#1e293b';
    gameCtx.beginPath();
    gameCtx.arc(desk.cx, desk.cy + 8, desk.radius + 6, 0, Math.PI * 2);
    gameCtx.fill();

    const roundGrad = gameCtx.createRadialGradient(desk.cx, desk.cy, 10, desk.cx, desk.cy, desk.radius);
    roundGrad.addColorStop(0, '#334155');
    roundGrad.addColorStop(0.7, '#1e293b');
    roundGrad.addColorStop(1, '#0f172a');
    gameCtx.fillStyle = roundGrad;
    gameCtx.beginPath();
    gameCtx.arc(desk.cx, desk.cy, desk.radius, 0, Math.PI * 2);
    gameCtx.fill();

    gameCtx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    gameCtx.lineWidth = 2.5;
    gameCtx.stroke();
  } else {
    // Rectangular / Bridges / Arenas
    const dtype = desk.deskType;
    let rimColor = '#78350f';
    let grad0 = '#d97706', grad5 = '#b45309', grad1 = '#92400e';

    if (dtype === 'glass') {
      rimColor = '#0369a1';
      grad0 = '#38bdf8'; grad5 = '#0284c7'; grad1 = '#075985';
    } else if (dtype === 'carbon') {
      rimColor = '#0f172a';
      grad0 = '#334155'; grad5 = '#1e293b'; grad1 = '#0f172a';
    } else if (dtype === 'cyber') {
      rimColor = '#431407';
      grad0 = '#ea580c'; grad5 = '#9a3412'; grad1 = '#18181b';
    } else if (dtype === 'magma') {
      rimColor = '#450a0a';
      grad0 = '#ef4444'; grad5 = '#b91c1c'; grad1 = '#7f1d1d';
    }

    gameCtx.fillStyle = rimColor;
    gameCtx.beginPath();
    gameCtx.roundRect(desk.left - 6, desk.top + 8, desk.width + 12, desk.height + 6, 16);
    gameCtx.fill();

    const grad = gameCtx.createLinearGradient(desk.left, desk.top, desk.left, desk.bottom);
    grad.addColorStop(0, grad0);
    grad.addColorStop(0.5, grad5);
    grad.addColorStop(1, grad1);
    gameCtx.fillStyle = grad;
    gameCtx.beginPath();
    gameCtx.roundRect(desk.left, desk.top, desk.width, desk.height, 12);
    gameCtx.fill();
  }

  // Danger Zone Inner Border
  gameCtx.strokeStyle = battleState.suddenDeathShrink > 0
    ? 'rgba(239, 68, 68, 0.75)'
    : 'rgba(254, 243, 199, 0.28)';
  gameCtx.lineWidth = 3;
  gameCtx.strokeRect(desk.left + 12, desk.top + 12, desk.width - 24, desk.height - 24);

  // 1. Draw High-Friction Zones (Sandpaper / Tactical Deceleration Mats)
  battleState.frictionZones.forEach(fz => {
    gameCtx.save();
    gameCtx.translate(fz.x, fz.y);
    gameCtx.rotate(fz.angle || 0);
    const hw = fz.w * 0.5;
    const hh = fz.h * 0.5;

    // Dark sandpaper texture base
    gameCtx.fillStyle = 'rgba(24, 32, 47, 0.88)';
    gameCtx.fillRect(-hw, -hh, fz.w, fz.h);

    // Diagonal rough hatching
    gameCtx.save();
    gameCtx.rect(-hw, -hh, fz.w, fz.h);
    gameCtx.clip();
    gameCtx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
    gameCtx.lineWidth = 1.5;
    gameCtx.beginPath();
    const step = 12;
    for (let x = -hw - hh; x < hw + hh; x += step) {
      gameCtx.moveTo(x, -hh);
      gameCtx.lineTo(x + fz.h, hh);
    }
    gameCtx.stroke();
    gameCtx.restore();

    // High-tech warning border
    gameCtx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    gameCtx.setLineDash([6, 4]);
    gameCtx.lineWidth = 1.5;
    gameCtx.strokeRect(-hw, -hh, fz.w, fz.h);
    gameCtx.setLineDash([]);

    // HUD Label
    gameCtx.font = '700 9px "Rajdhani", sans-serif';
    gameCtx.fillStyle = '#f59e0b';
    gameCtx.textAlign = 'center';
    gameCtx.fillText('HIGH FRICTION', 0, -hh + 11);
    gameCtx.restore();
  });

  // 2. Draw Spin Pads (Rotating Turntables)
  battleState.spinPads.forEach(sp => {
    sp.currentAngle = (sp.currentAngle || 0) + (sp.rotSpeed || 0.04);
    gameCtx.save();
    gameCtx.translate(sp.x, sp.y);

    // Outer gear background
    gameCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    gameCtx.beginPath();
    gameCtx.arc(0, 0, sp.r, 0, Math.PI * 2);
    gameCtx.fill();

    // Rotating outer dash ring
    gameCtx.save();
    gameCtx.rotate(sp.currentAngle);
    gameCtx.strokeStyle = '#00e5ff';
    gameCtx.lineWidth = 2.5;
    gameCtx.setLineDash([7, 5]);
    gameCtx.beginPath();
    gameCtx.arc(0, 0, sp.r - 2, 0, Math.PI * 2);
    gameCtx.stroke();

    // Radial dial spokes
    gameCtx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    gameCtx.lineWidth = 1.5;
    gameCtx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      gameCtx.beginPath();
      gameCtx.moveTo(0, 0);
      gameCtx.lineTo(Math.cos(a) * (sp.r - 5), Math.sin(a) * (sp.r - 5));
      gameCtx.stroke();
    }
    gameCtx.restore();

    // Inner glowing core
    gameCtx.fillStyle = '#0284c7';
    gameCtx.beginPath();
    gameCtx.arc(0, 0, Math.max(6, sp.r * 0.28), 0, Math.PI * 2);
    gameCtx.fill();

    // Directional arc indicator
    gameCtx.save();
    gameCtx.rotate(sp.currentAngle * 1.8);
    gameCtx.strokeStyle = '#38bdf8';
    gameCtx.lineWidth = 2;
    gameCtx.beginPath();
    gameCtx.arc(0, 0, sp.r * 0.58, 0, Math.PI * 1.25);
    gameCtx.stroke();
    gameCtx.restore();

    gameCtx.restore();
  });

  // 3. Draw Boost Pads (Directional Launch Chevrons)
  battleState.boostPads.forEach(bp => {
    gameCtx.save();
    gameCtx.translate(bp.x, bp.y);
    gameCtx.rotate(bp.angle);
    const hw = bp.w * 0.5;
    const hh = bp.h * 0.5;

    // Dark sleek runway body
    gameCtx.fillStyle = 'rgba(12, 20, 34, 0.94)';
    gameCtx.fillRect(-hw, -hh, bp.w, bp.h);

    // Glowing cyan frame
    gameCtx.strokeStyle = '#00e5ff';
    gameCtx.lineWidth = 2;
    gameCtx.strokeRect(-hw, -hh, bp.w, bp.h);

    // Animated directional chevron arrows (>>>)
    const animProg = ((Date.now() * 0.0035) % 1.0);
    const numChev = 3;
    for (let i = 0; i < numChev; i++) {
      const prog = (i + animProg) / numChev;
      const cx = -hw + prog * bp.w;
      const alpha = Math.sin(prog * Math.PI);
      gameCtx.save();
      gameCtx.globalAlpha = Math.max(0.18, alpha);
      gameCtx.strokeStyle = '#00e5ff';
      gameCtx.lineWidth = 2.5;
      gameCtx.beginPath();
      gameCtx.moveTo(cx - 7, -hh + 7);
      gameCtx.lineTo(cx + 4, 0);
      gameCtx.lineTo(cx - 7, hh - 7);
      gameCtx.stroke();
      gameCtx.restore();
    }
    gameCtx.restore();
  });

  // Draw Rulers (Obstacles)
  battleState.obstacles.forEach(obs => {
    gameCtx.save();
    gameCtx.translate(obs.x, obs.y);
    gameCtx.rotate(obs.angle);
    gameCtx.fillStyle = 'rgba(245, 158, 11, 0.88)';
    gameCtx.strokeStyle = '#78350f';
    gameCtx.lineWidth = 2;
    gameCtx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
    gameCtx.strokeRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
    gameCtx.restore();
  });

  // Draw Pinball Bumpers
  battleState.bumpers.forEach(b => {
    gameCtx.save();
    gameCtx.fillStyle = '#ef4444';
    gameCtx.strokeStyle = '#fef08a';
    gameCtx.lineWidth = 3;
    gameCtx.beginPath();
    gameCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    gameCtx.fill();
    gameCtx.stroke();
    gameCtx.restore();
  });

  // Physics Step during 'moving'
  if (battleState.phase === 'moving' && !cgIsPlayingAd) {
    let anyMoving = false;

    battleState.units.forEach(u => {
      if (u.fallen) return;

      u.x += u.vx;
      u.y += u.vy;
      u.angle += u.angVel;

      const stg = BATTLE_STAGES[battleState.stage] || BATTLE_STAGES.standard;
      const stageFrictionMul = stg.frictionMul !== undefined ? stg.frictionMul : 1.0;
      const spinFrictionMod = u.spinType === 'top' ? 1.004 : u.spinType === 'back' ? 0.985 : 1.0;
      const rawFriction = Math.min(0.982, u.spec.friction * spinFrictionMod);
      const decel = (1 - rawFriction) * stageFrictionMul;
      // Balanced tactical deceleration: smooth slide with tactile grip
      const effFriction = Math.max(0.88, Math.min(0.984, 1 - decel));
      u.vx *= effFriction;
      u.vy *= effFriction;
      u.angVel *= (0.952 + (1 - stageFrictionMul) * 0.02);

      // Gimmick 1: High-Friction Zones (Balanced tactical deceleration, mass/grip respecting)
      battleState.frictionZones.forEach(fz => {
        const cosF = Math.cos(-fz.angle);
        const sinF = Math.sin(-fz.angle);
        const hw = fz.w * 0.5;
        const hh = fz.h * 0.5;
        const dx = u.x - fz.x;
        const dy = u.y - fz.y;
        const lx = dx * cosF - dy * sinF;
        const ly = dx * sinF + dy * cosF;
        if (Math.abs(lx) <= hw + 8 && Math.abs(ly) <= hh + 8) {
          const fMul = Math.max(0.88, fz.frictionMul || 0.92);
          u.vx *= fMul;
          u.vy *= fMul;
          u.angVel *= 0.94;
          if (Math.hypot(u.vx, u.vy) > 0.35 && Math.random() < 0.20) {
            spawnParticles(battleState.particles, u.x, u.y, '#f59e0b', 2, 2.0);
            sfx.playRough();
          }
        }
      });

      // Gimmick 2: Spin Pads (Balanced torque that respects machine grip and mass)
      battleState.spinPads.forEach(sp => {
        const dx = u.x - sp.x;
        const dy = u.y - sp.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= sp.r + 10) {
          const gripFactor = 1.0 - (u.spec.grip - 45) * 0.005;
          u.angVel += (sp.spinForce || 0.04) * gripFactor;
          if (dist > 2) {
            const nx = -dy / dist;
            const ny = dx / dist;
            const swirl = (sp.vortexForce || 0.14) * Math.sign(sp.spinForce) * gripFactor;
            u.vx += nx * swirl;
            u.vy += ny * swirl;
          }
          if (Math.random() < 0.18) {
            spawnParticles(battleState.particles, u.x, u.y, '#38bdf8', 2, 2.5);
            sfx.playSpin();
          }
        }
      });

      // Gimmick 3: Boost Pads (Additive tactical impulse scaling with machine mass)
      if (u.skillCooldown && u.skillCooldown > 0) {
        u.skillCooldown--;
      }
      if (u.boostCooldown > 0) {
        u.boostCooldown--;
      } else {
        u.lastBoostPadId = null;
      }

      battleState.boostPads.forEach(bp => {
        const cosB = Math.cos(-bp.angle);
        const sinB = Math.sin(-bp.angle);
        const hw = bp.w * 0.5;
        const hh = bp.h * 0.5;
        const dx = u.x - bp.x;
        const dy = u.y - bp.y;
        const lx = dx * cosB - dy * sinB;
        const ly = dx * sinB + dy * cosB;
        if (Math.abs(lx) <= hw + 10 && Math.abs(ly) <= hh + 10) {
          if (!u.lastBoostPadId || u.lastBoostPadId !== bp.id || u.boostCooldown <= 0) {
            u.lastBoostPadId = bp.id;
            u.boostCooldown = 18;
            const massScale = 18.0 / Math.max(10.0, u.spec.weight);
            const impulse = (bp.boostForce || 3.0) * massScale * 0.75;
            const bx = Math.cos(bp.angle);
            const by = Math.sin(bp.angle);
            // Additive kinetic boost (preserves momentum and enhances attack)
            u.vx += bx * impulse;
            u.vy += by * impulse;
            const maxSpd = 20;
            const curSpd = Math.hypot(u.vx, u.vy);
            if (curSpd > maxSpd) {
              u.vx = (u.vx / curSpd) * maxSpd;
              u.vy = (u.vy / curSpd) * maxSpd;
            }
            sfx.playBoost();
            spawnParticles(battleState.particles, u.x, u.y, '#00e5ff', 8, 4.5);
          }
        }
      });

      if (Math.hypot(u.vx, u.vy) < 0.06) {
        u.vx = 0;
        u.vy = 0;
        u.angVel = 0;
      } else {
        anyMoving = true;
      }

      // Shape-Aware Obstacle & Bumper Collisions (using actual character stroke nodes)
      const unitShapes = getWorldShapeColliders(u, 0.90);

      battleState.obstacles.forEach(obs => {
        const cosO = Math.cos(-obs.angle);
        const sinO = Math.sin(-obs.angle);
        const hw = obs.w * 0.5;
        const hh = obs.h * 0.5;
        let hitObs = false;

        for (let sIdx = 0; sIdx < unitShapes.length && !hitObs; sIdx++) {
          const nodes = unitShapes[sIdx].worldNodes;
          for (let nIdx = 0; nIdx < nodes.length; nIdx++) {
            const nd = nodes[nIdx];
            const dx = nd.x - obs.x;
            const dy = nd.y - obs.y;
            const lx = dx * cosO - dy * sinO;
            const ly = dx * sinO + dy * cosO;
            if (Math.abs(lx) < hw + nd.r && Math.abs(ly) < hh + nd.r) {
              if (Math.abs(lx) / hw > Math.abs(ly) / hh) {
                u.vx = -u.vx * 0.84;
                u.x += Math.sign(dx || 1) * 3.5;
              } else {
                u.vy = -u.vy * 0.84;
                u.y += Math.sign(dy || 1) * 3.5;
              }
              u.angVel += (Math.random() - 0.5) * 0.14;
              sfx.playHit(0.35, false);
              hitObs = true;
              break;
            }
          }
        }
      });

      battleState.bumpers.forEach(b => {
        let hitBumper = false;
        for (let sIdx = 0; sIdx < unitShapes.length && !hitBumper; sIdx++) {
          const nodes = unitShapes[sIdx].worldNodes;
          for (let nIdx = 0; nIdx < nodes.length; nIdx++) {
            const nd = nodes[nIdx];
            const dx = nd.x - b.x;
            const dy = nd.y - b.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b.r + nd.r;
            if (dist < minDist && dist > 0.05) {
              const nx = dx / dist;
              const ny = dy / dist;
              const push = (minDist - dist) + 2.5;
              u.x += nx * push;
              u.y += ny * push;
              const inSpd = Math.hypot(u.vx, u.vy);
              const outSpd = Math.max(inSpd * 0.82, Math.min(5.0, inSpd * 1.05 + 0.5));
              u.vx = nx * outSpd;
              u.vy = ny * outSpd;
              u.angVel += ((nd.x - u.x) * ny - (nd.y - u.y) * nx) * 0.004;
              sfx.playHit(0.7, true);
              spawnParticles(battleState.particles, b.x + nx * b.r, b.y + ny * b.r, '#fef08a', 12, 6);
              hitBumper = true;
              break;
            }
          }
        }
      });

      // Check Ring-Out (With Turn 1 Opening Safety to eliminate 1-Turn-Kill)
      let isRingOut = false;
      if (desk.isRound) {
        const distCenter = Math.hypot(u.x - desk.cx, u.y - desk.cy);
        if (battleState.turn === 1 && u.id === 2 && distCenter > desk.radius - 12) {
          // Turn 1 Opening Anchor: clamp P2 safely at perimeter
          u.x = desk.cx + (u.x - desk.cx) / distCenter * (desk.radius - 16);
          u.y = desk.cy + (u.y - desk.cy) / distCenter * (desk.radius - 16);
          u.vx *= 0.10;
          u.vy *= 0.10;
          spawnParticles(battleState.particles, u.x, u.y, '#38bdf8', 10, 4);
          showBattleToast(isEn() ? 'TURN 1 GUARD! Held on at the desk edge!' : '初手セーフティ発動！机端で踏みとどまった！');
        } else if (distCenter > desk.radius) {
          isRingOut = true;
        }
      } else {
        if (battleState.turn === 1 && u.id === 2) {
          const margin = 14;
          let clamped = false;
          if (u.x < desk.left + margin) { u.x = desk.left + margin; u.vx *= 0.10; clamped = true; }
          else if (u.x > desk.right - margin) { u.x = desk.right - margin; u.vx *= 0.10; clamped = true; }
          if (u.y < desk.top + margin) { u.y = desk.top + margin; u.vy *= 0.10; clamped = true; }
          else if (u.y > desk.bottom - margin) { u.y = desk.bottom - margin; u.vy *= 0.10; clamped = true; }
          if (clamped) {
            spawnParticles(battleState.particles, u.x, u.y, '#38bdf8', 10, 4);
            showBattleToast(isEn() ? 'TURN 1 GUARD! Held on at the desk edge!' : '初手セーフティ発動！机端で踏みとどまった！');
          }
        } else {
          isRingOut = (u.x < desk.left || u.x > desk.right || u.y < desk.top || u.y > desk.bottom);
        }
      }

      if (isRingOut && !u.fallen) {
        u.fallen = true;
        u.vx = 0;
        u.vy = 0;
        u.angVel = 0;
        sfx.playFall();
        spawnParticles(battleState.particles, u.x, u.y, '#ef4444', 28, 8);
      }
    });

    // Unit-vs-Unit Pixel-Accurate Character-Shape Collision
    const u1 = battleState.units[0];
    const u2 = battleState.units[1];
    if (u1 && u2 && !u1.fallen && !u2.fallen) {
      const hit = detectCompoundCollision(u1, u2, 0.90);
      if (hit) {
        const sep = hit.overlap * 0.58 + 0.6;
        u1.x -= hit.nx * sep;
        u1.y -= hit.ny * sep;
        u2.x += hit.nx * sep;
        u2.y += hit.ny * sep;

        const rvx = u2.vx - u1.vx;
        const rvy = u2.vy - u1.vy;
        const velNormal = rvx * hit.nx + rvy * hit.ny;

        if (velNormal < 0) {
          const e = Math.min(1.05, (u1.spec.restitution + u2.spec.restitution) * 0.5);
          const m1 = Math.max(14.0, Math.min(24.0, u1.spec.weight * 0.85));
          const m2 = Math.max(14.0, Math.min(24.0, u2.spec.weight * 0.85));

          let jImp = -(1 + e) * velNormal;
          jImp /= (1 / m1 + 1 / m2);
          jImp *= 1 + hit.sharpnessSum * 0.12;

          // First-turn protection to eliminate 1-Turn-Kill
          const turnCap = battleState.turn === 1 ? 0.65 : 1.0;

          const atkMod1 = 1.0 + (u1.spec.atk - 50) * 0.008;
          const defMod1 = 1.0 - (u1.spec.def - 50) * 0.006;
          const atkMod2 = 1.0 + (u2.spec.atk - 50) * 0.008;
          const defMod2 = 1.0 - (u2.spec.def - 50) * 0.006;

          let imp1Scale, imp2Scale;
          if (battleState.activePlayer === 1) {
            imp1Scale = (1.0 + u1.damagePct / 100) * 0.70 * turnCap;
            imp2Scale = (1.0 + u2.damagePct / 100) * atkMod1 * defMod2 * turnCap;
          } else {
            imp1Scale = (1.0 + u1.damagePct / 100) * atkMod2 * defMod1 * turnCap;
            imp2Scale = (1.0 + u2.damagePct / 100) * 0.70 * turnCap;
          }

          const impX = jImp * hit.nx;
          const impY = jImp * hit.ny;

          u1.vx -= (impX / m1) * imp1Scale;
          u1.vy -= (impY / m1) * imp1Scale;
          u2.vx += (impX / m2) * imp2Scale;
          u2.vy += (impY / m2) * imp2Scale;

          if (u1.spinType === 'back' && battleState.activePlayer === 1) {
            u1.vx *= 0.35;
            u1.vy *= 0.35;
          }
          if (u2.spinType === 'back' && battleState.activePlayer === 2) {
            u2.vx *= 0.35;
            u2.vy *= 0.35;
          }

          const impactMag = Math.min(18, Math.abs(velNormal));
          if (battleState.activePlayer === 1) {
            addUnitDamage(u1, impactMag * 0.5);
            addUnitDamage(u2, impactMag * 1.25);
          } else {
            addUnitDamage(u1, impactMag * 1.25);
            addUnitDamage(u2, impactMag * 0.5);
          }

          // Evaluate Critical Burst (Structural Shatter)
          if (!u1.burst && !u2.burst) {
            const attacker = (battleState.activePlayer === 1) ? u1 : u2;
            const defender = (battleState.activePlayer === 1) ? u2 : u1;
            if (checkBurstCondition(defender, attacker, hit, impactMag)) {
              triggerBurstMachine(defender, attacker, hit, impactMag);
            } else if (checkBurstCondition(attacker, defender, hit, impactMag * 0.7)) {
              triggerBurstMachine(attacker, defender, hit, impactMag * 0.7);
            }
          }

          // Physical torque from exact character stroke contact point
          const torque1 = ((hit.contactX - u1.x) * (-impY) - (hit.contactY - u1.y) * (-impX)) * 0.00042;
          const torque2 = ((hit.contactX - u2.x) * impY - (hit.contactY - u2.y) * impX) * 0.00042;
          u1.angVel += Math.max(-0.26, Math.min(0.26, torque1));
          u2.angVel += Math.max(-0.26, Math.min(0.26, torque2));

          sfx.playHit(Math.min(1, impactMag / 12), true);
          spawnParticles(battleState.particles, hit.contactX, hit.contactY, '#f59e0b', 18, 7);
          updateBattleHUD();
        }
      }
    }

    // Check Round Resolution or Next Turn (Wait until all movement completely stops!)
    if (!anyMoving) {
      if (u1.fallen || u2.fallen) {
        resolveRoundEnd();
      } else {
        advanceToNextTurn();
      }
    }
  }

  // Draw Units
  battleState.units.forEach(u => {
    if (u.fallen) return;

    if (battleState.phase === 'aim' && u.id === battleState.activePlayer) {
      gameCtx.save();
      gameCtx.strokeStyle = u.id === 1 ? '#38bdf8' : '#ef4444';
      gameCtx.lineWidth = 2.5;
      gameCtx.setLineDash([6, 4]);
      gameCtx.beginPath();
      gameCtx.arc(u.x, u.y, u.spec.boundingRadius * 0.78 + 8, 0, Math.PI * 2);
      gameCtx.stroke();
      gameCtx.restore();
    }

    drawEraserMachine(gameCtx, u.x, u.y, u.angle, u.build, {
      cachedSpec: u.spec,
      scale: 0.90
    });
  });

  // Render flying/sliding burst debris
  drawBurstDebris(gameCtx);

  // Interactive Tutorial Step 1 On-Canvas Drag Guide
  if (window.tutorialState && window.tutorialState.active && window.tutorialState.step === 1 && battleState.phase === 'aim' && !battleSlingshot.active) {
    const u1 = battleState.units[0];
    const u2 = battleState.units[1];
    if (u1 && u2 && !u1.fallen) {
      const tAnim = (Date.now() % 1800) / 1800;
      const pullProgress = Math.min(1, tAnim * 1.35);
      const toEnemyAng = Math.atan2(u2.y - u1.y, u2.x - u1.x);
      const dragAng = toEnemyAng + Math.PI;
      const dragDist = 30 + pullProgress * 68;
      const handX = u1.x + Math.cos(dragAng) * dragDist;
      const handY = u1.y + Math.sin(dragAng) * dragDist;

      gameCtx.save();
      // Dashed trajectory preview toward enemy
      gameCtx.strokeStyle = 'rgba(0, 229, 255, 0.72)';
      gameCtx.lineWidth = 3;
      gameCtx.setLineDash([8, 6]);
      gameCtx.beginPath();
      gameCtx.moveTo(u1.x, u1.y);
      gameCtx.lineTo(u1.x + Math.cos(toEnemyAng) * (dragDist * 1.4), u1.y + Math.sin(toEnemyAng) * (dragDist * 1.4));
      gameCtx.stroke();

      // Pullback line
      gameCtx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      gameCtx.lineWidth = 2.5;
      gameCtx.setLineDash([4, 4]);
      gameCtx.beginPath();
      gameCtx.moveTo(u1.x, u1.y);
      gameCtx.lineTo(handX, handY);
      gameCtx.stroke();
      gameCtx.setLineDash([]);

      // Pulsing drag cursor ring
      gameCtx.fillStyle = '#f59e0b';
      gameCtx.beginPath();
      gameCtx.arc(handX, handY, 8, 0, Math.PI * 2);
      gameCtx.fill();
      gameCtx.strokeStyle = '#ffffff';
      gameCtx.lineWidth = 2;
      gameCtx.stroke();

      // Floating instruction tag
      gameCtx.fillStyle = 'rgba(9, 13, 22, 0.92)';
      gameCtx.strokeStyle = '#00e5ff';
      gameCtx.lineWidth = 1.5;
      const tagW = 210;
      const tagH = 26;
      const tagX = u1.x - tagW * 0.5;
      const tagY = u1.y - 64;
      gameCtx.fillRect(tagX, tagY, tagW, tagH);
      gameCtx.strokeRect(tagX, tagY, tagW, tagH);

      gameCtx.fillStyle = '#00e5ff';
      gameCtx.font = '800 11px "Rajdhani", system-ui, sans-serif';
      gameCtx.textAlign = 'center';
      gameCtx.fillText(
        isEn() ? 'DRAG BACK & RELEASE TO LAUNCH!' : '後ろに引っ張って離すと発射！',
        u1.x,
        tagY + 17
      );
      gameCtx.restore();
    }
  }

  // Draw Aiming Slingshot Vector
  if (battleState.phase === 'aim' && battleSlingshot.active) {
    const activeUnit = battleState.units[battleState.activePlayer - 1];
    if (activeUnit) {
      const dx = battleSlingshot.startX - battleSlingshot.curX;
      const dy = battleSlingshot.startY - battleSlingshot.curY;
      const dist = Math.min(150, Math.hypot(dx, dy));
      if (dist > 8) {
        const ang = Math.atan2(dy, dx);
        const pct = Math.round((dist / 150) * 100);
        gameCtx.save();
        gameCtx.strokeStyle = pct > 80 ? '#ef4444' : '#38bdf8';
        gameCtx.lineWidth = 4;
        gameCtx.setLineDash([9, 5]);
        gameCtx.beginPath();
        gameCtx.moveTo(activeUnit.x, activeUnit.y);
        gameCtx.lineTo(
          activeUnit.x + Math.cos(ang) * dist * 1.45,
          activeUnit.y + Math.sin(ang) * dist * 1.45
        );
        gameCtx.stroke();
        gameCtx.setLineDash([]);

        gameCtx.fillStyle = '#f8fafc';
        gameCtx.font = '800 13px system-ui, sans-serif';
        gameCtx.fillText(`POWER ${pct}%`, activeUnit.x + 26, activeUnit.y - 26);
        gameCtx.restore();
      }
    }
  }

  // Render Particles & Sparks
  for (let i = battleState.particles.length - 1; i >= 0; i--) {
    const p = battleState.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.drag) {
      p.vx *= p.drag;
      p.vy *= p.drag;
    }
    p.life -= p.decay;
    if (p.life <= 0) {
      battleState.particles.splice(i, 1);
      continue;
    }
    if (p.isSpark) {
      gameCtx.save();
      gameCtx.strokeStyle = p.color;
      gameCtx.lineWidth = p.size;
      gameCtx.globalAlpha = Math.max(0, Math.min(1, p.life));
      gameCtx.beginPath();
      gameCtx.moveTo(p.x, p.y);
      const trailLen = Math.min(26, Math.hypot(p.vx, p.vy) * 2.2);
      const trailAng = Math.atan2(p.vy, p.vx);
      gameCtx.lineTo(p.x - Math.cos(trailAng) * trailLen, p.y - Math.sin(trailAng) * trailLen);
      gameCtx.stroke();
      gameCtx.restore();
    } else if (p.isShockwave) {
      p.r += p.speed;
      gameCtx.save();
      gameCtx.strokeStyle = p.color;
      gameCtx.lineWidth = Math.max(1, p.lineWidth * p.life);
      gameCtx.globalAlpha = Math.max(0, Math.min(1, p.life));
      gameCtx.beginPath();
      gameCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      gameCtx.stroke();
      gameCtx.restore();
    } else {
      gameCtx.fillStyle = p.color;
      gameCtx.globalAlpha = p.life;
      gameCtx.beginPath();
      gameCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      gameCtx.fill();
      gameCtx.globalAlpha = 1;
    }
  }

  gameCtx.restore(); // Restore screen shake

  // Screen Flash Overlay
  if (battleState.flashAlpha > 0) {
    gameCtx.save();
    gameCtx.fillStyle = `rgba(255, 255, 255, ${battleState.flashAlpha})`;
    gameCtx.fillRect(0, 0, w, h);
    gameCtx.restore();
    battleState.flashAlpha -= 0.045;
    if (battleState.flashAlpha < 0) battleState.flashAlpha = 0;
  }
}

function advanceToNextTurn() {
  document.getElementById('skillActionBtn')?.classList.add('hidden');
  battleState.activePlayer = battleState.activePlayer === 1 ? 2 : 1;

  // Turn count advances when returning to the starting player
  const startingPlayer = battleState.startingPlayer || 1;
  if (battleState.activePlayer === startingPlayer) {
    battleState.turn++;
    if (battleState.turn >= 7) {
      battleState.suddenDeathShrink = Math.min(130, (battleState.turn - 6) * 24);
      showBattleToast(isEn() ? 'SUDDEN DEATH: Desk shrinking & knockback amplified!' : 'SUDDEN DEATH: エリア縮小 / 吹っ飛び倍率上昇');
      battleState.units.forEach(u => { addUnitDamage(u, 15); });
    }
    saveBattleUndoSnapshot();
  }

  battleState.phase = 'aim';
  updateBattleHUD();

  if (typeof onTurnAdvancedP2P === 'function') {
    onTurnAdvancedP2P();
  }
  if (battleState.activePlayer === 2 && battleState.mode !== 'pvp' && battleState.mode !== 'p2p-online') {
    const thinkDelay = battleState.mode === 'cpu-expert' ? 520 : 650;
    cpuThinkTimeout = setTimeout(executeCPUTurn, thinkDelay);
  }
}

function resolveRoundEnd() {
  battleState.phase = 'round_end';
  document.getElementById('skillActionBtn')?.classList.add('hidden');

  const u1 = battleState.units[0];
  const u2 = battleState.units[1];

  let winner = 1;
  const isBurstFinish = (u1.burst || u2.burst);
  const isDoubleRingOut = (u1.fallen && u2.fallen && !isBurstFinish);

  if (u1.burst && !u2.burst) {
    winner = 2;
  } else if (!u1.burst && u2.burst) {
    winner = 1;
  } else if (isDoubleRingOut) {
    // Both units fell: the player whose turn it was loses (self-destruct)!
    winner = (battleState.activePlayer === 1) ? 2 : 1;
  } else if (u1.fallen && !u2.fallen) {
    winner = 2;
  } else if (!u1.fallen && u2.fallen) {
    winner = 1;
  } else {
    winner = (u1.damagePct <= u2.damagePct) ? 1 : 2;
  }

  if (winner === 1) battleState.p1Score++;
  else battleState.p2Score++;

  updateBattleHUD();

  const isOnline = (battleState.mode === 'p2p-online');
  const isHumanP2 = (battleState.mode === 'pvp' || isOnline);
  const myNum = (isOnline && window.p2pState) ? window.p2pState.myPlayerNum : 1;
  const didLocalWin = isOnline ? (winner === myNum) : (winner === 1);

  if (battleState.p1Score >= 2 || battleState.p2Score >= 2) {
    battleState.phase = 'match_over';
    sfx.playWin();
    if (typeof cgGameplayStop === 'function') cgGameplayStop();
    if (didLocalWin && typeof cgHappytime === 'function') cgHappytime();

    const champName = winner === 1 ? u1.spec.name : u2.spec.name;
    const shooterLabel = (battleState.activePlayer === 1) ? '1P' : (isHumanP2 ? '2P' : 'CPU');
    const winnerLabel = (winner === 1) ? '1P' : (isHumanP2 ? '2P' : 'CPU');

    const burstVictim = u1.burst ? u1 : u2;
    const championDesc = isEn()
      ? (isBurstFinish
          ? `BURST FINISH! ${burstVictim.spec.name}'s chassis was completely shattered by critical impact!`
          : (isDoubleRingOut
              ? `Double Ring-Out! Active shooter (${shooterLabel}) self-destructed — ${winnerLabel} takes the match!`
              : `${champName} dominates the desk arena!`))
      : (isBurstFinish
          ? `バースト粉砕決着！ 痛恨のクリティカル打撃により『${burstVictim.spec.name}』が完全空中分解！`
          : (isDoubleRingOut
              ? `両機落下（共倒れ）！ 手番側（${shooterLabel}）の自滅判定により ${winnerLabel} の完全制覇！`
              : `${champName} 完全制覇！`));

    showCenterBanner(
      isBurstFinish ? (didLocalWin ? 'BURST FINISH // VICTORY' : 'BURST SHATTER // DEFEAT') : (didLocalWin ? 'VICTORY // CHAMPION' : 'DEFEAT // RIVAL WIN'),
      isBurstFinish ? (isEn() ? 'CRITICAL SHATTER!' : '完全粉砕決着！') : (isEn() ? `${champName} WINS!` : `${champName} 優勝！`),
      championDesc,
      1800
    );

    setTimeout(() => {
      showMatchResultModal(winner, u1, u2);
    }, 1600);
  } else {
    const nextRound = battleState.p1Score + battleState.p2Score + 1;
    const shooterLabel = (battleState.activePlayer === 1) ? '1P' : (isHumanP2 ? '2P' : 'CPU');
    const winnerLabel = (winner === 1) ? '1P' : (isHumanP2 ? '2P' : 'CPU');

    const burstVictim = u1.burst ? u1 : u2;
    const roundDesc = isEn()
      ? (isBurstFinish
          ? `BURST FINISH! ${burstVictim.spec.name}'s chassis completely shattered under critical impact!`
          : (isDoubleRingOut
              ? `Double Ring-Out! ${shooterLabel} self-destructed — Point to ${winnerLabel}!`
              : 'Knocked the opponent clean off the desk!'))
      : (isBurstFinish
          ? `バースト粉砕決着！ 衝撃打撃により『${burstVictim.spec.name}』の文字接合が完全崩壊！`
          : (isDoubleRingOut
              ? `両機落下（共倒れ）！ 手番側（${shooterLabel}）の自滅判定で ${winnerLabel} にポイント！`
              : '相手を机から弾き落とした！'));

    showCenterBanner(
      isBurstFinish ? 'BURST FINISH!' : (winner === 1 ? '1P ROUND POINT!' : (isHumanP2 ? '2P ROUND POINT!' : 'RIVAL ROUND POINT!')),
      isBurstFinish ? (isEn() ? 'MACHINE CRUSHED!' : '完全粉砕KO！') : (isEn() ? `NEXT: ROUND ${nextRound}` : `ROUND ${nextRound} へ`),
      roundDesc,
      2000
    );
    setTimeout(() => {
      startBattleRound(nextRound);
    }, 1950);
  }
}

function updateBattleTelemetryPanels(u1, u2) {
  if (!u1 || !u2) return;

  // --- 1P ALLY PANEL ---
  const p1NameEl = document.getElementById('battleP1MachineName');
  if (p1NameEl) p1NameEl.textContent = u1.spec.name;
  const p1TypeEl = document.getElementById('battleP1TypeBadge');
  if (p1TypeEl) p1TypeEl.textContent = u1.spec.buildType;
  const p1WeightEl = document.getElementById('battleP1WeightVal');
  if (p1WeightEl) p1WeightEl.textContent = `${u1.spec.weight}g`;
  const p1AtkEl = document.getElementById('battleP1AtkVal');
  if (p1AtkEl) p1AtkEl.textContent = u1.spec.atk;
  const p1DefEl = document.getElementById('battleP1DefVal');
  if (p1DefEl) p1DefEl.textContent = u1.spec.def;
  const p1SpdEl = document.getElementById('battleP1SpdVal');
  if (p1SpdEl) p1SpdEl.textContent = u1.spec.spd;

  const p1HpEl = document.getElementById('battleP1HpVal');
  if (p1HpEl) {
    p1HpEl.textContent = `${u1.damagePct}%${u1.damagePct >= 40 ? ' [BURST RISK]' : ''}`;
    p1HpEl.style.color = u1.damagePct >= 65 ? 'var(--apex-red)' : u1.damagePct >= 40 ? '#f97316' : u1.damagePct >= 25 ? 'var(--apex-gold)' : '#ffffff';
  }
  const p1HpBar = document.getElementById('battleP1HpBar');
  if (p1HpBar) {
    p1HpBar.style.width = `${Math.min(100, Math.max(0, u1.damagePct))}%`;
  }

  // 1P Spin Badge
  const p1SpinEl = document.getElementById('battleP1SpinBadge');
  if (p1SpinEl) {
    const spinLabels = isEn() ? {
      top: 'DRIVE [TOP] (Aggressive Push)',
      normal: 'NORMAL [STD] (Balanced Slide)',
      back: 'BRAKE [BACK] (Quick Stop / Anti-Fall)'
    } : {
      top: '前進 [DRIVE] (突進・押し込み)',
      normal: '標準 [NORMAL] (バランス直進)',
      back: 'ブレーキ [BACK] (急停止・自滅防止)'
    };
    p1SpinEl.textContent = spinLabels[selectedSpinType] || spinLabels.normal;
  }

  // 1P Glyphs Chips
  const p1GlyphsContainer = document.getElementById('battleP1GlyphsList');
  if (p1GlyphsContainer && (!p1GlyphsContainer._cachedCount || p1GlyphsContainer._cachedCount !== u1.build.glyphs.length)) {
    p1GlyphsContainer._cachedCount = u1.build.glyphs.length;
    p1GlyphsContainer.innerHTML = '';
    u1.build.glyphs.forEach(g => {
      const mat = GLYPH_MATERIALS[g.mat] || GLYPH_MATERIALS.mecha;
      const chip = document.createElement('div');
      chip.className = 'battle-glyph-chip';
      chip.innerHTML = `<span class="chip-char">${g.char}</span><span class="chip-mat">${mat.name}</span>`;
      p1GlyphsContainer.appendChild(chip);
    });
  }

  // --- 2P / CPU ENEMY RIVAL PANEL ---
  const p2NameEl = document.getElementById('battleP2MachineName');
  if (p2NameEl) p2NameEl.textContent = u2.spec.name;
  const p2TypeEl = document.getElementById('battleP2TypeBadge');
  if (p2TypeEl) p2TypeEl.textContent = u2.spec.buildType;
  const p2WeightEl = document.getElementById('battleP2WeightVal');
  if (p2WeightEl) p2WeightEl.textContent = `${u2.spec.weight}g`;
  const p2AtkEl = document.getElementById('battleP2AtkVal');
  if (p2AtkEl) p2AtkEl.textContent = u2.spec.atk;
  const p2DefEl = document.getElementById('battleP2DefVal');
  if (p2DefEl) p2DefEl.textContent = u2.spec.def;
  const p2SpdEl = document.getElementById('battleP2SpdVal');
  if (p2SpdEl) p2SpdEl.textContent = u2.spec.spd;

  const p2HpEl = document.getElementById('battleP2HpVal');
  if (p2HpEl) {
    p2HpEl.textContent = `${u2.damagePct}%${u2.damagePct >= 40 ? ' [BURST RISK]' : ''}`;
    p2HpEl.style.color = u2.damagePct >= 65 ? 'var(--apex-red)' : u2.damagePct >= 40 ? '#f97316' : u2.damagePct >= 25 ? 'var(--apex-gold)' : '#ffffff';
  }
  const p2HpBar = document.getElementById('battleP2HpBar');
  if (p2HpBar) {
    p2HpBar.style.width = `${Math.min(100, Math.max(0, u2.damagePct))}%`;
  }

  // 2P Glyphs Chips
  const p2GlyphsContainer = document.getElementById('battleP2GlyphsList');
  if (p2GlyphsContainer && (!p2GlyphsContainer._cachedName || p2GlyphsContainer._cachedName !== u2.spec.name)) {
    p2GlyphsContainer._cachedName = u2.spec.name;
    p2GlyphsContainer.innerHTML = '';
    u2.build.glyphs.forEach(g => {
      const mat = GLYPH_MATERIALS[g.mat] || GLYPH_MATERIALS.mecha;
      const chip = document.createElement('div');
      chip.className = 'battle-glyph-chip';
      chip.innerHTML = `<span class="chip-char">${g.char}</span><span class="chip-mat">${mat.name}</span>`;
      p2GlyphsContainer.appendChild(chip);
    });
  }

  // Tactics Hint (Weakness analysis based on enemy specs and stage)
  const tacticsEl = document.getElementById('battleP2TacticsHint');
  if (tacticsEl) {
    const hints = [];
    const diffWeight = u2.spec.weight - u1.spec.weight;
    if (diffWeight > 3.0) {
      hints.push(isEn()
        ? 'Heavyweight rival. Avoid head-on collisions; strike from the flank toward the desk edge.'
        : '超重量級機体。正面衝突は押し負けやすいため、外周への誘い込みや横突撃を狙いましょう。');
    } else if (diffWeight < -3.0) {
      hints.push(isEn()
        ? 'Lighter than your machine! A direct full-power hit will send them flying off the desk.'
        : '自機より軽量。強打を命中させれば大ノックバックで一気に場外落下を狙えます。');
    }

    if (u2.spec.atk >= 75) {
      hints.push(isEn()
        ? 'High-ATK striker. Use BRAKE Spin [3] to stop safely near the edge and counter-attack.'
        : '高火力突進タイプ。相手の初動直撃を避け、ブレーキ(スピン3)でいなすのが有効です。');
    } else if (u2.spec.def >= 75) {
      hints.push(isEn()
        ? 'Armored fortress. Build up their Damage (%) first, then use DRIVE Spin [1] for a ring-out.'
        : '強固な装甲要塞。衝突ダメージでは削りにくいため、リングアウト勝利を優先しましょう。');
    }

    if (battleState.stage === 'ice_glass') {
      hints.push(isEn()
        ? 'Low-friction Glass surface! Watch your momentum so you do not slide off after impact.'
        : '超低摩擦ガラス面。衝突後の滑走距離が伸びるため自滅に注意してください。');
    } else if (battleState.stage === 'colosseum') {
      hints.push(isEn()
        ? 'Circular Colosseum. Hold the center and push the rival outward with DRIVE Spin [1].'
        : '狭小円卓。中央付近を維持し、突進押し込み(スピン1)で場外へ弾き出せます。');
    }

    tacticsEl.textContent = hints.length > 0
      ? hints.join(' ')
      : (isEn()
          ? 'Balanced rival build. Aim sharp character corners at their side to maximize torque and knockback.'
          : 'バランス型機体。角度を付けて相手の側面に文字の突起をヒットさせましょう。');
  }

  // Stage Info Desc
  const stageDescEl = document.getElementById('battleStageInfoDesc');
  if (stageDescEl) {
    const stg = BATTLE_STAGES[battleState.stage] || BATTLE_STAGES.standard;
    stageDescEl.textContent = `${stg.name} - ${stg.desc || '標準的な机上バトルフィールド。'}`;
  }
}

function updateBattleHUD() {
  const u1 = battleState.units[0];
  const u2 = battleState.units[1];
  if (!u1 || !u2) return;

  document.getElementById('p1Name').textContent = u1.spec.name;
  document.getElementById('p1WeightTag').textContent = `${u1.spec.weight}g`;
  const p1DmgText = document.getElementById('p1DamageText');
  p1DmgText.textContent = `${u1.damagePct}%${u1.damagePct >= 40 ? ' [BURST!]' : ''}`;
  p1DmgText.style.color = u1.damagePct >= 65 ? 'var(--apex-red)' : u1.damagePct >= 40 ? '#f97316' : 'var(--apex-gold)';
  document.getElementById('p1DamageBar').style.width = `${Math.min(100, Math.max(0, u1.damagePct))}%`;

  document.getElementById('p2Name').textContent = u2.spec.name;
  document.getElementById('p2WeightTag').textContent = `${u2.spec.weight}g`;
  const p2DmgText = document.getElementById('p2DamageText');
  p2DmgText.textContent = `${u2.damagePct}%${u2.damagePct >= 40 ? ' [BURST!]' : ''}`;
  p2DmgText.style.color = u2.damagePct >= 65 ? 'var(--apex-red)' : u2.damagePct >= 40 ? '#f97316' : 'var(--apex-gold)';
  document.getElementById('p2DamageBar').style.width = `${Math.min(100, Math.max(0, u2.damagePct))}%`;

  const renderStars = (elId, score) => {
    const container = document.getElementById(elId);
    if (!container) return;
    const stars = container.querySelectorAll('.star');
    stars.forEach((st, idx) => st.classList.toggle('won', idx < score));
  };
  renderStars('p1Stars', battleState.p1Score);
  renderStars('p2Stars', battleState.p2Score);

  const turnInd = document.getElementById('turnIndicator');
  const turnSub = document.getElementById('turnSubhint');
  const isOnline = (battleState.mode === 'p2p-online');
  const myNum = (isOnline && window.p2pState) ? window.p2pState.myPlayerNum : 1;

  if (battleState.phase === 'aim') {
    if (isOnline) {
      const isMyTurn = (battleState.activePlayer === myNum);
      if (isMyTurn) {
        turnInd.textContent = isEn()
          ? `TURN ${battleState.turn}: YOUR TURN (${myNum}P)! DRAG & RELEASE TO SHOOT`
          : `TURN ${battleState.turn}: あなたの番 (${myNum}P)！引っ張って弾こう`;
        turnInd.style.color = '#34d399';
        turnSub.textContent = isEn()
          ? 'Drag anywhere on the desk to aim, release to fire (Synced via P2P)'
          : '机の上をドラッグして狙い、離すと発射します（P2P通信同期中）';
      } else {
        turnInd.textContent = isEn()
          ? `TURN ${battleState.turn}: WAITING FOR OPPONENT (${battleState.activePlayer}P) TO SHOOT...`
          : `TURN ${battleState.turn}: 通信相手 (${battleState.activePlayer}P) が狙っています...`;
        turnInd.style.color = '#f87171';
        turnSub.textContent = isEn()
          ? 'Connected via P2P Live Match — Prepare for impact!'
          : 'P2Pオンライン対戦中 — 相手のショットに備えましょう！';
      }
    } else if (battleState.activePlayer === 1) {
      turnInd.textContent = isEn()
        ? `TURN ${battleState.turn}: 1P YOUR TURN! DRAG & RELEASE TO LAUNCH`
        : `TURN ${battleState.turn}: 1P あなたの番！引っ張って弾こう`;
      turnInd.style.color = '#34d399';
      turnSub.textContent = isEn()
        ? 'Drag on the desk to aim angle & power, release to fire!'
        : '机の上をドラッグして狙い、指/マウスを離すと発射します';
    } else {
      turnInd.textContent = isEn()
        ? (battleState.mode === 'pvp'
            ? `TURN ${battleState.turn}: 2P'S TURN! DRAG & RELEASE TO LAUNCH`
            : `TURN ${battleState.turn}: CPU RIVAL IS AIMING...`)
        : (battleState.mode === 'pvp'
            ? `TURN ${battleState.turn}: 2P の番！引っ張って弾こう`
            : `TURN ${battleState.turn}: CPU ライバル機が狙っています...`);
      turnInd.style.color = '#f87171';
      turnSub.textContent = isEn()
        ? 'Watch out for sharp glyph corners and knockback!'
        : '相手の文字パーツの角に注意！';
    }
  } else if (battleState.phase === 'moving') {
    turnInd.textContent = isEn()
      ? 'SLIDING CLASH: PRESS [SPACE / CLICK] TO UNLEASH ULTIMATE SKILL!'
      : '激突滑走中: [Space / 画面タップ] で必殺技発動！';
    turnInd.style.color = '#38bdf8';
  }

  // Update Skill Stock Badges
  const p1StockEl = document.getElementById('p1SkillStock');
  if (p1StockEl) {
    const s1 = u1.skillStock || 0;
    p1StockEl.textContent = isEn() ? `SKILL ${s1}` : `技ストック ${s1}`;
    p1StockEl.classList.toggle('has-stock', s1 > 0);
  }
  const p2StockEl = document.getElementById('p2SkillStock');
  if (p2StockEl) {
    const s2 = u2.skillStock || 0;
    p2StockEl.textContent = isEn() ? `SKILL ${s2}` : `技ストック ${s2}`;
    p2StockEl.classList.toggle('has-stock', s2 > 0);
  }

  const skillBtn = document.getElementById('skillActionBtn');
  const activeUnit = battleState.units[battleState.activePlayer - 1];
  const canControlActive = isOnline
    ? (battleState.activePlayer === myNum)
    : (battleState.activePlayer === 1 || battleState.mode === 'pvp');
  if (battleState.phase === 'moving' && canControlActive && activeUnit && (activeUnit.skillStock || 0) > 0) {
    document.getElementById('skillBtnTitle').textContent = isEn()
      ? `${activeUnit.spec.activeSkill.title} (${activeUnit.skillStock} LEFT)`
      : `${activeUnit.spec.activeSkill.title} (残り ${activeUnit.skillStock} 回)`;
    skillBtn.classList.remove('hidden');
  } else {
    skillBtn.classList.add('hidden');
  }
  updateBattleTelemetryPanels(u1, u2);
}

// Battle Canvas Slingshot Input
gameCanvas.addEventListener('pointerdown', evt => {
  if (activeView !== 'battle' || cgIsPlayingAd) return;
  const isOnline = (battleState.mode === 'p2p-online');
  const myNum = (isOnline && window.p2pState) ? window.p2pState.myPlayerNum : 1;
  const canControlActive = isOnline
    ? (battleState.activePlayer === myNum)
    : (battleState.activePlayer === 1 || battleState.mode === 'pvp');

  if (battleState.phase === 'moving') {
    const activeUnit = battleState.units[battleState.activePlayer - 1];
    if (canControlActive && activeUnit && (activeUnit.skillStock || 0) > 0) {
      activateUnitSkill(activeUnit, battleState.units, battleState.particles);
      if (isOnline && typeof sendP2PSkill === 'function') sendP2PSkill();
      return;
    }
  }
  if (battleState.phase !== 'aim') return;
  if (!canControlActive) return;
  const pos = getCanvasPointerPos(gameCanvas, evt);
  battleSlingshot.active = true;
  battleSlingshot.startX = pos.x;
  battleSlingshot.startY = pos.y;
  battleSlingshot.curX = pos.x;
  battleSlingshot.curY = pos.y;
  gameCanvas.setPointerCapture(evt.pointerId);
});

gameCanvas.addEventListener('pointermove', evt => {
  if (!battleSlingshot.active) return;
  const pos = getCanvasPointerPos(gameCanvas, evt);
  battleSlingshot.curX = pos.x;
  battleSlingshot.curY = pos.y;
});

window.addEventListener('pointerup', () => {
  if (!battleSlingshot.active) return;
  battleSlingshot.active = false;
  if (activeView !== 'battle' || battleState.phase !== 'aim') return;

  const dx = battleSlingshot.startX - battleSlingshot.curX;
  const dy = battleSlingshot.startY - battleSlingshot.curY;
  const dist = Math.min(150, Math.hypot(dx, dy));
  if (dist > 10) {
    const unit = battleState.units[battleState.activePlayer - 1];
    if (unit) {
      const powerRatio = dist / 150;
      const angle = Math.atan2(dy, dx);
      launchUnit(unit, powerRatio, angle, selectedSpinType);
      if (battleState.mode === 'p2p-online' && typeof sendP2PShot === 'function') {
        sendP2PShot(powerRatio, angle, selectedSpinType);
      }
      if (typeof onTutorialPlayerShot === 'function') {
        onTutorialPlayerShot();
      }
    }
  }
});

// Battle Controls & Navigation
document.getElementById('skillActionBtn')?.addEventListener('click', () => {
  const isOnline = (battleState.mode === 'p2p-online');
  const myNum = (isOnline && window.p2pState) ? window.p2pState.myPlayerNum : 1;
  const canControl = isOnline ? (battleState.activePlayer === myNum) : (battleState.activePlayer === 1 || battleState.mode === 'pvp');
  const unit = battleState.units[battleState.activePlayer - 1];
  if (unit && canControl && (unit.skillStock || 0) > 0) {
    activateUnitSkill(unit, battleState.units, battleState.particles);
    if (isOnline && typeof sendP2PSkill === 'function') sendP2PSkill();
  }
});

window.addEventListener('keydown', evt => {
  // Backspace or Delete key to delete the selected glyph during crafting
  if ((evt.key === 'Backspace' || evt.key === 'Delete') && activeView === 'craft') {
    const activeEl = document.activeElement;
    const isEditingText = activeEl && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
      activeEl.isContentEditable
    );
    if (!isEditingText && selectedGlyphId !== null) {
      evt.preventDefault();
      document.getElementById('deleteGlyphBtn')?.click();
      return;
    }
  }

  if (evt.code === 'Space') {
    if (activeView === 'battle' && battleState.phase === 'moving') {
      evt.preventDefault();
      const isOnline = (battleState.mode === 'p2p-online');
      const myNum = (isOnline && window.p2pState) ? window.p2pState.myPlayerNum : 1;
      const canControl = isOnline ? (battleState.activePlayer === myNum) : (battleState.activePlayer === 1 || battleState.mode === 'pvp');
      const unit = battleState.units[battleState.activePlayer - 1];
      if (unit && canControl && (unit.skillStock || 0) > 0) {
        activateUnitSkill(unit, battleState.units, battleState.particles);
        if (isOnline && typeof sendP2PSkill === 'function') sendP2PSkill();
      }
    } else if (activeView === 'craft' && workbenchMode === 'test' && testPlayerUnit) {
      evt.preventDefault();
      activateUnitSkill(testPlayerUnit, testDummies, testParticles);
    }
  } else if (evt.key === '1') {
    selectSpinButton('top');
  } else if (evt.key === '2') {
    selectSpinButton('normal');
  } else if (evt.key === '3') {
    selectSpinButton('back');
  } else if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'z' && activeView === 'craft') {
    evt.preventDefault();
    document.getElementById('undoCraftBtn')?.click();
  }
});

function selectSpinButton(spinKey) {
  selectedSpinType = spinKey;
  document.querySelectorAll('.spin-selector-group .spin-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.spin === spinKey);
  });
  sfx.playClick();
}

document.querySelectorAll('.spin-selector-group .spin-btn').forEach(btn => {
  btn.addEventListener('click', () => selectSpinButton(btn.dataset.spin));
});

document.getElementById('undoBattleTurnBtn')?.addEventListener('click', undoBattleTurn);
document.getElementById('resetMatchBtn')?.addEventListener('click', () => {
  sfx.playClick();
  initBattleMatch();
});

// Mode & Stage settings are now managed via Sortie Modal & battleState

function switchMainView(targetView, skipMatchInit = false) {
  if (targetView === 'battle') {
    if (!currentBuild.glyphs || currentBuild.glyphs.length === 0) {
      showBattleToast(isEn()
        ? 'Cannot sortie with 0 glyphs! Place at least 1 character first.'
        : '文字が0個のため出撃できません。最低1文字以上配置してください');
      return;
    }
  }

  activeView = targetView;
  const craftSec = document.getElementById('craftView');
  const battleSec = document.getElementById('battleView');
  const tabCraft = document.getElementById('tabCraftBtn');
  const tabBattle = document.getElementById('tabBattleBtn');

  if (targetView === 'battle') {
    craftSec.classList.remove('active');
    battleSec.classList.add('active');
    if (tabCraft) tabCraft.classList.remove('active');
    if (tabBattle) tabBattle.classList.add('active');
    sfx.playEquip();
    if (typeof cgGameplayStart === 'function') cgGameplayStart();
    if (!skipMatchInit) {
      initBattleMatch();
    }
  } else {
    clearTimeout(cpuThinkTimeout);
    if (typeof cgGameplayStop === 'function') cgGameplayStop();
    battleSec.classList.remove('active');
    craftSec.classList.add('active');
    if (tabBattle) tabBattle.classList.remove('active');
    if (tabCraft) tabCraft.classList.add('active');
    sfx.playClick();
    resizeCraftCanvas();
    updateCraftUI();
    if (typeof onTutorialEnteredCraft === 'function') onTutorialEnteredCraft();
  }
}

document.getElementById('tabCraftBtn')?.addEventListener('click', () => switchMainView('craft'));
document.getElementById('tabBattleBtn')?.addEventListener('click', () => switchMainView('battle'));
document.getElementById('goToBattleFromSpecBtn')?.addEventListener('click', () => {
  if (!currentBuild.glyphs || currentBuild.glyphs.length === 0) {
    showBattleToast(isEn()
      ? 'Cannot sortie with 0 glyphs! Place at least 1 character first.'
      : '文字が0個のため出撃できません。最低1文字以上配置してください');
    return;
  }
  if (typeof openSortieModal === 'function') {
    openSortieModal();
  } else {
    switchMainView('battle');
  }
});
document.getElementById('backToCraftBtn')?.addEventListener('click', () => switchMainView('craft'));

document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled;
  document.getElementById('soundToggleBtn').innerHTML = sfx.enabled ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
  if (sfx.enabled) sfx.playClick();
});

window.addEventListener('resize', () => {
  if (activeView === 'craft') resizeCraftCanvas();
  else resizeBattleCanvas();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (activeView === 'craft') resizeCraftCanvas();
    else resizeBattleCanvas();
  }, 120);
});

// ============================================================================
// 12. INITIALIZATION & MAIN ANIMATION LOOP
// ============================================================================

function initApp() {
  resizeCraftCanvas();
  renderPaletteGrid();
  renderPresetMachinesList();
  updateLiveTypedCharPreview();
  enforceConnectedGlyphs(currentBuild.glyphs, selectedGlyphId, true);
  updateCraftUI();

  function mainLoop() {
    if (activeView === 'craft') {
      updateAndDrawCraftWorkbench();
    } else {
      updateBattlePhysicsAndRender();
    }
    requestAnimationFrame(mainLoop);
  }
  requestAnimationFrame(mainLoop);
}

initApp();

// Setup Font Style Selectors
document.getElementById('defaultFontSelect')?.addEventListener('change', evt => {
  defaultSelectedFont = evt.target.value;
  sfx.playClick();
});

document.getElementById('selectedFontSelect')?.addEventListener('change', evt => {
  const sel = getSelectedGlyph();
  if (sel) {
    pushCraftUndo();
    sel.fontStyle = evt.target.value;
    sfx.playClick();
    saveStateToStorage();
    updateCraftUI();
    if (workbenchMode === 'test') initTestRange();
  }
});

// ============================================================================
// 12. MATCH RESULT MODAL & VICTORY CEREMONY
// ============================================================================

function showMatchResultModal(winner, u1, u2) {
  const modal = document.getElementById('matchResultModal');
  if (!modal) return;

  const card = modal.querySelector('.result-card');
  const isOnline = (battleState.mode === 'p2p-online');
  const myNum = (isOnline && window.p2pState) ? window.p2pState.myPlayerNum : 1;
  const isLocalWin = isOnline ? (winner === myNum) : (winner === 1);
  const isP1Win = (winner === 1);

  if (card) {
    card.classList.toggle('is-defeat', !isLocalWin);
  }

  const isBurstFinish = (u1.burst || u2.burst);
  const tagEl = document.getElementById('resultHeaderTag');
  if (tagEl) {
    if (isBurstFinish) {
      tagEl.textContent = isEn()
        ? (isLocalWin ? 'BURST FINISH // VICTORY' : 'BURST SHATTER // DEFEAT')
        : (isLocalWin ? 'バースト粉砕 // 完全制覇' : 'バースト粉砕 // 敗北');
    } else {
      tagEl.textContent = isEn()
        ? (isLocalWin ? 'MATCH OVER // VICTORY' : 'MATCH OVER // DEFEAT')
        : (isLocalWin ? '決着 // 勝利者決定' : '決着 // 敗北');
    }
  }

  const titleEl = document.getElementById('resultMainTitle');
  if (titleEl) {
    if (isBurstFinish) {
      titleEl.textContent = isEn()
        ? (isLocalWin ? 'BURST VICTORY!' : 'BURST DEFEAT')
        : (isLocalWin ? 'バースト完全勝利！' : 'バースト粉砕敗北');
    } else {
      titleEl.textContent = isEn()
        ? (isLocalWin ? 'VICTORY' : 'DEFEAT')
        : (isLocalWin ? '完全勝利 (VICTORY)' : '敗北 (DEFEAT)');
    }
  }

  const badgeEl = document.getElementById('winnerBadge');
  if (badgeEl) {
    badgeEl.textContent = isEn()
      ? (isP1Win ? '1P PLAYER VICTORY' : (battleState.mode === 'pvp' || isOnline ? '2P PLAYER VICTORY' : 'CPU RIVAL VICTORY'))
      : (isP1Win ? '1P プレイヤー勝利' : '相手機体の勝利');
    badgeEl.style.color = isLocalWin ? 'var(--apex-gold)' : 'var(--apex-pink)';
  }

  const nameEl = document.getElementById('resultWinnerName');
  if (nameEl) {
    nameEl.textContent = isP1Win ? u1.spec.name : u2.spec.name;
  }

  const scoreEl = document.getElementById('resultScoreLine');
  if (scoreEl) {
    scoreEl.textContent = isEn()
      ? `FINAL SCORE: ${battleState.p1Score} - ${battleState.p2Score}`
      : `最終スコア: ${battleState.p1Score} - ${battleState.p2Score}`;
  }

  const turnEl = document.getElementById('resultTurnCount');
  if (turnEl) {
    turnEl.textContent = isEn()
      ? `${battleState.turn} TURNS`
      : `${battleState.turn} 手決着`;
  }

  const dmgEl = document.getElementById('resultMaxDamage');
  if (dmgEl) {
    const maxDmg = Math.max(u1.damagePct, u2.damagePct);
    dmgEl.textContent = `${maxDmg}%`;
  }

  const stageEl = document.getElementById('resultStageName');
  if (stageEl) {
    const stg = BATTLE_STAGES[battleState.stage] || BATTLE_STAGES.standard;
    stageEl.textContent = stg.name;
  }

  let totalWins = parseInt(safeGetStorage('keshigomu_neo_total_wins', '0'), 10) || 0;
  if (isLocalWin) {
    totalWins++;
    safeSetStorage('keshigomu_neo_total_wins', totalWins.toString());
  }
  const winsEl = document.getElementById('resultTotalWins');
  if (winsEl) {
    winsEl.textContent = isEn() ? `${totalWins} WINS` : `${totalWins} 勝`;
  }

  modal.classList.remove('hidden');
  if (typeof requestCrazyGamesBanner === 'function') requestCrazyGamesBanner();

  // Spawn celebratory confetti/particles
  for (let i = 0; i < 40; i++) {
    battleState.particles.push({
      x: gameCanvas.width * 0.5 + (Math.random() - 0.5) * 300,
      y: gameCanvas.height * 0.4 + (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 3,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      color: isP1Win ? (Math.random() > 0.5 ? '#f59e0b' : '#00e5ff') : '#f43f5e',
      size: 4 + Math.random() * 5
    });
  }
}

function hideMatchResultModal() {
  document.getElementById('matchResultModal')?.classList.add('hidden');
  if (typeof clearCrazyGamesBanner === 'function') clearCrazyGamesBanner();
}

// Result Modal Action Buttons (Rematch handled by CrazyGames Ad Controller below)

document.getElementById('resultToCraftBtn')?.addEventListener('click', () => {
  sfx.playClick();
  requestCrazyGamesAd('midgame', () => {
    hideMatchResultModal();
    switchMainView('craft');
  });
});


// ==========================================================================
// PC EDITION: DESKTOP KEYBOARD, MOUSE, AND MODAL CONTROLLERS
// ==========================================================================

// PC Controls Guide Modal Toggle
const pcGuideModal = document.getElementById('pcKeyGuideModal');
const keyGuideToggleBtn = document.getElementById('keyGuideToggleBtn');
const closePcGuideBtn = document.getElementById('closePcGuideBtn');
const pcKeyGuideBackdrop = document.getElementById('pcKeyGuideBackdrop');

function togglePcGuideModal(show) {
  if (!pcGuideModal) return;
  const isHidden = pcGuideModal.classList.contains('hidden');
  const target = (typeof show === 'boolean') ? show : isHidden;
  if (target) {
    pcGuideModal.classList.remove('hidden');
    sfx.playClick();
  } else {
    pcGuideModal.classList.add('hidden');
    sfx.playClick();
  }
}

keyGuideToggleBtn?.addEventListener('click', () => togglePcGuideModal());
closePcGuideBtn?.addEventListener('click', () => togglePcGuideModal(false));
pcKeyGuideBackdrop?.addEventListener('click', () => togglePcGuideModal(false));

// Fullscreen Toggle
const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
fullscreenToggleBtn?.addEventListener('click', toggleFullscreen);

// Right-Click Context Menu Suppression & Aim Cancel
gameCanvas.addEventListener('contextmenu', evt => {
  evt.preventDefault();
  if (battleSlingshot.active) {
    battleSlingshot.active = false;
    sfx.playCancel();
    showBattleToast(isEn() ? 'Aim cancelled' : '照準をキャンセルしました');
  }
});

// Mouse Wheel for Spin Selection in Battle
window.addEventListener('wheel', evt => {
  if (activeView === 'battle' && battleState.phase === 'aim') {
    const spins = ['top', 'normal', 'back'];
    let idx = spins.indexOf(selectedSpinType);
    if (idx === -1) idx = 1;
    if (evt.deltaY > 0) {
      idx = Math.min(spins.length - 1, idx + 1);
    } else if (evt.deltaY < 0) {
      idx = Math.max(0, idx - 1);
    }
    const nextSpin = spins[idx];
    if (nextSpin !== selectedSpinType) {
      selectSpinButton(nextSpin);
      updateBattleHUD();
    }
  }
}, { passive: true });

// Comprehensive Global PC Keydown Dispatcher
window.addEventListener('keydown', evt => {
  if (cgIsPlayingAd) return;
  const activeEl = document.activeElement;
  const isEditing = activeEl && (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
    activeEl.isContentEditable
  );

  // Global Guide Modal Hotkey (? or Shift+/)
  if (!isEditing && (evt.key === '?' || (evt.key === '/' && evt.shiftKey))) {
    evt.preventDefault();
    togglePcGuideModal();
    return;
  }

  // Close modals on Escape
  if (evt.key === 'Escape') {
    if (pcGuideModal && !pcGuideModal.classList.contains('hidden')) {
      evt.preventDefault();
      togglePcGuideModal(false);
      return;
    }
  }

  // Hotkeys during Craft View
  if (activeView === 'craft') {
    // Navigation tabs hotkeys removed (clean game loop: Sortie Modal -> Arena -> Esc/Result to Craft)

    // Space: Toggle Test Mode
    if (!isEditing && evt.code === 'Space') {
      evt.preventDefault();
      if (craftWorkbenchMode === 'edit') {
        document.getElementById('wbModeTestBtn')?.click();
      } else {
        document.getElementById('wbModeEditBtn')?.click();
      }
      return;
    }

    // Enter: Deploy to Battle if valid build
    if (!isEditing && evt.key === 'Enter') {
      evt.preventDefault();
      const launchBtn = document.getElementById('launchBattleBtn');
      if (launchBtn && !launchBtn.classList.contains('disabled')) {
        launchBtn.click();
      }
      return;
    }

    // Selected Glyph Nudge & Rotate
    if (!isEditing && selectedGlyphId !== null) {
      const g = customBuild.glyphs.find(item => item.id === selectedGlyphId);
      if (g) {
        let changed = false;
        const step = evt.shiftKey ? 10 : 2;
        if (evt.code === 'KeyW' || evt.key === 'ArrowUp') {
          evt.preventDefault();
          g.y -= step;
          changed = true;
        } else if (evt.code === 'KeyS' || evt.key === 'ArrowDown') {
          evt.preventDefault();
          g.y += step;
          changed = true;
        } else if (evt.code === 'KeyA' || evt.key === 'ArrowLeft') {
          evt.preventDefault();
          g.x -= step;
          changed = true;
        } else if (evt.code === 'KeyD' || evt.key === 'ArrowRight') {
          evt.preventDefault();
          g.x += step;
          changed = true;
        } else if (evt.code === 'KeyQ') {
          evt.preventDefault();
          g.rotation = (g.rotation - 15) % 360;
          if (g.rotation < 0) g.rotation += 360;
          changed = true;
        } else if (evt.code === 'KeyE') {
          evt.preventDefault();
          g.rotation = (g.rotation + 15) % 360;
          changed = true;
        }

        if (changed) {
          pushCraftHistory();
          updateLiveSpecsAndBreakdown();
          syncFineTuneInputsFromSelected();
        }
      }
    }
  }

  // Hotkeys during Battle View
  if (activeView === 'battle') {
    // 1/2/3 Spin selection
    if (!isEditing && (evt.key === '1' || evt.code === 'Digit1')) {
      evt.preventDefault();
      setSpinEffect('top');
      return;
    }
    if (!isEditing && (evt.key === '2' || evt.code === 'Digit2')) {
      evt.preventDefault();
      setSpinEffect('normal');
      return;
    }
    if (!isEditing && (evt.key === '3' || evt.code === 'Digit3')) {
      evt.preventDefault();
      setSpinEffect('back');
      return;
    }

    // Space: Trigger Skill
    if (!isEditing && evt.code === 'Space') {
      evt.preventDefault();
      const skillBtn = document.getElementById('activeSkillBtn');
      if (skillBtn && !skillBtn.classList.contains('disabled')) {
        skillBtn.click();
      }
      return;
    }

    // Z: Undo turn
    if (!isEditing && (evt.code === 'KeyZ' && !evt.ctrlKey)) {
      evt.preventDefault();
      document.getElementById('undoBattleTurnBtn')?.click();
      return;
    }

    // R: Restart match
    if (!isEditing && evt.code === 'KeyR' && !evt.ctrlKey) {
      evt.preventDefault();
      document.getElementById('resetMatchBtn')?.click();
      return;
    }

    // Esc: Return to craft
    if (evt.key === 'Escape') {
      evt.preventDefault();
      document.getElementById('backToCraftBtn')?.click();
      return;
    }
  }
});


// ============================================================================
// 13. CRAZYGAMES EDITION: FULL ENGLISH / JAPANESE LOCALIZATION ENGINE
// ============================================================================

const I18N_DATA = {
  materials: {
    eraser:   { en: 'Eraser Rubber',    ja: '消しゴム' },
    rubber:   { en: 'Bouncy Elastomer', ja: '強化ゴム' },
    wood:     { en: 'Natural Timber',   ja: '天然木材' },
    glass:    { en: 'Crystal Glass',    ja: '強化ガラス' },
    stone:    { en: 'Granite Rock',     ja: '花崗岩石' },
    slime:    { en: 'Slime Gel',        ja: '粘着ゲル' },
    titanium: { en: 'Titanium Alloy',   ja: 'チタン合金' },
    blade:    { en: 'Blade Steel',      ja: 'ブレード鋼' },
    gold:     { en: 'Solid Gold',       ja: '純金ゴールド' },
    mecha:    { en: 'Titanium Alloy',   ja: 'チタン合金' },
    neon:     { en: 'Crystal Glass',    ja: '強化ガラス' },
    chrome:   { en: 'Crystal Glass',    ja: '強化ガラス' },
    damascus: { en: 'Blade Steel',      ja: 'ブレード鋼' },
    brass:    { en: 'Solid Gold',       ja: '純金ゴールド' }
  },
  skills: {
    slash: {
      enTitle: 'GLYPH SLASH // BLADE RUSH',
      enDesc: 'Dash forward mid-slide with razor-sharp character edges, boosting impact force!',
      jaTitle: '文字剣・一閃突破',
      jaDesc: '滑走中に鋭い文字ブレードで前方へ高速斬り込み突進を放ち、衝突威力を大幅強化！'
    },
    buster: {
      enTitle: 'KANJI BUSTER // SHOCKWAVE',
      enDesc: 'Detonate a kinetic shockwave around your machine mid-slide, blasting rivals away!',
      jaTitle: '漢字破砕・インパクト',
      jaDesc: '滑走中に文字コアを爆発膨張させて周囲に超衝撃波を放ち、相手を強烈に弾き飛ばす！'
    },
    boost: {
      enTitle: 'SONIC THRUST // JET BOOST',
      enDesc: 'Ignite character thrusters mid-slide for a second burst of forward acceleration!',
      jaTitle: '推進文字・ブースト',
      jaDesc: '滑走中に文字スラスターを最大噴射し、進行方向へ鋭く再加速して相手を押し込む！'
    },
    vortex: {
      enTitle: 'MAELSTROM // VORTEX SPIN',
      enDesc: 'Unleash hyper-velocity rotation mid-slide, whipping nearby rivals into a cyclone!',
      jaTitle: '渦巻文字・スピン',
      jaDesc: '滑走中に超高速スピンを展開し、接触した相手を竜巻のように巻き込んで弾き飛ばす！'
    },
    anchor: {
      enTitle: 'FORTRESS ANCHOR // FULL STOP',
      enDesc: 'Drive heavy glyph anchors into the desk mid-slide to brake instantly and prevent ring-outs!',
      jaTitle: '鉄壁文字・アンカー',
      jaDesc: '滑走中に重装文字の楔を机に撃ち込んでピタッと急停止し、場外落下を完全に防ぐ！'
    }
  },
  presets: {
    preset_dragon_blade: {
      enName: 'DRAGON BLADE // 剣龍号',
      enDesc: 'Balanced 5-glyph striker fusing core [龍] with front [▲], dual [剣] blades, and rear [翼].',
      jaName: '文字覇王・剣龍号',
      jaDesc: '中央の『龍』に先端『▲』・左右の『剣』・後部『翼』が密着合体した5文字万能戦闘機'
    },
    preset_heavy_fortress: {
      enName: 'IRON FORTRESS // 鉄壁王',
      enDesc: 'Super-heavy 5-glyph tank welding golden [覇] core with [盾], dual [鎧] armor, and [鋼].',
      jaName: '重装要塞・鉄壁王',
      jaDesc: '黄金の『覇』を核に『盾』『鎧』『鋼』が隙間なく密着結束した超重量5文字要塞'
    },
    preset_sonic_valkyrie: {
      enName: 'SONIC FLASH // 疾風閃号',
      enDesc: 'High-velocity 5-glyph speedster combining sharp [V] & [閃] with dual [翼] wings and [噴] jet.',
      jaName: '超音速・疾風閃号',
      jaDesc: '鋭角『V』と『閃』に双『翼』と『噴』が密着結合した5文字ハイスピード機'
    },
    preset_crimson_nova: {
      enName: 'CRIMSON BUSTER // 轟爆号',
      enDesc: 'Hyper-offensive 5-glyph brawler built around [轟] with [突] spike, dual [牙] fangs, and [爆].',
      jaName: '獄炎破壊・轟爆号',
      jaDesc: '『轟』を中心に『突』『牙』『爆』が一体化した超攻撃型5文字バスター機'
    },
    preset_vortex_shuriken: {
      enName: 'THUNDER SHURIKEN // 卍刃号',
      enDesc: 'Tornado spin 5-glyph machine surrounding [渦] core with four symmetrical [刃] & [雷] blades.',
      jaName: '雷神渦巻・卍刃号',
      jaDesc: '『渦』の四方に『刃』と『雷』を密着配置した5文字トルネードスピン機'
    }
  },
  stages: {
    random:     { enName: 'STAGE: RANDOM (ALL 10 ARENAS)',    enDesc: 'A random arena chosen from all 10 desk battlefields.', jaName: 'ステージ: ランダム (全10種)', jaDesc: '全10種の机上アリーナからランダムに選ばれます。' },
    standard:   { enName: 'STAGE 01: Standard Wood Desk',    enDesc: 'Classic school desk arena. Pure physics, mass, and character geometry decide the winner.', jaName: 'STAGE 01: スタンダード木製机', jaDesc: '標準的な木製机。純粋な文字性能と体幹が試される王道ステージ。' },
    stationery: { enName: 'STAGE 02: Ruler Ricochet Desk',   enDesc: 'Two acrylic rulers and flank boost pads enable bank shots and high-speed flanking.', jaName: 'STAGE 02: 定規文房具ギミック机', jaDesc: 'ハの字に置かれた2本のアクリル定規が壁面反射を生む。' },
    pinball:    { enName: 'STAGE 03: Pinball Bumper Arena',  enDesc: 'High-restitution bumpers and a central turntable trigger explosive ricochet combos.', jaName: 'STAGE 03: ピンボールバンパー机', jaDesc: '高反発バンパーが複数配置され、跳弾と不意のノックバックが連鎖する。' },
    bridge:     { enName: 'STAGE 04: Narrow Iron Bridge',    enDesc: 'Ultra-narrow carbon bridge with catapult boosters. Every collision risks an instant ring-out!', jaName: 'STAGE 04: 天王山・一本橋アリーナ', jaDesc: '幅が極端に狭い一本橋。わずかな押し出しで場外へ転落する超危険地帯。' },
    colosseum:  { enName: 'STAGE 05: Round Steel Colosseum', enDesc: '360-degree circular steel arena with a rotating center vortex and no safe corners.', jaName: 'STAGE 05: 円形コロシアム机', jaDesc: '角のない円盤ステージ。360度全方位が崖っぷちの決闘場。' },
    crossroad:  { enName: 'STAGE 06: Crossroad Boost Arena', enDesc: 'Corner blocks and 4-way inward boost pads funnel both machines into a central clash.', jaName: 'STAGE 06: 十字路クロスアリーナ', jaDesc: '4隅に大型ブロック障害物があり、中央の交差点での激突が勝負を決める。' },
    islands:    { enName: 'STAGE 07: Twin Islands Highway',  enDesc: 'Dual high-speed boost lanes propel machines across the central clash vortex.', jaName: 'STAGE 07: ツイン浮島・超加速ハイウェイ', jaDesc: '中央ブリッジに双方向ハイパー加速板を配備。橋に飛び乗ることで相手陣へロケット突撃できる積極的戦闘ステージ。' },
    gridlock:   { enName: 'STAGE 08: Pencil Barricade Maze', enDesc: 'Midfield pencil barricades and outer boost runways reward angled bank shots.', jaName: 'STAGE 08: 迷路ペンシルヘッジ', jaDesc: '鉛筆のバリケードが4箇所に林立。相手を障害物に叩きつけて大ダメージ。' },
    ice_glass:  { enName: 'STAGE 09: Low-Friction Glass',    enDesc: 'Polished glass table with minimal friction! Use grip mats or Brake Spin [3] to stay on!', jaName: 'STAGE 09: 超低摩擦ガラステーブル', jaDesc: '磨き抜かれたガラステーブル。摩擦が極小で、ブレーキ不能の超高速滑走戦。' },
    volcano:    { enName: 'STAGE 10: Shrinking Volcano',     enDesc: 'Molten survival desk that starts shrunken and collapses inward as turns progress.', jaName: 'STAGE 10: 崩落縮小ボルケーノ', jaDesc: '赤熱した崩落机。ターンごとに外周が急速に崩落していく過酷なサバイバル。' }
  }
};

function setElementText(selector, enText, jaText) {
  const el = document.querySelector(selector);
  if (el) el.textContent = isEn() ? enText : jaText;
}

function setElementHTML(selector, enHTML, jaHTML) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = isEn() ? enHTML : jaHTML;
}

function applyLanguage(lang) {
  currentLang = (lang === 'ja') ? 'ja' : 'en';
  try {
    safeSetStorage('keshigomu_neo_lang', currentLang);
  } catch (e) {}

  document.documentElement.lang = currentLang;

  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.textContent = isEn() ? 'EN / JP' : 'JP / EN';
    langBtn.title = isEn() ? 'Switch Language to Japanese (日本語に切替)' : '英語に切替 (Switch to English)';
  }

  // 1. Update Data Structures (Materials, Skills, Presets, Stages)
  for (const [k, m] of Object.entries(I18N_DATA.materials)) {
    if (GLYPH_MATERIALS[k]) {
      GLYPH_MATERIALS[k].name = isEn() ? m.en : m.ja;
    }
  }
  for (const [k, s] of Object.entries(I18N_DATA.skills)) {
    if (GLYPH_SKILLS[k]) {
      GLYPH_SKILLS[k].title = isEn() ? s.enTitle : s.jaTitle;
      GLYPH_SKILLS[k].desc = isEn() ? s.enDesc : s.jaDesc;
    }
  }
  PRESET_MACHINES.forEach(p => {
    const t = I18N_DATA.presets[p.id];
    if (t) {
      p.name = isEn() ? t.enName : t.jaName;
      p.desc = isEn() ? t.enDesc : t.jaDesc;
    }
  });
  for (const [k, st] of Object.entries(I18N_DATA.stages)) {
    if (BATTLE_STAGES[k]) {
      BATTLE_STAGES[k].name = isEn() ? st.enName : st.jaName;
      BATTLE_STAGES[k].desc = isEn() ? st.enDesc : st.jaDesc;
    }
  }

  // 2. Top Navigation Bar
  setElementHTML('.brand-logo h1',
    'GLYPH CLASH: NEO <span class="header-sub-tag">PHYSICS CRAFT & ARENA</span>',
    '消しバトNeo <span class="header-sub-tag">BATTLE BUILD DOCK</span>');
  setElementText('#tabCraftBtn', 'CRAFT STUDIO [1]', '機体設計室 [1]');
  setElementText('#tabBattleBtn', 'BATTLE ARENA [2]', 'バトル出撃 [2]');
  setElementText('#tutorialStartBtn span', 'TUTORIAL', 'チュートリアル');
  setElementText('#openSortieModalBtn span', 'VS CPU / P2P', 'CPU / P2P対戦');
  setElementText('#keyGuideToggleBtn span', 'CONTROLS', '操作ガイド');

  // 3. Craft Left Sidebar (Tabs & Sub-Panel 1: Tune)
  setElementText('#tabConfigBtn', 'PRESETS', '完成機体');
  setElementText('#duplicateGlyphBtn', 'CLONE', '複製');
  setElementText('#mirrorCopyGlyphBtn', 'MIRROR', '反転複製');
  setElementText('#deleteGlyphBtn', 'DELETE', '削除');
  setElementText('#selectedGlyphHeaderBox .panel-hint',
    'Connect up to 5 glyphs by touching their edges, corners, or strokes.',
    '文字同士を重ねたり、角や先端で自由に連結できます');
  setElementText('.selected-char-edit-row label', 'Change Glyph:', '文字変更:');
  setElementText('#flipSelectedXBtn', 'FLIP X', '左右反転');
  setElementText('#flipSelectedYBtn', 'FLIP Y', '上下反転');

  setElementText('#fineTuneBox h3', 'SIZE / ROTATION / POSITION', 'サイズ・回転・位置の調整');
  const tuneLabels = document.querySelectorAll('#fineTuneBox .slider-row label');
  if (tuneLabels.length >= 4) {
    const tL = isEn()
      ? ['Scale', 'Angle', 'Pos X', 'Pos Y']
      : ['サイズ', '回転角度', '左右位置(X)', '前後位置(Y)'];
    tuneLabels.forEach((el, i) => { if (tL[i]) el.textContent = tL[i]; });
  }
  setElementText('.quick-angle-btns button[data-rotset="0"]', 'FRONT 0°', '正面 0°');
  setElementText('#centerGlyphXBtn', 'CENTER X', '中央寄せ');
  setElementText('#layerUpBtn', 'FRONT', '前面へ');
  setElementText('#layerDownBtn', 'BACK', '背面へ');

  const matGroupHeaders = document.querySelectorAll('#panel-tune .panel-group .group-header-row');
  if (matGroupHeaders.length >= 2) {
    const h3 = matGroupHeaders[1].querySelector('h3');
    const pill = matGroupHeaders[1].querySelector('.count-pill');
    if (h3) h3.textContent = isEn() ? 'MATERIAL / FONT / COLOR' : '材質・書体・カラー設定';
    if (pill) pill.textContent = isEn() ? 'TUNING' : '調整中';
  }
  setElementText('#panel-tune .tactical-select-row label', 'Glyph Font:', '選択文字の書体:');

  // Material Buttons in Selected & Default Material Groups
  const matBtnLabels = {
    eraser:   { en: 'Eraser',    ja: '消しゴム' },
    rubber:   { en: 'Rubber',    ja: '強化ゴム' },
    wood:     { en: 'Timber',    ja: '天然木材' },
    glass:    { en: 'Glass',     ja: '強化ガラス' },
    stone:    { en: 'Granite',   ja: '花崗岩石' },
    slime:    { en: 'Slime Gel', ja: '粘着ゲル' },
    titanium: { en: 'Titanium',  ja: 'チタン合金' },
    blade:    { en: 'Blade',     ja: 'ブレード鋼' },
    gold:     { en: 'Solid Gold',ja: '純金ゴールド' },
    mecha:    { en: 'Titanium',  ja: '重装メタル' },
    chrome:   { en: 'Chrome',    ja: '鏡面クロム' },
    damascus: { en: 'Damascus',  ja: '鍛造鋼鉄' },
    brass:    { en: 'Brass',     ja: '真鍮ブロンズ' },
    neon:     { en: 'Neon Glass',ja: 'サイバー発光' }
  };
  document.querySelectorAll('.material-selector-grid .mat-pill').forEach(btn => {
    const m = matBtnLabels[btn.dataset.mat];
    if (m) btn.textContent = isEn() ? m.en : m.ja;
  });

  const colorLabels = document.querySelectorAll('#panel-tune .color-picker-row label');
  if (colorLabels.length >= 2) {
    colorLabels[0].textContent = isEn() ? 'Surface Color' : '表面の色';
    colorLabels[1].textContent = isEn() ? 'Extrusion Depth Color' : '厚み(側面)の色';
  }

  // Sub-Panel 2: Input & Palette
  setElementText('#panel-input .highlight-group h3', 'ADD / INPUT CHARACTER GLYPH', '文字の追加・入力');
  setElementText('#panel-input .highlight-group .panel-hint',
    'Up to 5 characters weld together into a single physical machine.',
    '最大5文字まで、すべての文字が互いに接するように合体します');
  setElementText('#addTypedGlyphBtn', '+ ADD', '＋ 追加');
  setElementText('#replaceTypedGlyphBtn', 'REPLACE', '選択文字を置換');
  setElementText('#panel-input .checkbox-pill span',
    'Add as Symmetric Mirror Pair (Requires 2 free slots)',
    '左右対称ペアで追加 (空き2文字必要)');
  setElementText('#panel-input .panel-group:nth-of-type(2) h3', 'TACTICAL GLYPH PALETTE', 'おすすめ文字パレット');
  const inputEl = document.getElementById('glyphKeyboardInput');
  if (inputEl) {
    inputEl.placeholder = isEn()
      ? 'e.g. A, V, X, ★, 剣...'
      : '例: 剣, 龍, A, V, ★...';
  }

  const pNames = isEn()
    ? {
        attack: 'BLADE / SPIKE',
        armor: 'ARMOR / SHIELD',
        speed: 'SPEED / WING',
        special: 'DRAGON / CORE',
        english: 'ENG / A-Z',
        symbols: 'SYM / ★'
      }
    : {
        attack: '鋭角・刃物',
        armor: '重装甲・盾',
        speed: '高速・翼',
        special: '特効・属性',
        english: '英字 / A-Z',
        symbols: '記号 / ★'
      };
  document.querySelectorAll('#paletteCategoryTabs .mini-pill').forEach(el => {
    const cat = el.dataset.palcat;
    if (pNames[cat]) el.textContent = pNames[cat];
  });
  setElementText('[data-i18n="result_career_wins"]', 'TOTAL WINS', '通算勝利数');
  setElementText('[data-i18n="result_turns"]', 'TURNS', '決着手数');
  setElementText('[data-i18n="result_damage"]', 'MAX DAMAGE', '最大ダメージ');
  setElementText('[data-i18n="result_stage"]', 'ARENA STAGE', '対戦ステージ');
  setElementText('#panel-input .panel-group:nth-of-type(3) h3', 'DEFAULT MATERIAL & COLOR', '初期の材質・カラー');
  setElementText('#panel-input .panel-group:nth-of-type(3) .count-pill', '9 TYPES', '全9種');
  setElementText('#panel-input .tactical-select-row label', 'Font Style:', 'フォント書体:');

  const fontTranslations = isEn() ? {
    heavy: 'Heavy Gothic (MAX ARMOR)',
    mecha: 'Blade Mincho (RAZOR EDGE)',
    stencil: 'Rounded Pop (HIGH BOUNCE)',
    brush: 'Warrior Brush (DYNAMIC TORQUE)',
    cyber: 'Cyber Mono (PRECISION TECH)'
  } : {
    heavy: '極太角ゴシック (HEAVY GOTHIC)',
    mecha: '鋭角ブレード明朝 (BLADE MINCHO)',
    stencil: '弾力丸ゴシック (ROUND SLUGGER)',
    brush: '豪快武神毛筆 (WARRIOR BRUSH)',
    cyber: 'サイバー等幅コード (CYBER MONO)'
  };
  ['defaultFontSelect', 'selectedFontSelect'].forEach(selId => {
    const selEl = document.getElementById(selId);
    if (selEl) {
      Array.from(selEl.options).forEach(opt => {
        if (fontTranslations[opt.value]) opt.textContent = fontTranslations[opt.value];
      });
    }
  });

  // Sub-Panel 3: Config & Presets
  setElementText('#panel-config .panel-group:nth-of-type(1) h3', 'MACHINE NAME', '機体の名前');
  setElementText('#autoCenterAllBtn', 'CENTER COM', '重心整列');
  setElementText('#panel-config .checkbox-pill span', 'Show Chassis Weld Lines', '文字間の接合コネクトラインを表示');
  setElementText('#panel-config .panel-group:nth-of-type(2) h3', 'AUTO-BUILD FROM ANY WORD', '好きな言葉から自動合体');
  setElementText('#panel-config .panel-group:nth-of-type(2) .panel-hint',
    'Enter any word (1-5 chars) to automatically weld it into a combat formation!',
    '好きな言葉（1〜5文字）を入れると、すべての文字が接するフォーメーションに自動合体します！');
  setElementText('#buildFromWordBtn', 'AUTO WELD', '合体生成');
  setElementText('#panel-config .panel-group:nth-of-type(3) h3', 'SAMPLE 5-GLYPH MACHINES', 'おすすめ完成機体');
  setElementText('#panel-config .panel-group:nth-of-type(3) .count-pill', '5 BUILDS', '全5機');

  // 4. Craft Center Workbench
  setElementText('#wbModeEditBtn', 'BUILD & SNAP', '文字の配置・変形');
  setElementText('#wbModeTestBtn', 'TEST RANGE [SPACE]', '試し撃ち (テスト)');
  setElementText('#wbAddGlyphBtn', '+ ADD GLYPH', '＋ 文字追加');
  setElementText('#undoCraftBtn', 'UNDO', '戻す');
  setElementText('#redoCraftBtn', 'REDO', '進む');
  setElementText('#randomBuildBtn', 'RANDOM 5-GLYPH', 'ランダム合体');
  setElementText('#clearPartsBtn', 'CLEAR', '初期化');
  setElementHTML('#boardAddGlyphBtn', '<span class="btn-icon">＋</span> ADD GLYPH', '<span class="btn-icon">＋</span> 文字追加');
  setElementText('#workbenchHint',
    'True character-stroke hitboxes & mass! Drag characters to connect and customize.',
    '文字の突起やくぼみ・質量を精密判定。ドラッグで自由に連結・配置できます');
  setElementText('#testRangeControls span',
    'Drag & release on the board to test-fire your machine against dummy targets!',
    'ドラッグして引っ張ると試し撃ちができます（障害物あり）');
  setElementText('#resetTestDummyBtn', 'RESET DUMMIES', 'リセット');
  setElementText('#testFireSkillBtn', '[SPACE] TEST SKILL', '[Space] 必殺技テスト');
  setElementText('.saved-builds-bar .saved-label', 'SAVED SLOTS:', '保存スロット:');
  setElementHTML('.pc-shortcuts-dock',
    '<span class="dock-title">PC COMMANDS:</span><span class="dock-item"><kbd>Del</kbd> Delete</span><span class="dock-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Nudge</span><span class="dock-item"><kbd>Q</kbd><kbd>E</kbd> Rotate 15°</span><span class="dock-item"><kbd>Ctrl+Z</kbd> Undo</span><span class="dock-item"><kbd>Space</kbd> Test Range</span><span class="dock-item"><kbd>Enter</kbd> Sortie</span>',
    '<span class="dock-title">PC COMMANDS:</span><span class="dock-item"><kbd>Del</kbd> 削除</span><span class="dock-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 微移動</span><span class="dock-item"><kbd>Q</kbd><kbd>E</kbd> 15°回転</span><span class="dock-item"><kbd>Ctrl+Z</kbd> 取消</span><span class="dock-item"><kbd>Space</kbd> 試射テスト</span><span class="dock-item"><kbd>Enter</kbd> バトル出撃</span>');

  // 5. Craft Right Sidebar (Spec Analyzer)
  setElementText('.spec-card .spec-badge', 'MACHINE SPECS (MAX 5 GLYPHS)', '機体スペック (最大5文字)');
  const specWeightSpans = document.querySelectorAll('.spec-weight-row span');
  if (specWeightSpans.length >= 2) {
    const wStrong = document.getElementById('specTotalWeight')?.outerHTML || '<strong id="specTotalWeight">24.5g</strong>';
    const tStrong = document.getElementById('specBuildType')?.outerHTML || '<strong id="specBuildType">STRIKER</strong>';
    specWeightSpans[0].innerHTML = isEn() ? `MASS: ${wStrong}` : `総重量: ${wStrong}`;
    specWeightSpans[1].innerHTML = isEn() ? `CLASS: ${tStrong}` : `タイプ: ${tStrong}`;
  }
  const statLabels = document.querySelectorAll('.stat-bars-list .stat-item .stat-label-row span');
  if (statLabels.length >= 5) {
    const sNames = isEn()
      ? ['ATTACK (IMPACT)', 'DEFENSE (ARMOR)', 'SPEED (LAUNCH)', 'BRAKE (GRIP)', 'SPIN (TORQUE)']
      : ['攻撃力 (衝撃)', '防御力 (耐性)', 'スピード (速度)', 'ブレーキ (摩擦)', 'スピン (旋回)'];
    statLabels.forEach((el, i) => { if (sNames[i]) el.textContent = sNames[i]; });
  }
  const eqH3 = document.querySelectorAll('.equipped-summary-box h3');
  if (eqH3.length >= 2) {
    eqH3[0].textContent = isEn() ? 'ULTIMATE SKILL [SPACE]' : '必殺技';
    const cSpan = document.getElementById('specCharCountText')?.outerHTML || '<span id="specCharCountText">5</span>';
    eqH3[1].innerHTML = isEn()
      ? `GLYPH COMPOSITION (${cSpan}/5 CONNECTED)`
      : `構成文字パーツ (${cSpan}/5・全文字接触OK)`;
  }
  setElementText('#rewardedCraftBoostBtn span[data-i18n="ad_unlock_legendary"]',
    'UNLOCK LEGENDARY BUILD (+1 SKILL)',
    '伝説の5文字機体を解放 (+技1)');

  // 6. Battle View Top HUD & Selects
  setElementText('#p1Card .player-badge', '1P (YOU)', '1P (あなた)');
  setElementText('#p2Badge', '2P / RIVAL', '2P / CPU');
  document.querySelectorAll('.stability-bar-wrap .bar-label').forEach(el => {
    el.textContent = isEn() ? 'DAMAGE (%)' : '蓄積ダメージ(%)';
  });

  ['sortieStageSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      Array.from(el.options).forEach(opt => {
        const st = I18N_DATA.stages[opt.value];
        if (st) opt.textContent = isEn() ? st.enName : st.jaName;
      });
    }
  });

  // 7. Battle Left & Right Telemetry Panels
  setElementText('#battleP1Panel .panel-section-badge', '1P ALLY TELEMETRY', '1P 自機テレメトリ');
  setElementText('#battleP2Panel .panel-section-badge', 'ENEMY RIVAL SCANNER', 'ENEMY 相手機体スキャン');

  const p1SpecLabels = document.querySelectorAll('#battleP1Panel .telemetry-spec-item .spec-label');
  if (p1SpecLabels.length >= 4) {
    const l1 = isEn() ? ['MASS', 'ATK', 'DEF', 'SPD'] : ['総重量', '攻撃力', '防御力', '機動力'];
    p1SpecLabels.forEach((el, i) => { if (l1[i]) el.textContent = l1[i]; });
  }
  const p2SpecLabels = document.querySelectorAll('#battleP2Panel .telemetry-spec-item .spec-label');
  if (p2SpecLabels.length >= 4) {
    const l2 = isEn() ? ['MASS', 'ATK', 'DEF', 'SPD'] : ['推定重量', '攻撃力', '防御力', '機動力'];
    p2SpecLabels.forEach((el, i) => { if (l2[i]) el.textContent = l2[i]; });
  }

  document.querySelectorAll('.telemetry-stability-box .stability-header span').forEach(el => {
    el.textContent = isEn() ? 'DAMAGE (%)' : '蓄積ダメージ(%)';
  });

  const p1BoxTitles = document.querySelectorAll('#battleP1Panel .telemetry-box .box-title');
  if (p1BoxTitles.length >= 4) {
    p1BoxTitles[0].textContent = isEn() ? 'GLYPH COMPOSITION' : '合体文字パーツ構成';
    p1BoxTitles[1].textContent = isEn() ? 'ACTIVE SPIN MODE' : '選択中スピン特性';
    p1BoxTitles[2].textContent = isEn() ? 'TACTICAL OVERDRIVE (AD BONUS)' : '戦術オーバードライブ (広告ボーナス)';
    p1BoxTitles[3].textContent = isEn() ? 'PC CONTROLS' : 'PC操作ショートカット';
  }
  setElementText('#rewardedSkillBoostBtn span[data-i18n="ad_skill_boost"]', '+1 SKILL STOCK BOOST', '必殺技ストック +1');
  setElementHTML('#battleP1Panel .telemetry-hint-list',
    '<li><kbd>L-Drag</kbd> Aim & Shoot</li><li><kbd>R-Click</kbd> Cancel Aim</li><li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Spin Mode</li><li><kbd>Space</kbd> Ultimate Skill</li>',
    '<li><kbd>左ドラッグ</kbd> 照準・発射</li><li><kbd>右クリック</kbd> 照準キャンセル</li><li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> スピン切替</li><li><kbd>Space</kbd> 必殺技発動</li>');

  const p2BoxTitles = document.querySelectorAll('#battleP2Panel .telemetry-box .box-title');
  if (p2BoxTitles.length >= 3) {
    p2BoxTitles[0].textContent = isEn() ? 'RIVAL GLYPH PARTS' : '相手の合体文字パーツ';
    p2BoxTitles[1].textContent = isEn() ? 'TACTICAL ADVICE // WEAKNESS' : '戦術アドバイス // 弱点分析';
    p2BoxTitles[2].textContent = isEn() ? 'ARENA STAGE INFO' : '環境・ステージ情報';
  }

  // 8. Battle Footer Controls
  setElementText('.spin-selector-group .group-title', 'SPIN MODE:', 'スピン切替:');
  const spinBtns = document.querySelectorAll('.spin-selector-group .spin-btn .spin-text');
  if (spinBtns.length >= 3) {
    spinBtns[0].innerHTML = isEn() ? '<strong>DRIVE (TOP)</strong><small>Push Forward</small>' : '<strong>前進 (DRIVE)</strong><small>突進・押し込み</small>';
    spinBtns[1].innerHTML = isEn() ? '<strong>NORMAL (STD)</strong><small>Balanced</small>' : '<strong>標準 (NORMAL)</strong><small>ニュートラル</small>';
    spinBtns[2].innerHTML = isEn() ? '<strong>BRAKE (BACK)</strong><small>Quick Stop</small>' : '<strong>ブレーキ (BACK)</strong><small>衝突時急停止</small>';
  }
  setElementHTML('.pc-battle-mouse-hint',
    '<span class="hint-badge"><kbd>L-Drag</kbd> Shoot</span><span class="hint-badge"><kbd>R-Click</kbd> Cancel</span><span class="hint-badge"><kbd>Wheel</kbd> Spin</span><span class="hint-badge"><kbd>Space</kbd> Skill</span>',
    '<span class="hint-badge"><kbd>左ドラッグ</kbd> ショット</span><span class="hint-badge"><kbd>右クリック</kbd> 狙い解除</span><span class="hint-badge"><kbd>ホイール</kbd> スピン</span><span class="hint-badge"><kbd>Space</kbd> 必殺技</span>');
  setElementHTML('#undoBattleTurnBtn', '<kbd>Z</kbd> UNDO', '<kbd>Z</kbd> 1手戻す');
  setElementHTML('#backToCraftBtn', '<kbd>Esc</kbd> CRAFT', '<kbd>Esc</kbd> 設計室へ');
  setElementHTML('#resetMatchBtn', '<kbd>R</kbd> REMATCH', '<kbd>R</kbd> 最初から');

  // 9. PC Guide Modal & Match Result Modal
  setElementText('#pcKeyGuideModal .guide-header-row h2', 'PC CONTROLS GUIDE', 'PC操作ガイド');
  setElementText('#closePcGuideBtn', 'CLOSE', '閉じる');

  setElementHTML('#pcKeyGuideModal .guide-grid', isEn() ? `
    <div class="guide-col">
      <h3>CRAFT STUDIO</h3>
      <ul class="guide-list">
        <li><kbd>Left-Drag</kbd> Move & Snap glyph parts freely</li>
        <li><kbd>Mouse Wheel</kbd> Scale selected glyph</li>
        <li><kbd>Delete</kbd> / <kbd>Backspace</kbd> Remove selected glyph</li>
        <li><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Arrows Fine-tune nudge</li>
        <li><kbd>Q</kbd> / <kbd>E</kbd> Rotate 15° (Left / Right)</li>
        <li><kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> Undo / Redo</li>
        <li><kbd>Space</kbd> Toggle Test Range mode</li>
        <li><kbd>Enter</kbd> Launch Sortie to Battle</li>
      </ul>
    </div>
    <div class="guide-col">
      <h3>BATTLE ARENA</h3>
      <ul class="guide-list">
        <li><kbd>Left-Drag</kbd> Pull back to aim angle & power, release to launch</li>
        <li><kbd>Right-Click</kbd> Cancel aiming</li>
        <li><kbd>Mouse Wheel</kbd> Cycle spin mode (Drive / Normal / Brake)</li>
        <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Direct spin selection</li>
        <li><kbd>Space</kbd> Unleash Ultimate Skill mid-slide</li>
        <li><kbd>Z</kbd> Undo turn to start of player round</li>
        <li><kbd>R</kbd> Rematch from Round 1</li>
        <li><kbd>Esc</kbd> Return to Craft Studio</li>
      </ul>
    </div>
  ` : `
    <div class="guide-col">
      <h3>機体設計室 (CRAFT STUDIO)</h3>
      <ul class="guide-list">
        <li><kbd>マウス左ドラッグ</kbd> 文字パーツの配置・自由移動</li>
        <li><kbd>マウスホイール</kbd> 選択文字の拡大・縮小</li>
        <li><kbd>Delete</kbd> / <kbd>Backspace</kbd> 選択中の文字を削除</li>
        <li><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / 矢印キー 文字の精密な微移動</li>
        <li><kbd>Q</kbd> / <kbd>E</kbd> 15度回転 (左 / 右)</li>
        <li><kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> 元に戻す / やり直す</li>
        <li><kbd>Space</kbd> 試し撃ちテストモード切替</li>
        <li><kbd>Enter</kbd> バトル出撃</li>
      </ul>
    </div>
    <div class="guide-col">
      <h3>バトルアリーナ (BATTLE ARENA)</h3>
      <ul class="guide-list">
        <li><kbd>マウス左ドラッグ</kbd> 引っ張って角度と威力を照準、離して発射</li>
        <li><kbd>マウス右クリック</kbd> 照準中のショットキャンセル</li>
        <li><kbd>マウスホイール</kbd> スピン（前進/標準/ブレーキ）切替</li>
        <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> スピン回転のダイレクト選択</li>
        <li><kbd>Space</kbd> 必殺技発動 (滑走中)</li>
        <li><kbd>Z</kbd> 1手戻す (UNDO)</li>
        <li><kbd>R</kbd> ラウンドの最初からやり直し</li>
        <li><kbd>Esc</kbd> 設計室へ戻る</li>
      </ul>
    </div>
  `);

  setElementText('.guide-footer-tip',
    'Experience high-precision physics combat engineered for PC keyboard & mouse.',
    'PCのキーボードとマウスで本格的な物理対戦をお楽しみいただけます。');
  const resLabels = document.querySelectorAll('#matchResultModal .telemetry-item .telemetry-label');
  if (resLabels.length >= 3) {
    resLabels[0].textContent = isEn() ? 'TURNS' : '決着ターン';
    resLabels[1].textContent = isEn() ? 'MAX DAMAGE' : '最大蓄積ダメージ';
    resLabels[2].textContent = isEn() ? 'ARENA STAGE' : 'ステージ';
  }
  setElementText('#resultRematchBtn', 'REMATCH', 'もう一度戦う (再戦)');
  setElementText('#resultAdRematchBtn span[data-i18n="btn_ad_rematch"]', 'REMATCH WITH +1 SKILL', '技ストック+1で有利に再戦');
  setElementText('#resultToCraftBtn', 'RETURN TO CRAFT DOCK', '設計室へ戻る');

  // 10. Sortie Matchmaking Modal (VS CPU & P2P Online)
  setElementText('#sortieModalTitle', 'SELECT BATTLE MODE // DEPLOY', '出撃モード選択 // バトル開始');
  setElementText('#closeSortieModalBtn', 'CLOSE', '閉じる');
  setElementText('[data-i18n="sortie_cpu_badge"]', 'SINGLE PLAYER // VS COMPUTER AI', 'シングルプレイ // コンピューター対戦');
  setElementText('[data-i18n="sortie_cpu_heading"]', 'CHALLENGE TACTICAL AI', '戦術AIライバルと激突');
  setElementText('[data-i18n="sortie_cpu_desc"]',
    'Battle against physics-calculating CPU bosses across 10 interactive desk arenas.',
    '自作した5文字機体で、10種類の机ステージ＆強力CPUライバル機と激突します。');
  setElementText('[data-i18n="sortie_label_difficulty"]', 'CPU DIFFICULTY:', 'CPUの強さ:');
  setElementText('[data-i18n="diff_normal"]', 'NORMAL', 'NORMAL (標準)');
  setElementText('[data-i18n="diff_hard"]', 'HARD', 'HARD (強敵)');
  setElementText('[data-i18n="diff_expert"]', 'EXPERT', 'EXPERT (最強鬼神)');
  setElementText('[data-i18n="sortie_label_turn"]', 'TURN ORDER:', '先手・後手の選択:');
  setElementText('[data-i18n="order_p1"]', '1P FIRST', '1P 先手');
  setElementText('[data-i18n="order_p2"]', 'CPU / 2P FIRST', 'CPU / 2P 先手');
  setElementText('[data-i18n="order_random"]', 'RANDOM', 'ランダム');
  setElementText('[data-i18n="sortie_label_stage"]', 'ARENA STAGE:', 'バトルステージ:');
  setElementText('#startCpuBattleBtn', 'LAUNCH VS COMPUTER', 'コンピューター対戦へ出撃');
  setElementText('#startLocalPvpBtn', 'LOCAL 2P PASS & PLAY (SAME PC)', '2P ローカル交互対戦 (同じPC)');

  setElementText('[data-i18n="sortie_p2p_badge"]', 'ONLINE MULTIPLAYER // WEBRTC P2P', 'オンライン通信対戦 // WebRTC P2P');
  setElementText('[data-i18n="sortie_p2p_heading"]', 'P2P ROOM MATCHMAKING', 'P2P ルームコード通信対戦');
  setElementText('[data-i18n="sortie_p2p_desc"]',
    'Connect directly browser-to-browser with a 5-letter Room Code. Custom 5-Glyph Machines sync automatically.',
    '5文字のルームコードを共有してブラウザ間で直接オンライン対戦！お互いの自作5文字機体が自動同期されます。');
  setElementText('[data-i18n="p2p_host_title"]', '1. CREATE ROOM (HOST - 1P)', '1. ルーム作成 (ホスト - 1P)');
  setElementText('#p2pCreateRoomBtn', 'CREATE ROOM CODE', 'ルームコードを発行');
  setElementText('#p2pCopyCodeBtn', 'COPY', 'コピー');
  setElementText('[data-i18n="p2p_join_title"]', '2. JOIN ROOM (GUEST - 2P)', '2. ルーム参加 (ゲスト - 2P)');
  const joinInput = document.getElementById('p2pJoinCodeInput');
  if (joinInput) joinInput.placeholder = isEn() ? 'ENTER CODE' : 'コード入力';
  setElementText('#p2pJoinRoomBtn', 'JOIN MATCH', 'ルームに参加');
  if (!window.p2pState || !window.p2pState.peer) {
    setElementText('#p2pStatusText',
      "P2P Standby: Create a room or enter a friend's 5-letter code.",
      'P2P待機中: ルームを作成するか、相手の5文字コードを入力してください。');
  }
  setElementText('#p2pDisconnectBtn', 'DISCONNECT P2P SESSION', 'P2P通信を切断');

  // Refresh dynamic UIs
  const p1GlyphsContainer = document.getElementById('battleP1GlyphsList');
  if (p1GlyphsContainer) p1GlyphsContainer._cachedCount = 0;
  const p2GlyphsContainer = document.getElementById('battleP2GlyphsList');
  if (p2GlyphsContainer) p2GlyphsContainer._cachedName = '';

  renderPresetMachinesList();
  updateLiveTypedCharPreview();
  updateCraftUI();
  if (battleState.units && battleState.units.length >= 2) {
    battleState.units.forEach(u => {
      if (u && u.build) u.spec = calculateMachineSpec(u.build);
    });
    updateBattleHUD();
  }
  if (typeof updateTutorialUI === 'function') updateTutorialUI();
}

document.getElementById('langToggleBtn')?.addEventListener('click', () => {
  sfx.playClick();
  applyLanguage(isEn() ? 'ja' : 'en');
});


// ============================================================================
// 14. CRAZYGAMES SDK v3 & AD MONETIZATION CONTROLLER (MIDGAME & REWARDED ADS)
// ============================================================================

let cgSdkReady = false;
let cgIsPlayingAd = false;
let cgLastMidgameTime = 0;

async function initCrazyGamesSDK() {
  try {
    if (window.CrazyGames && window.CrazyGames.SDK) {
      await window.CrazyGames.SDK.init();
      cgSdkReady = true;
      if (window.CrazyGames.SDK.game) {
        try {
          if (typeof window.CrazyGames.SDK.game.loadingStart === 'function') {
            window.CrazyGames.SDK.game.loadingStart();
          }
          if (typeof window.CrazyGames.SDK.game.loadingStop === 'function') {
            window.CrazyGames.SDK.game.loadingStop();
          }
        } catch (le) {}
        if (window.CrazyGames.SDK.game.settings && window.CrazyGames.SDK.game.settings.muteAudio) {
          sfx.adMuted = true;
          if (sfx.ctx && sfx.ctx.state === 'running') sfx.ctx.suspend().catch(() => {});
        }
        if (typeof window.CrazyGames.SDK.game.onSettingsChanged === 'function') {
          window.CrazyGames.SDK.game.onSettingsChanged((settings) => {
            if (settings && typeof settings.muteAudio === 'boolean') {
              sfx.adMuted = settings.muteAudio;
              if (sfx.adMuted && sfx.ctx && sfx.ctx.state === 'running') {
                sfx.ctx.suspend().catch(() => {});
              } else if (!sfx.adMuted && sfx.isAudible() && sfx.ctx && sfx.ctx.state === 'suspended') {
                sfx.ctx.resume().catch(() => {});
              }
            }
          });
        }
      }
    }
  } catch (e) {
    cgSdkReady = false;
  }
}

// CrazyGames QA Compliance: Automatic audio muting on tab switch or window blur
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    sfx.setTabMuted(true);
  } else {
    sfx.setTabMuted(false);
  }
});
window.addEventListener('blur', () => {
  sfx.setTabMuted(true);
});
window.addEventListener('focus', () => {
  if (!document.hidden) {
    sfx.setTabMuted(false);
  }
});

function requestCrazyGamesBanner() {
  if (cgSdkReady && window.CrazyGames?.SDK?.banner) {
    try {
      window.CrazyGames.SDK.banner.requestResponsiveBanner('crazygames-banner-container');
    } catch (e) {
      try {
        window.CrazyGames.SDK.banner.requestBanner({
          id: 'crazygames-banner-container',
          width: 728,
          height: 90
        });
      } catch (e2) {}
    }
  }
}

function clearCrazyGamesBanner() {
  if (cgSdkReady && window.CrazyGames?.SDK?.banner) {
    try {
      window.CrazyGames.SDK.banner.clearAllBanners();
    } catch (e) {}
  }
}

function cgGameplayStart() {
  try {
    if (cgSdkReady && window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.gameplayStart();
    }
  } catch (e) {}
}

function cgGameplayStop() {
  try {
    if (cgSdkReady && window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.gameplayStop();
    }
  } catch (e) {}
}

function cgHappytime() {
  try {
    if (cgSdkReady && window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.happytime();
    }
  } catch (e) {}
}

function requestCrazyGamesAd(adType = 'midgame', onReward = null) {
  if (cgIsPlayingAd) return;

  // Let CrazyGames SDK handle its own platform ad frequency capping.
  // In offline/mock mode without SDK, prevent back-to-back mock overlay spam.
  const now = Date.now();
  if (!cgSdkReady && adType === 'midgame' && (now - cgLastMidgameTime < 45000)) {
    if (typeof onReward === 'function') onReward(true);
    return;
  }
  if (adType === 'midgame') cgLastMidgameTime = now;

  cgIsPlayingAd = true;
  sfx.adMuted = true;
  cgGameplayStop();
  clearTimeout(cpuThinkTimeout);

  const finishAd = (rewardedSuccess) => {
    cgIsPlayingAd = false;
    sfx.adMuted = false;
    document.getElementById('cgAdOverlay')?.classList.add('hidden');
    if (adType === 'midgame') cgLastMidgameTime = Date.now();
    if (activeView === 'battle' && battleState.phase !== 'match_over') {
      cgGameplayStart();
      if (battleState.activePlayer === 2 && battleState.mode !== 'pvp' && battleState.mode !== 'p2p-online' && battleState.phase === 'aim') {
        cpuThinkTimeout = setTimeout(executeCPUTurn, 600);
      }
    }
    if (typeof onReward === 'function') {
      onReward(rewardedSuccess);
    }
  };

  if (cgSdkReady && window.CrazyGames?.SDK?.ad) {
    try {
      window.CrazyGames.SDK.ad.requestAd(adType, {
        adStarted: () => {
          sfx.adMuted = true;
        },
        adFinished: () => {
          finishAd(true);
        },
        adError: () => {
          finishAd(adType === 'midgame');
        }
      });
      return;
    } catch (e) {}
  }

  const overlay = document.getElementById('cgAdOverlay');
  const titleEl = document.getElementById('cgAdTitle');
  const descEl = document.getElementById('cgAdCountdownText');
  const fillEl = document.getElementById('cgAdProgressFill');

  if (!overlay) {
    finishAd(true);
    return;
  }

  if (titleEl) {
    titleEl.textContent = adType === 'rewarded'
      ? (isEn() ? 'WATCHING REWARDED AD...' : 'リワード広告を再生中...')
      : (isEn() ? 'SPONSORED AD BREAK' : '広告ブレイク');
  }
  if (descEl) {
    descEl.textContent = isEn()
      ? 'Game audio muted. Granting reward in 2s...'
      : '広告再生中は音声が自動ミュートされます。まもなくボーナスが付与されます...';
  }
  if (fillEl) fillEl.style.width = '0%';
  overlay.classList.remove('hidden');

  const duration = 1600;
  const start = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, Math.round((elapsed / duration) * 100));
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (elapsed >= duration) {
      clearInterval(timer);
      finishAd(true);
    }
  }, 50);
}

// 1. Rewarded Ad in Battle: +1 Skill Stock immediately
document.getElementById('rewardedSkillBoostBtn')?.addEventListener('click', () => {
  const u1 = battleState.units[0];
  if (!u1) return;
  requestCrazyGamesAd('rewarded', (success) => {
    if (!success) return;
    u1.skillStock = (u1.skillStock || 0) + 1;
    sfx.playSkill();
    updateBattleHUD();
    showBattleToast(isEn()
      ? 'REWARD GRANTED! +1 ULTIMATE SKILL STOCK!'
      : '広告ボーナス獲得！ 必殺技ストック +1！');
  });
});

// 2. Rewarded Ad in Result Modal: Rematch with +1 Skill Stock
document.getElementById('resultAdRematchBtn')?.addEventListener('click', () => {
  requestCrazyGamesAd('rewarded', (success) => {
    if (!success) return;
    window._pendingRewardedSkillBonus = true;
    hideMatchResultModal();
    initBattleMatch();
    sfx.playSkill();
    showBattleToast(isEn()
      ? 'REWARDED REMATCH! Started with +1 Ultimate Skill Stock!'
      : 'ボーナス再戦開始！ 最初から必殺技ストック+1を所持！');
  });
});

// 3. Standard Rematch Button: Instant Rematch without ad
document.getElementById('resultRematchBtn')?.addEventListener('click', () => {
  sfx.playClick();
  if (battleState.mode === 'p2p-online' && window.p2pState && window.p2pState.connected && window.p2pState.conn) {
    if (window.p2pState.isHost) {
      let nextStage = battleState.rawStage || document.getElementById('sortieStageSelect')?.value || 'standard';
      if (nextStage === 'random') {
        nextStage = getRandomStageId();
      }
      const nextOrder = (battleState.startingPlayer === 1) ? 2 : 1;
      window.p2pState.conn.send({
        type: 'P2P_REMATCH',
        stage: nextStage,
        startingPlayer: nextOrder
      });
      hideMatchResultModal();
      startOnlineP2PBattle(nextStage, nextOrder);
    } else {
      // Guest requested rematch
      window.p2pState.conn.send({ type: 'REQUEST_REMATCH' });
      showBattleToast(isEn() ? 'Rematch requested! Waiting for Host...' : '再戦をリクエストしました。ホストの応答を待機中...');
    }
    return;
  }
  hideMatchResultModal();
  initBattleMatch();
});

// 4. Rewarded Ad in Craft Studio: Unlock Legendary 5-Glyph Machine + Bonus
document.getElementById('rewardedCraftBoostBtn')?.addEventListener('click', () => {
  requestCrazyGamesAd('rewarded', (success) => {
    if (!success) return;
    pushCraftUndo();
    const legendaryBuild = {
      name: isEn() ? 'OMEGA EMPEROR // 神龍極滅' : '神龍極滅・オメガ帝号',
      weldChassis: true,
      glyphs: [
        { id: 'leg1', char: '神', x: 0,   y: 0,   angle: 0,   scale: 128, mat: 'gold',     color: '#f59e0b', depthColor: '#451a03', fontStyle: 'brush' },
        { id: 'leg2', char: '龍', x: 0,   y: -34, angle: 0,   scale: 115, mat: 'blade',    color: '#ef4444', depthColor: '#450a0a', fontStyle: 'mecha' },
        { id: 'leg3', char: '剣', x: -34, y: -2,  angle: -20, scale: 112, mat: 'titanium', color: '#00e5ff', depthColor: '#0f172a', fontStyle: 'heavy' },
        { id: 'leg4', char: '剣', x: 34,  y: -2,  angle: 20,  scale: 112, mat: 'titanium', color: '#00e5ff', depthColor: '#0f172a', fontStyle: 'heavy', flipX: true },
        { id: 'leg5', char: '覇', x: 0,   y: 34,  angle: 0,   scale: 114, mat: 'gold',     color: '#fde047', depthColor: '#451a03', fontStyle: 'heavy' }
      ]
    };
    enforceConnectedGlyphs(legendaryBuild.glyphs, null, true);
    currentBuild = legendaryBuild;
    selectedGlyphId = currentBuild.glyphs[0].id;
    window._pendingRewardedSkillBonus = true;
    saveStateToStorage();
    updateCraftUI();
    sfx.playWin();
  });
});


// ============================================================================
// 15. POST-SORTIE MATCHMAKING DECK & WEBRTC P2P ONLINE MULTIPLAYER (PeerJS)
// ============================================================================

window.p2pState = {
  peer: null,
  conn: null,
  roomCode: '',
  isHost: true,
  myPlayerNum: 1,
  connected: false,
  remoteBuild: null
};

// Persist Sortie (Pre-battle) Preferences across Sessions via LocalStorage
let selectedSortieDiff = safeGetStorage('keshigomu_neo_sortie_diff', 'cpu-expert');
let selectedSortieOrder = safeGetStorage('keshigomu_neo_sortie_order', 'p1-first');
let selectedSortieStage = safeGetStorage('keshigomu_neo_sortie_stage', 'random');

battleState.mode = selectedSortieDiff;
battleState.turnOrder = selectedSortieOrder;
battleState.rawStage = selectedSortieStage;

const sortieModal = document.getElementById('sortieMatchmakingModal');

function syncSortieUIWithStorage() {
  document.querySelectorAll('#sortieCpuDiffGroup .sortie-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.diff === selectedSortieDiff);
  });
  document.querySelectorAll('#sortieTurnOrderGroup .sortie-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.order === selectedSortieOrder);
  });
  const stageEl = document.getElementById('sortieStageSelect');
  if (stageEl && selectedSortieStage) {
    stageEl.value = selectedSortieStage;
  }
}

// Wire up Sortie Difficulty Pill Buttons with immediate persistence
document.querySelectorAll('#sortieCpuDiffGroup .sortie-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedSortieDiff = btn.dataset.diff || 'cpu-expert';
    safeSetStorage('keshigomu_neo_sortie_diff', selectedSortieDiff);
    battleState.mode = selectedSortieDiff;
    document.querySelectorAll('#sortieCpuDiffGroup .sortie-pill').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    sfx.playClick();
  });
});

// Wire up Sortie Turn Order Pill Buttons with immediate persistence
document.querySelectorAll('#sortieTurnOrderGroup .sortie-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedSortieOrder = btn.dataset.order || 'p1-first';
    safeSetStorage('keshigomu_neo_sortie_order', selectedSortieOrder);
    battleState.turnOrder = selectedSortieOrder;
    document.querySelectorAll('#sortieTurnOrderGroup .sortie-pill').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    sfx.playClick();
  });
});

// Wire up Sortie Arena Stage Dropdown with immediate persistence
document.getElementById('sortieStageSelect')?.addEventListener('change', (e) => {
  selectedSortieStage = e.target.value || 'random';
  safeSetStorage('keshigomu_neo_sortie_stage', selectedSortieStage);
  battleState.rawStage = selectedSortieStage;
});

// Initialize UI to match stored preferences on startup
syncSortieUIWithStorage();

function openSortieModal() {
  if (!sortieModal) return;
  syncSortieUIWithStorage();
  sortieModal.classList.remove('hidden');
  sfx.playClick();
}

function closeSortieModal() {
  sortieModal?.classList.add('hidden');
}

document.getElementById('openSortieModalBtn')?.addEventListener('click', openSortieModal);
document.getElementById('closeSortieModalBtn')?.addEventListener('click', closeSortieModal);
document.getElementById('sortieModalBackdrop')?.addEventListener('click', closeSortieModal);

// Launch VS CPU Battle from Sortie Modal
document.getElementById('startCpuBattleBtn')?.addEventListener('click', () => {
  const stage = document.getElementById('sortieStageSelect')?.value || selectedSortieStage || 'random';
  selectedSortieStage = stage;
  safeSetStorage('keshigomu_neo_sortie_stage', stage);
  safeSetStorage('keshigomu_neo_sortie_diff', selectedSortieDiff);
  safeSetStorage('keshigomu_neo_sortie_order', selectedSortieOrder);
  battleState.mode = selectedSortieDiff;
  battleState.turnOrder = selectedSortieOrder;
  battleState.rawStage = stage;

  closeSortieModal();
  switchMainView('battle');
});

// Launch Local 2P Pass & Play from Sortie Modal
document.getElementById('startLocalPvpBtn')?.addEventListener('click', () => {
  const stage = document.getElementById('sortieStageSelect')?.value || selectedSortieStage || 'random';
  selectedSortieStage = stage;
  safeSetStorage('keshigomu_neo_sortie_stage', stage);
  safeSetStorage('keshigomu_neo_sortie_order', selectedSortieOrder);
  battleState.mode = 'pvp';
  battleState.turnOrder = selectedSortieOrder;
  battleState.rawStage = stage;

  closeSortieModal();
  switchMainView('battle');
});

// (battleModeSelect dropdown removed)

function setP2PStatus(msg, isConnected = false) {
  const dot = document.getElementById('p2pStatusDot');
  const txt = document.getElementById('p2pStatusText');
  const discBtn = document.getElementById('p2pDisconnectBtn');
  if (txt) txt.textContent = msg;
  if (dot) {
    dot.classList.toggle('connected', isConnected);
  }
  if (discBtn) {
    discBtn.classList.toggle('hidden', !window.p2pState.peer);
  }
}

function disconnectP2P() {
  try {
    if (window.p2pState.conn) window.p2pState.conn.close();
    if (window.p2pState.peer) window.p2pState.peer.destroy();
  } catch (e) {}
  window.p2pState.conn = null;
  window.p2pState.peer = null;
  window.p2pState.connected = false;
  window.p2pState.remoteBuild = null;
  const codeDisp = document.getElementById('p2pRoomCodeText');
  if (codeDisp) codeDisp.textContent = '-----';
  document.getElementById('p2pHostCodeBox')?.classList.add('hidden');
  setP2PStatus(isEn() ? 'Status: Disconnected' : '通信状態: 未接続', false);
}

document.getElementById('p2pDisconnectBtn')?.addEventListener('click', () => {
  sfx.playClick();
  disconnectP2P();
});

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function setupP2PConnection(conn) {
  window.p2pState.conn = conn;

  conn.on('open', () => {
    window.p2pState.connected = true;
    sfx.playWin();
    setP2PStatus(
      isEn()
        ? `Connected! You are ${window.p2pState.myPlayerNum}P — Launching P2P Match!`
        : `P2P接続完了！ あなたは ${window.p2pState.myPlayerNum}P です。対戦を開始します！`,
      true
    );

    if (!window.p2pState.isHost) {
      conn.send({
        type: 'HELLO_GUEST',
        build: currentBuild
      });
    }
  });

  conn.on('data', data => {
    if (!data || !data.type) return;

    if (data.type === 'HELLO_GUEST' && window.p2pState.isHost) {
      window.p2pState.remoteBuild = data.build;
      let stage = battleState.rawStage || document.getElementById('sortieStageSelect')?.value || 'standard';
      if (stage === 'random') {
        stage = getRandomStageId();
      }
      conn.send({
        type: 'START_MATCH',
        hostBuild: currentBuild,
        stage,
        startingPlayer: 1
      });
      startOnlineP2PBattle(stage, 1);
    } else if (data.type === 'START_MATCH' && !window.p2pState.isHost) {
      window.p2pState.remoteBuild = data.hostBuild;
      startOnlineP2PBattle(data.stage || 'standard', data.startingPlayer || 1);
    } else if (data.type === 'REQUEST_REMATCH' && window.p2pState.isHost) {
      let nextStage = battleState.rawStage || document.getElementById('sortieStageSelect')?.value || 'standard';
      if (nextStage === 'random') {
        nextStage = getRandomStageId();
      }
      const nextOrder = (battleState.startingPlayer === 1) ? 2 : 1;
      conn.send({
        type: 'P2P_REMATCH',
        stage: nextStage,
        startingPlayer: nextOrder
      });
      hideMatchResultModal();
      startOnlineP2PBattle(nextStage, nextOrder);
    } else if (data.type === 'BURST_EVENT') {
      const victim = battleState.units.find(u => u.id === data.victimId);
      const attacker = battleState.units.find(u => u.id !== data.victimId);
      if (victim && attacker) {
        triggerBurstMachine(victim, attacker, { contactX: data.contactX, contactY: data.contactY }, data.impactMag, true);
      }
    } else if (data.type === 'P2P_REMATCH' && !window.p2pState.isHost) {
      hideMatchResultModal();
      startOnlineP2PBattle(data.stage || 'standard', data.startingPlayer || 1);
    } else if (data.type === 'SHOT') {
      const shooterIdx = (battleState.activePlayer || 1) - 1;
      const unit = battleState.units[shooterIdx];
      if (unit && battleState.phase === 'aim') {
        launchUnit(unit, data.powerRatio, data.angle, data.spinType);
      }
    } else if (data.type === 'SKILL') {
      const shooterIdx = (battleState.activePlayer || 1) - 1;
      const unit = battleState.units[shooterIdx];
      if (unit && battleState.phase === 'moving') {
        activateUnitSkill(unit, battleState.units, battleState.particles);
      }
    } else if (data.type === 'TURN_SYNC' && !window.p2pState.isHost) {
      if (Array.isArray(data.units) && battleState.units.length >= 2) {
        data.units.forEach((su, idx) => {
          const u = battleState.units[idx];
          if (u) {
            u.x = su.x;
            u.y = su.y;
            u.vx = 0;
            u.vy = 0;
            u.angle = su.angle;
            u.angVel = 0;
            u.damagePct = su.damagePct;
            u.skillStock = su.skillStock;
            u.fallen = su.fallen;
            u.burst = su.burst || false;
          }
        });
        battleState.turn = data.turn;
        battleState.activePlayer = data.activePlayer;
        battleState.p1Score = data.p1Score;
        battleState.p2Score = data.p2Score;
        battleState.phase = 'aim';
        updateBattleHUD();
      }
    }
  });

  conn.on('close', () => {
    window.p2pState.connected = false;
    setP2PStatus(isEn() ? 'Opponent disconnected.' : '通信相手が切断しました', false);
    showBattleToast(isEn() ? 'P2P Opponent disconnected. Switched to vs CPU.' : '通信相手が切断されました。CPU対戦に切り替えます');
    if (battleState.mode === 'p2p-online') {
      battleState.mode = 'cpu-normal';
      updateBattleHUD();
      if (battleState.activePlayer === 2 && battleState.phase === 'aim') {
        cpuThinkTimeout = setTimeout(executeCPUTurn, 1000);
      }
    }
  });
}

function startOnlineP2PBattle(stageId, startingPlayer) {
  closeSortieModal();
  battleState.mode = 'p2p-online';
  battleState.rawStage = stageId;
  battleState.stage = stageId;
  battleState.turnOrder = startingPlayer === 2 ? 'p2-first' : 'p1-first';

  switchMainView('battle', true);
  initBattleMatch();
}

function sendP2PShot(powerRatio, angle, spinType) {
  if (window.p2pState.connected && window.p2pState.conn) {
    window.p2pState.conn.send({
      type: 'SHOT',
      powerRatio,
      angle,
      spinType
    });
  }
}

function sendP2PSkill() {
  if (window.p2pState.connected && window.p2pState.conn) {
    window.p2pState.conn.send({
      type: 'SKILL'
    });
  }
}

function onTurnAdvancedP2P() {
  if (battleState.mode === 'p2p-online' && window.p2pState.connected && window.p2pState.isHost && window.p2pState.conn) {
    window.p2pState.conn.send({
      type: 'TURN_SYNC',
      turn: battleState.turn,
      activePlayer: battleState.activePlayer,
      p1Score: battleState.p1Score,
      p2Score: battleState.p2Score,
      units: battleState.units.map(u => ({
        x: u.x,
        y: u.y,
        angle: u.angle,
        damagePct: u.damagePct,
        skillStock: u.skillStock || 0,
        fallen: u.fallen,
        burst: u.burst || false
      }))
    });
  }
}

// Host Room Button
document.getElementById('p2pCreateRoomBtn')?.addEventListener('click', () => {
  if (typeof Peer === 'undefined') {
    setP2PStatus(isEn() ? 'PeerJS library not loaded (Check network).' : 'PeerJS通信ライブラリを読み込めませんでした', false);
    return;
  }
  disconnectP2P();
  sfx.playClick();

  const code = generateRoomCode();
  window.p2pState.roomCode = code;
  window.p2pState.isHost = true;
  window.p2pState.myPlayerNum = 1;

  const peerId = `glyphclash-neo-${code}`;
  setP2PStatus(isEn() ? `Creating Room [${code}]...` : `ルーム [${code}] を作成中...`, false);

  try {
    const peer = new Peer(peerId);
    window.p2pState.peer = peer;

    peer.on('open', () => {
      const codeEl = document.getElementById('p2pRoomCodeText');
      if (codeEl) codeEl.textContent = code;
      document.getElementById('p2pHostCodeBox')?.classList.remove('hidden');
      setP2PStatus(
        isEn()
          ? `Room [${code}] Ready! Share this 5-letter code with your rival.`
          : `ルーム [${code}] 待機中！相手にこの5文字コードを伝えてください`,
        false
      );
    });

    peer.on('connection', conn => {
      setupP2PConnection(conn);
    });

    peer.on('error', err => {
      setP2PStatus(isEn() ? `P2P Error: ${err.type || 'Connection failed'}` : `通信エラー: ${err.type || '接続失敗'}`, false);
    });
  } catch (e) {
    setP2PStatus(isEn() ? 'Could not initialize WebRTC Peer.' : 'WebRTC通信の初期化に失敗しました', false);
  }
});

// Copy Room Code Button
document.getElementById('p2pCopyCodeBtn')?.addEventListener('click', () => {
  if (!window.p2pState.roomCode) return;
  navigator.clipboard?.writeText(window.p2pState.roomCode).catch(() => {});
  sfx.playClick();
  const copyBtn = document.getElementById('p2pCopyCodeBtn');
  if (copyBtn) {
    copyBtn.textContent = isEn() ? 'COPIED!' : 'コピー完了!';
    setTimeout(() => {
      copyBtn.textContent = isEn() ? 'COPY' : 'コピー';
    }, 1500);
  }
});

// Join Room Button
document.getElementById('p2pJoinRoomBtn')?.addEventListener('click', () => {
  if (typeof Peer === 'undefined') {
    setP2PStatus(isEn() ? 'PeerJS library not loaded (Check network).' : 'PeerJS通信ライブラリを読み込めませんでした', false);
    return;
  }
  const inputEl = document.getElementById('p2pJoinCodeInput');
  const rawCode = (inputEl?.value || '').trim().toUpperCase();
  if (rawCode.length < 4) {
    setP2PStatus(isEn() ? 'Enter a valid 5-character Room Code first!' : '5文字のルームコードを入力してください', false);
    return;
  }

  disconnectP2P();
  sfx.playClick();

  window.p2pState.roomCode = rawCode;
  window.p2pState.isHost = false;
  window.p2pState.myPlayerNum = 2;

  setP2PStatus(isEn() ? `Connecting to Room [${rawCode}]...` : `ルーム [${rawCode}] に接続中...`, false);

  try {
    const peer = new Peer();
    window.p2pState.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(`glyphclash-neo-${rawCode}`, { reliable: true });
      setupP2PConnection(conn);
    });

    peer.on('error', err => {
      setP2PStatus(isEn() ? `Could not find Room [${rawCode}] (${err.type})` : `ルーム [${rawCode}] が見つかりません`, false);
    });
  } catch (e) {
    setP2PStatus(isEn() ? 'Connection failed.' : '接続に失敗しました', false);
  }
});


// ============================================================================
// 16. ZERO-BARRIER INSTANT PLAY & 3-STEP INTERACTIVE TUTORIAL
// ============================================================================

window.tutorialState = {
  active: false,
  step: 1
};

const TUTORIAL_STEPS = {
  1: {
    enBadge: 'STEP 1 / 3',
    jaBadge: 'STEP 1 / 3',
    enTitle: 'DRAG & RELEASE TO SMASH!',
    jaTitle: '引っ張って弾き飛ばせ！',
    enDesc: 'Drag anywhere on the desk to aim your 5-Glyph Machine, then release to knock the rival off the desk!',
    jaDesc: '机の上をドラッグして狙いを定め、離すと発射！相手機体を机の外へ弾き落とせば勝利です！',
    enNext: 'NEXT TIP →',
    jaNext: '次へ →'
  },
  2: {
    enBadge: 'STEP 2 / 3',
    jaBadge: 'STEP 2 / 3',
    enTitle: 'SPIN MODES & ULTIMATE SKILL (+1 FREE STOCK!)',
    jaTitle: 'スピン切替＆必殺スキル発動！（お試しストック+1付与）',
    enDesc: 'Switch Spin [1-3] for Drive or Brake. While sliding, press [SPACE] or click the Skill button to unleash your Ultimate Skill!',
    jaDesc: '下部ボタン[1〜3]で前進/ブレーキ回転を選択。滑走中に[Space]または画面クリックで必殺技が炸裂します！',
    enNext: 'TRY CRAFTING →',
    jaNext: 'クラフトへ →'
  },
  3: {
    enBadge: 'STEP 3 / 3',
    jaBadge: 'STEP 3 / 3',
    enTitle: 'WELD UP TO 5 GLYPHS IN CRAFT STUDIO!',
    jaTitle: '最大5文字を自由合体クラフト！',
    enDesc: 'Combine Kanji, Letters & Symbols with 9 Materials (Eraser, Blade, Gold, Glass). Every character shape has true physical collision!',
    jaDesc: '漢字・英字・記号を最大5文字まで密着合体！文字の実際のトゲや重心がそのまま物理衝突判定になります！',
    enNext: 'FINISH TUTORIAL',
    jaNext: 'チュートリアル完了'
  }
};

function updateTutorialUI() {
  const bar = document.getElementById('tutorialOverlayBar');
  if (!bar) return;
  if (!window.tutorialState.active) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  const s = TUTORIAL_STEPS[window.tutorialState.step] || TUTORIAL_STEPS[1];
  const badgeEl = document.getElementById('tutorialStepBadge');
  const titleEl = document.getElementById('tutorialTitle');
  const descEl = document.getElementById('tutorialDesc');
  const nextBtn = document.getElementById('tutorialNextBtn');
  const skipBtn = document.getElementById('tutorialSkipBtn');

  if (badgeEl) badgeEl.textContent = isEn() ? s.enBadge : s.jaBadge;
  if (titleEl) titleEl.textContent = isEn() ? s.enTitle : s.jaTitle;
  if (descEl) descEl.textContent = isEn() ? s.enDesc : s.jaDesc;
  if (nextBtn) nextBtn.textContent = isEn() ? s.enNext : s.jaNext;
  if (skipBtn) skipBtn.textContent = isEn() ? 'SKIP [X]' : 'スキップ [X]';
}

function startInteractiveTutorial() {
  window.tutorialState.active = true;
  window.tutorialState.step = 1;
  closeSortieModal();
  if (activeView !== 'battle') {
    switchMainView('battle');
  }
  updateTutorialUI();
}

function stopInteractiveTutorial() {
  window.tutorialState.active = false;
  try {
    safeSetStorage('keshigomu_neo_tutorial_done', '1');
  } catch (e) {}
  updateTutorialUI();
}

function onTutorialPlayerShot() {
  if (!window.tutorialState.active) return;
  if (window.tutorialState.step === 1) {
    window.tutorialState.step = 2;
    const u1 = battleState.units[0];
    if (u1 && (u1.skillStock || 0) < 1) {
      u1.skillStock = 1;
      updateBattleHUD();
    }
    updateTutorialUI();
  }
}

function onTutorialEnteredCraft() {
  if (!window.tutorialState.active) return;
  if (window.tutorialState.step < 3) {
    window.tutorialState.step = 3;
    updateTutorialUI();
  }
}

document.getElementById('tutorialStartBtn')?.addEventListener('click', () => {
  sfx.playClick();
  startInteractiveTutorial();
});

document.getElementById('tutorialNextBtn')?.addEventListener('click', () => {
  sfx.playClick();
  if (window.tutorialState.step === 1) {
    window.tutorialState.step = 2;
    const u1 = battleState.units[0];
    if (u1 && (u1.skillStock || 0) < 1) {
      u1.skillStock = 1;
      updateBattleHUD();
    }
    updateTutorialUI();
  } else if (window.tutorialState.step === 2) {
    window.tutorialState.step = 3;
    switchMainView('craft');
    updateTutorialUI();
  } else {
    stopInteractiveTutorial();
  }
});

document.getElementById('tutorialSkipBtn')?.addEventListener('click', () => {
  sfx.playClick();
  stopInteractiveTutorial();
});

// Initialize Language, CrazyGames SDK, and Zero-Barrier Instant Play on Startup
(function bootstrapCrazyGamesEdition() {
  applyLanguage(currentLang);
  initCrazyGamesSDK();
  syncSortieUIWithStorage();

  // Zero-barrier instant play: launch directly into playable Arena with lightweight tutorial coach bar!
  const tutDone = safeGetStorage('keshigomu_neo_tutorial_done', null);
  if (!tutDone) {
    startInteractiveTutorial();
  }
})();
