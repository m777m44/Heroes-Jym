// Themes: 206 colour families in 17 categories × 7 variants = 1,442 curated themes (11.0 added
// Iraq — the Tigris, the Euphrates, Ishtar blue, Baghdad nights, Basra palms, Mosul marble and
// more; 4.0 added MAHDI Signature, Coder classics and 56 families; 3.0 had 938, 2.12 658, 2.10
// 120), plus the Theme Studio's 2,721,600 numbered ones — all generated from a hue, a
// saturation and an accent so every one of them stays readable and consistent.
//
//   S.theme        the chosen theme id, '<family>-<variant>' (old saves: 'dark' / 'light')
//   S.themeSystem  follow the phone's light / dark setting (default on): the chosen family is
//                  kept and the variant switches to its light or dark counterpart
//   S.accent       'theme' (the theme's own accent, default) or one of ACCENTS (format.js)
//
// The tokens are written as inline custom properties on <html>, which beat the stylesheet;
// `data-theme` still says dark / light so the mode-specific rules in index.css keep working.
// Classic Dark / Classic Light are exactly the original stylesheet values (no overrides).
import { ACCENTS } from './format.js'

/** The theme categories (2.12) — the tabs of the Themes screen. `mode` forces a light / dark filter. */
export const CATEGORIES = [
  { id: 'golden', name: 'Golden', icon: 'trophy' },
  { id: 'royal', name: 'Royal', icon: 'crown' },
  { id: 'premium', name: 'Premium', icon: 'medal' },
  { id: 'dark', name: 'Dark', icon: 'moon', mode: 'dark' },
  { id: 'light', name: 'Light', icon: 'sun', mode: 'light' },
  { id: 'nature', name: 'Nature', icon: 'leafy' },
  { id: 'ocean', name: 'Ocean & sky', icon: 'drop' },
  { id: 'neon', name: 'Neon', icon: 'bolt' },
  { id: 'warm', name: 'Warm', icon: 'flame' },
  { id: 'pastel', name: 'Pastel', icon: 'heart' },
  { id: 'classic', name: 'Classic', icon: 'circle' },
  { id: 'sport', name: 'Sport', icon: 'dumbbell' },
  // 3.0
  { id: 'glass', name: 'Glass style', icon: 'layers' },   // not 'Glass' — that key is the water glass
  { id: 'minimal', name: 'Minimal', icon: 'square' },
  // 4.0
  { id: 'signature', name: 'MAHDI Signature', icon: 'starFill' },
  { id: 'code', name: 'Coder classics', icon: 'code' },
  // 11.0
  { id: 'iraq', name: 'Iraq', icon: 'palm' },
]

/**
 * name: a t() key; cat: its category; h/s: hue and saturation of the surfaces;
 * acc / accL: the accent on dark / on light. The first 20 are the 2.10 families (ids kept, so
 * saved themes stay valid); 2.12 added 74 more, 3.0 40, 4.0 56.
 */
export const FAMILIES = [
  { id: 'classic', name: 'Classic', cat: 'classic', h: 240, s: 0, acc: '#30d158', accL: '#34c759' },
  { id: 'midnight', name: 'Midnight', cat: 'dark', h: 225, s: 60, acc: '#0a84ff', accL: '#007aff' },
  { id: 'ocean', name: 'Ocean', cat: 'ocean', h: 195, s: 70, acc: '#40c8e0', accL: '#0a95b5' },
  { id: 'forest', name: 'Forest', cat: 'nature', h: 140, s: 35, acc: '#34c759', accL: '#248a3d' },
  { id: 'sunset', name: 'Sunset', cat: 'warm', h: 18, s: 70, acc: '#ff9f0a', accL: '#e07800' },
  { id: 'rose', name: 'Rose', cat: 'pastel', h: 340, s: 55, acc: '#ff375f', accL: '#e0244d' },
  { id: 'royal', name: 'Royal', cat: 'royal', h: 268, s: 55, acc: '#bf5af2', accL: '#9a3fd0' },
  { id: 'desert', name: 'Desert', cat: 'warm', h: 35, s: 45, acc: '#e0b36a', accL: '#b07a2a' },
  { id: 'coffee', name: 'Coffee', cat: 'warm', h: 25, s: 30, acc: '#c8915a', accL: '#8d5a2b' },
  { id: 'neon', name: 'Neon', cat: 'neon', h: 285, s: 70, acc: '#39ff14', accL: '#1a9e0a' },
  { id: 'arctic', name: 'Arctic', cat: 'ocean', h: 200, s: 40, acc: '#8fd8ff', accL: '#2a8fc8' },
  { id: 'lava', name: 'Lava', cat: 'warm', h: 8, s: 70, acc: '#ff453a', accL: '#d70015' },
  { id: 'mint', name: 'Mint', cat: 'pastel', h: 168, s: 50, acc: '#63e6e2', accL: '#0c9c96' },
  { id: 'gold', name: 'Gold', cat: 'golden', h: 45, s: 60, acc: '#ffd60a', accL: '#b58900' },
  { id: 'lavender', name: 'Lavender', cat: 'pastel', h: 255, s: 45, acc: '#a99bff', accL: '#6e5ce6' },
  { id: 'emerald', name: 'Emerald', cat: 'nature', h: 155, s: 60, acc: '#2ee59d', accL: '#0e9f6e' },
  { id: 'graphite', name: 'Graphite', cat: 'classic', h: 220, s: 8, acc: '#d1d5db', accL: '#4b5563' },
  { id: 'sakura', name: 'Sakura', cat: 'pastel', h: 330, s: 60, acc: '#ff8fc8', accL: '#d6417f' },
  { id: 'cyber', name: 'Cyber', cat: 'neon', h: 190, s: 80, acc: '#00f0ff', accL: '#0098a8' },
  { id: 'olive', name: 'Olive', cat: 'nature', h: 75, s: 35, acc: '#b5c84a', accL: '#6f7f1a' },
  // ---- 2.12 ----
  // golden
  { id: 'champagne', name: 'Champagne', cat: 'golden', h: 42, s: 35, acc: '#f1d592', accL: '#9a7424' },
  { id: 'bronze', name: 'Bronze', cat: 'golden', h: 28, s: 45, acc: '#d9924a', accL: '#94551a' },
  { id: 'amber', name: 'Amber', cat: 'golden', h: 38, s: 75, acc: '#ffbf00', accL: '#a87400' },
  { id: 'honey', name: 'Honey', cat: 'golden', h: 40, s: 65, acc: '#f5b841', accL: '#a26e0a' },
  { id: 'rosegold', name: 'Rose gold', cat: 'golden', h: 12, s: 40, acc: '#eaa89a', accL: '#a8574b' },
  { id: 'copper', name: 'Copper', cat: 'golden', h: 20, s: 55, acc: '#e8854a', accL: '#a04c18' },
  { id: 'saffron', name: 'Saffron', cat: 'golden', h: 33, s: 80, acc: '#ff9f40', accL: '#b05d00' },
  { id: 'blackgold', name: 'Black gold', cat: 'golden', h: 45, s: 6, acc: '#d4af37', accL: '#8f6f0c' },
  // royal
  { id: 'imperial', name: 'Imperial', cat: 'royal', h: 275, s: 65, acc: '#b86bff', accL: '#7b2cbf' },
  { id: 'velvet', name: 'Velvet', cat: 'royal', h: 330, s: 50, acc: '#ff5c95', accL: '#a8124a' },
  { id: 'sapphire', name: 'Sapphire', cat: 'royal', h: 220, s: 70, acc: '#4d94ff', accL: '#1d5fd1' },
  { id: 'ruby', name: 'Ruby', cat: 'royal', h: 350, s: 65, acc: '#ff3d6e', accL: '#c2103f' },
  { id: 'amethyst', name: 'Amethyst', cat: 'royal', h: 280, s: 45, acc: '#c98bff', accL: '#8135c2' },
  { id: 'burgundy', name: 'Burgundy', cat: 'royal', h: 345, s: 45, acc: '#e8658a', accL: '#8e1b3a' },
  { id: 'majesty', name: 'Majesty', cat: 'royal', h: 255, s: 55, acc: '#ffd166', accL: '#8a6400' },
  // premium
  { id: 'diamond', name: 'Diamond', cat: 'premium', h: 195, s: 15, acc: '#b9f2ff', accL: '#1f7f9e' },
  { id: 'platinum', name: 'Platinum', cat: 'premium', h: 220, s: 5, acc: '#e5e4e2', accL: '#4f5866' },
  { id: 'obsidian', name: 'Obsidian', cat: 'premium', h: 260, s: 12, acc: '#a497ff', accL: '#5a48d6' },
  { id: 'onyx', name: 'Onyx', cat: 'premium', h: 0, s: 0, acc: '#f5f5f7', accL: '#1c1c1e' },
  { id: 'pearl', name: 'Pearl', cat: 'premium', h: 30, s: 12, acc: '#f0e6d8', accL: '#7a6550' },
  { id: 'titanium', name: 'Titanium', cat: 'premium', h: 210, s: 10, acc: '#9fb3c8', accL: '#4a5f73' },
  { id: 'carbon', name: 'Carbon', cat: 'premium', h: 0, s: 0, acc: '#ff453a', accL: '#d70015' },
  { id: 'marble', name: 'Marble', cat: 'premium', h: 40, s: 6, acc: '#d4bf98', accL: '#75613e' },
  { id: 'silver', name: 'Silver', cat: 'premium', h: 210, s: 4, acc: '#c7cdd6', accL: '#555f6c' },
  // dark
  { id: 'eclipse', name: 'Eclipse', cat: 'dark', h: 245, s: 30, acc: '#8d93ff', accL: '#4b52d6' },
  { id: 'shadow', name: 'Shadow', cat: 'dark', h: 230, s: 10, acc: '#64d2ff', accL: '#0a7ea4' },
  { id: 'abyss', name: 'Abyss', cat: 'dark', h: 205, s: 55, acc: '#1fc3e8', accL: '#0072ad' },
  { id: 'galaxy', name: 'Galaxy', cat: 'dark', h: 265, s: 50, acc: '#e0aaff', accL: '#8a3ffc' },
  { id: 'ink', name: 'Ink', cat: 'dark', h: 220, s: 25, acc: '#a0c4ff', accL: '#3366cc' },
  // light
  { id: 'paper', name: 'Paper', cat: 'light', h: 40, s: 20, acc: '#4d9bff', accL: '#1f6feb' },
  { id: 'cloud', name: 'Cloud', cat: 'light', h: 210, s: 30, acc: '#5ac8fa', accL: '#0a78b8' },
  { id: 'cream', name: 'Cream', cat: 'light', h: 45, s: 45, acc: '#ffb340', accL: '#b05d00' },
  { id: 'ivory', name: 'Ivory', cat: 'light', h: 50, s: 30, acc: '#cfae82', accL: '#7a5c34' },
  { id: 'snow', name: 'Snow', cat: 'light', h: 200, s: 15, acc: '#64d2ff', accL: '#0066dd' },
  { id: 'linen', name: 'Linen', cat: 'light', h: 30, s: 25, acc: '#d6a06e', accL: '#8f5a2a' },
  { id: 'porcelain', name: 'Porcelain', cat: 'light', h: 220, s: 25, acc: '#8b8aff', accL: '#4b49c9' },
  // nature
  { id: 'moss', name: 'Moss', cat: 'nature', h: 95, s: 30, acc: '#a8d84a', accL: '#55760f' },
  { id: 'jungle', name: 'Jungle', cat: 'nature', h: 130, s: 50, acc: '#1fd66b', accL: '#00803a' },
  { id: 'autumn', name: 'Autumn', cat: 'nature', h: 28, s: 55, acc: '#f07a40', accL: '#a8431a' },
  { id: 'earth', name: 'Earth', cat: 'nature', h: 30, s: 25, acc: '#c99a72', accL: '#7b5233' },
  { id: 'bamboo', name: 'Bamboo', cat: 'nature', h: 80, s: 40, acc: '#b2dc7c', accL: '#557f1a' },
  { id: 'meadow', name: 'Meadow', cat: 'nature', h: 110, s: 40, acc: '#8be060', accL: '#3a8a1a' },
  // ocean & sky
  { id: 'lagoon', name: 'Lagoon', cat: 'ocean', h: 178, s: 60, acc: '#35d0c1', accL: '#0b8478' },
  { id: 'sky', name: 'Sky', cat: 'ocean', h: 205, s: 60, acc: '#5ccbfa', accL: '#0277bd' },
  { id: 'deepsea', name: 'Deep sea', cat: 'ocean', h: 215, s: 65, acc: '#1ab2f0', accL: '#00699a' },
  { id: 'glacier', name: 'Glacier', cat: 'ocean', h: 190, s: 30, acc: '#a8e6ef', accL: '#1f7f8f' },
  { id: 'cobalt', name: 'Cobalt', cat: 'ocean', h: 225, s: 75, acc: '#5c82ff', accL: '#2647b3' },
  { id: 'reef', name: 'Reef', cat: 'ocean', h: 185, s: 55, acc: '#ff8a5c', accL: '#c2461a' },
  // neon
  { id: 'synthwave', name: 'Synthwave', cat: 'neon', h: 300, s: 70, acc: '#ff3bdc', accL: '#b0008a' },
  { id: 'laser', name: 'Laser', cat: 'neon', h: 0, s: 60, acc: '#ff2d55', accL: '#c4001d' },
  { id: 'electric', name: 'Electric', cat: 'neon', h: 220, s: 80, acc: '#3d8bff', accL: '#0d47c9' },
  { id: 'toxic', name: 'Toxic', cat: 'neon', h: 90, s: 70, acc: '#b2ff59', accL: '#4a8a00' },
  { id: 'matrix', name: 'Matrix', cat: 'neon', h: 130, s: 60, acc: '#00ff41', accL: '#007a1e' },
  { id: 'vapor', name: 'Vapor', cat: 'neon', h: 270, s: 60, acc: '#00e5ff', accL: '#00829a' },
  { id: 'plasma', name: 'Plasma', cat: 'neon', h: 320, s: 75, acc: '#ff2bb0', accL: '#b00070' },
  // warm
  { id: 'coral', name: 'Coral', cat: 'warm', h: 10, s: 60, acc: '#ff7f50', accL: '#c2461a' },
  { id: 'peach', name: 'Peach', cat: 'warm', h: 25, s: 70, acc: '#ffb38a', accL: '#b5531f' },
  { id: 'ember', name: 'Ember', cat: 'warm', h: 15, s: 65, acc: '#ff6a3d', accL: '#bf360c' },
  { id: 'terracotta', name: 'Terracotta', cat: 'warm', h: 15, s: 45, acc: '#ea8470', accL: '#9e4330' },
  { id: 'cinnamon', name: 'Cinnamon', cat: 'warm', h: 22, s: 45, acc: '#de8a4a', accL: '#94450f' },
  // pastel
  { id: 'babyblue', name: 'Baby blue', cat: 'pastel', h: 205, s: 70, acc: '#8fd3f4', accL: '#2a7fb0' },
  { id: 'lilac', name: 'Lilac', cat: 'pastel', h: 285, s: 45, acc: '#d9a8ff', accL: '#8e3fcc' },
  { id: 'cotton', name: 'Cotton candy', cat: 'pastel', h: 320, s: 60, acc: '#ffb7e3', accL: '#b83a82' },
  { id: 'vanilla', name: 'Vanilla', cat: 'pastel', h: 48, s: 60, acc: '#f3e5ab', accL: '#8a7414' },
  { id: 'apricot', name: 'Apricot', cat: 'pastel', h: 28, s: 65, acc: '#ffc49b', accL: '#b05f22' },
  // classic
  { id: 'mono', name: 'Mono', cat: 'classic', h: 0, s: 0, acc: '#ffffff', accL: '#000000' },
  { id: 'slate', name: 'Slate', cat: 'classic', h: 215, s: 18, acc: '#a3b1c6', accL: '#475569' },
  { id: 'steel', name: 'Steel', cat: 'classic', h: 205, s: 14, acc: '#8db3d6', accL: '#3d6b94' },
  { id: 'charcoal', name: 'Charcoal', cat: 'classic', h: 20, s: 5, acc: '#ff9f0a', accL: '#b35f00' },
  // sport
  { id: 'energy', name: 'Energy', cat: 'sport', h: 85, s: 30, acc: '#c6ff00', accL: '#5f7d00' },
  { id: 'turbo', name: 'Turbo', cat: 'sport', h: 0, s: 40, acc: '#ff5a1f', accL: '#c42c00' },
  { id: 'power', name: 'Power', cat: 'sport', h: 220, s: 45, acc: '#ff9a1f', accL: '#b35a00' },
  { id: 'victory', name: 'Victory', cat: 'sport', h: 45, s: 20, acc: '#ffc61a', accL: '#946e00' },
  { id: 'stadium', name: 'Stadium', cat: 'sport', h: 140, s: 35, acc: '#8aff3d', accL: '#2e7d00' },
  // ---- 3.0: 40 more ----
  // glass — see-through cards over a soft aurora (glass: true)
  { id: 'glass-aurora', name: 'Aurora glass', cat: 'glass', glass: true, h: 265, s: 60, acc: '#9d8cff', accL: '#5b45e0' },
  { id: 'glass-ocean', name: 'Ocean glass', cat: 'glass', glass: true, h: 200, s: 70, acc: '#5ad1ff', accL: '#0a7fb8' },
  { id: 'glass-rose', name: 'Rose glass', cat: 'glass', glass: true, h: 335, s: 60, acc: '#ff7aa8', accL: '#c8245e' },
  { id: 'glass-mint', name: 'Mint glass', cat: 'glass', glass: true, h: 165, s: 55, acc: '#5ef0c8', accL: '#0b8f6c' },
  { id: 'glass-amber', name: 'Amber glass', cat: 'glass', glass: true, h: 38, s: 65, acc: '#ffc04d', accL: '#a86a00' },
  { id: 'glass-violet', name: 'Violet glass', cat: 'glass', glass: true, h: 285, s: 60, acc: '#d68cff', accL: '#8e2fc4' },
  { id: 'glass-frost', name: 'Frost glass', cat: 'glass', glass: true, h: 210, s: 25, acc: '#bfe3ff', accL: '#2f6f9e' },
  { id: 'glass-ember', name: 'Ember glass', cat: 'glass', glass: true, h: 8, s: 65, acc: '#ff7a5c', accL: '#c22f10' },
  { id: 'glass-lime', name: 'Lime glass', cat: 'glass', glass: true, h: 90, s: 55, acc: '#c4f25a', accL: '#4f7f00' },
  { id: 'glass-night', name: 'Night glass', cat: 'glass', glass: true, h: 230, s: 45, acc: '#7fa8ff', accL: '#2f55c8' },
  // minimal — quiet, nearly grey surfaces and one clear accent
  { id: 'chalk', name: 'Chalk', cat: 'minimal', h: 200, s: 4, acc: '#e5e7eb', accL: '#374151' },
  { id: 'stone', name: 'Stone', cat: 'minimal', h: 30, s: 6, acc: '#d6c7b4', accL: '#6b5a45' },
  { id: 'fog', name: 'Fog', cat: 'minimal', h: 210, s: 6, acc: '#9fb3c8', accL: '#46607a' },
  { id: 'sandstone', name: 'Sandstone', cat: 'minimal', h: 38, s: 12, acc: '#e3b778', accL: '#94621f' },
  { id: 'zen', name: 'Zen', cat: 'minimal', h: 150, s: 8, acc: '#8fc9a8', accL: '#3f7a58' },
  { id: 'nordic', name: 'Nordic', cat: 'minimal', h: 205, s: 14, acc: '#88c0d0', accL: '#3b6e8a' },
  { id: 'sepia', name: 'Sepia', cat: 'minimal', h: 32, s: 18, acc: '#d2a679', accL: '#7a4f24' },
  { id: 'pure', name: 'Pure', cat: 'minimal', h: 0, s: 0, acc: '#0a84ff', accL: '#007aff' },
  // dark
  { id: 'nightfall', name: 'Nightfall', cat: 'dark', h: 235, s: 35, acc: '#7d8cff', accL: '#3a4bd6' },
  { id: 'raven', name: 'Raven', cat: 'dark', h: 260, s: 18, acc: '#b9a5ff', accL: '#5f45c8' },
  { id: 'void', name: 'Void', cat: 'dark', h: 280, s: 30, acc: '#e05cff', accL: '#9a1fc0' },
  { id: 'blackout', name: 'Blackout', cat: 'dark', h: 0, s: 0, acc: '#ff3b30', accL: '#d70015' },
  { id: 'storm', name: 'Storm', cat: 'dark', h: 210, s: 25, acc: '#64d2ff', accL: '#0a7fb8' },
  // light
  { id: 'daylight', name: 'Daylight', cat: 'light', h: 210, s: 30, acc: '#3d9bff', accL: '#0066d6' },
  { id: 'morning', name: 'Morning', cat: 'light', h: 45, s: 40, acc: '#ffb340', accL: '#b06a00' },
  { id: 'blossom', name: 'Blossom', cat: 'light', h: 345, s: 35, acc: '#ff6f91', accL: '#c81e4a' },
  { id: 'lemon', name: 'Lemon', cat: 'light', h: 55, s: 60, acc: '#f5e050', accL: '#8a7600' },
  { id: 'breeze', name: 'Breeze', cat: 'light', h: 185, s: 35, acc: '#4fd8d0', accL: '#0b8a83' },
  // neon
  { id: 'hotpink', name: 'Hot pink', cat: 'neon', h: 320, s: 70, acc: '#ff2fb3', accL: '#c4007f' },
  { id: 'ultraviolet', name: 'Ultraviolet', cat: 'neon', h: 270, s: 75, acc: '#a64dff', accL: '#7212d6' },
  { id: 'acid', name: 'Acid', cat: 'neon', h: 75, s: 70, acc: '#d4ff00', accL: '#5e7a00' },
  { id: 'cyberpunk', name: 'Cyberpunk', cat: 'neon', h: 300, s: 65, acc: '#fcee0a', accL: '#8a7f00' },
  { id: 'neonblue', name: 'Neon blue', cat: 'neon', h: 220, s: 80, acc: '#2e9bff', accL: '#0057c2' },
  { id: 'arcade', name: 'Arcade', cat: 'neon', h: 160, s: 70, acc: '#00ffa3', accL: '#008a58' },
  // nature
  { id: 'sage', name: 'Sage', cat: 'nature', h: 120, s: 20, acc: '#a3c9a8', accL: '#4a7a52' },
  { id: 'canyon', name: 'Canyon', cat: 'nature', h: 15, s: 45, acc: '#e8865a', accL: '#a84a1f' },
  { id: 'rainforest', name: 'Rainforest', cat: 'nature', h: 145, s: 55, acc: '#3ee07a', accL: '#13873f' },
  { id: 'tundra', name: 'Tundra', cat: 'nature', h: 190, s: 12, acc: '#a8d8e0', accL: '#3d7480' },
  { id: 'savanna', name: 'Savanna', cat: 'nature', h: 42, s: 50, acc: '#e6b84a', accL: '#94690a' },
  { id: 'orchid', name: 'Orchid', cat: 'nature', h: 300, s: 35, acc: '#e08ce0', accL: '#9a3a9a' },
  // ---- 4.0: 56 more ----
  // signature — the app's own green on black, and five siblings
  { id: 'mahdi', name: 'MAHDI Signature', cat: 'signature', h: 150, s: 30, acc: '#30d158', accL: '#1f8f45' },
  { id: 'mahdi-gold', name: 'MAHDI Gold', cat: 'signature', h: 45, s: 40, acc: '#f5c542', accL: '#946c00' },
  { id: 'mahdi-night', name: 'MAHDI Night', cat: 'signature', h: 225, s: 45, acc: '#4cd98a', accL: '#14824a' },
  { id: 'mahdi-royal', name: 'MAHDI Royal', cat: 'signature', h: 270, s: 45, acc: '#c9a2ff', accL: '#7040c8' },
  { id: 'mahdi-fire', name: 'MAHDI Fire', cat: 'signature', h: 10, s: 55, acc: '#ff6a3d', accL: '#c0380f' },
  { id: 'mahdi-ocean', name: 'MAHDI Ocean', cat: 'signature', h: 195, s: 55, acc: '#3fd8c7', accL: '#0a7f73' },
  // coder classics — after the editor palettes people know
  { id: 'dracula', name: 'Dracula', cat: 'code', h: 231, s: 15, acc: '#bd93f9', accL: '#7a4bcc' },
  { id: 'nord', name: 'Nord', cat: 'code', h: 220, s: 20, acc: '#81a1c1', accL: '#4a6890' },
  { id: 'tokyo', name: 'Tokyo Night', cat: 'code', h: 230, s: 30, acc: '#7aa2f7', accL: '#3858a0' },
  { id: 'gruvbox', name: 'Gruvbox', cat: 'code', h: 40, s: 25, acc: '#fabd2f', accL: '#a36a12' },
  { id: 'solarized', name: 'Solarized', cat: 'code', h: 193, s: 60, acc: '#2aa198', accL: '#1d7a73' },
  { id: 'monokai', name: 'Monokai', cat: 'code', h: 70, s: 8, acc: '#a6e22e', accL: '#577a00' },
  { id: 'onedark', name: 'One Dark', cat: 'code', h: 220, s: 13, acc: '#61afef', accL: '#2c6cb0' },
  { id: 'catppuccin', name: 'Mocha', cat: 'code', h: 240, s: 21, acc: '#cba6f7', accL: '#8034e0' },
  { id: 'everforest', name: 'Everforest', cat: 'code', h: 100, s: 12, acc: '#a7c080', accL: '#55722a' },
  { id: 'rosepine', name: 'Rose pine', cat: 'code', h: 249, s: 22, acc: '#ebbcba', accL: '#a8566e' },
  // dark
  { id: 'midnightsilk', name: 'Midnight silk', cat: 'dark', h: 240, s: 40, acc: '#c7b8ff', accL: '#5846c8' },
  { id: 'noir', name: 'Noir', cat: 'dark', h: 0, s: 0, acc: '#f5f5f7', accL: '#1d1d1f' },
  { id: 'deepspace', name: 'Deep space', cat: 'dark', h: 250, s: 45, acc: '#6e7dff', accL: '#3442c8' },
  { id: 'smoke', name: 'Smoke', cat: 'dark', h: 215, s: 10, acc: '#c0c8d4', accL: '#4a5566' },
  { id: 'crimsonnight', name: 'Crimson night', cat: 'dark', h: 350, s: 40, acc: '#ff4d6d', accL: '#c01d39' },
  // ocean & sky
  { id: 'oceandeep', name: 'Ocean deep', cat: 'ocean', h: 205, s: 75, acc: '#1ec8ff', accL: '#086ca3' },
  { id: 'tropic', name: 'Tropic', cat: 'ocean', h: 180, s: 60, acc: '#2ee6d6', accL: '#09857b' },
  { id: 'navy', name: 'Navy', cat: 'ocean', h: 220, s: 55, acc: '#5c9dff', accL: '#1f54b8' },
  // light
  { id: 'cloudwhite', name: 'Cloud white', cat: 'light', h: 210, s: 15, acc: '#5e9eff', accL: '#2160d0' },
  { id: 'papercream', name: 'Paper cream', cat: 'light', h: 40, s: 35, acc: '#d9a25f', accL: '#865619' },
  { id: 'notebook', name: 'Notebook', cat: 'light', h: 45, s: 8, acc: '#eb5757', accL: '#c02626' },
  // premium
  { id: 'elegant', name: 'Elegant', cat: 'premium', h: 30, s: 15, acc: '#c9a77c', accL: '#79572f' },
  { id: 'luxe', name: 'Luxe', cat: 'premium', h: 0, s: 0, acc: '#d4af37', accL: '#866a12' },
  // pastel
  { id: 'softpastel', name: 'Soft pastel', cat: 'pastel', h: 280, s: 40, acc: '#d7b4ff', accL: '#8549d0' },
  { id: 'bubblegum', name: 'Bubblegum', cat: 'pastel', h: 320, s: 50, acc: '#ff9ed8', accL: '#bd2f85' },
  // minimal
  { id: 'simplegray', name: 'Simple gray', cat: 'minimal', h: 220, s: 3, acc: '#a1a1aa', accL: '#52525b' },
  { id: 'puremono', name: 'Pure mono', cat: 'minimal', h: 0, s: 0, acc: '#ffffff', accL: '#000000' },
  // glass
  { id: 'glass-crystal', name: 'Crystal glass', cat: 'glass', glass: true, h: 190, s: 35, acc: '#a8f0ff', accL: '#0d7890' },
  { id: 'glass-neon', name: 'Neon glass', cat: 'glass', glass: true, h: 300, s: 75, acc: '#ff4dff', accL: '#a800a8' },
  { id: 'glass-borealis', name: 'Borealis glass', cat: 'glass', glass: true, h: 150, s: 60, acc: '#5effb0', accL: '#0a8650' },
  { id: 'glass-gold', name: 'Gold glass', cat: 'glass', glass: true, h: 45, s: 60, acc: '#ffd45c', accL: '#946800' },
  { id: 'glass-sunset', name: 'Sunset glass', cat: 'glass', glass: true, h: 20, s: 70, acc: '#ff9e5c', accL: '#bb4e0e' },
  // neon
  { id: 'vaporwave', name: 'Vaporwave', cat: 'neon', h: 290, s: 60, acc: '#ff71ce', accL: '#bd148a' },
  { id: 'neonnights', name: 'Neon nights', cat: 'neon', h: 250, s: 70, acc: '#05d9e8', accL: '#007a84' },
  { id: 'retrowave', name: 'Retrowave', cat: 'neon', h: 330, s: 65, acc: '#ff8a00', accL: '#a85600' },
  { id: 'grid', name: 'Grid', cat: 'neon', h: 195, s: 85, acc: '#6ff7ff', accL: '#00818e' },
  // nature
  { id: 'mountain', name: 'Mountain', cat: 'nature', h: 210, s: 18, acc: '#9cc3a6', accL: '#3d6a4a' },
  { id: 'oasis', name: 'Oasis', cat: 'nature', h: 170, s: 40, acc: '#4fe3c1', accL: '#0a846a' },
  { id: 'lavenderfield', name: 'Lavender field', cat: 'nature', h: 265, s: 30, acc: '#b69cff', accL: '#6849c8' },
  { id: 'volcano', name: 'Volcano', cat: 'nature', h: 5, s: 50, acc: '#ff5a36', accL: '#b5270a' },
  // warm
  { id: 'sunrise', name: 'Sunrise', cat: 'warm', h: 28, s: 60, acc: '#ffb05c', accL: '#a85a08' },
  { id: 'paprika', name: 'Paprika', cat: 'warm', h: 12, s: 55, acc: '#ff6b4a', accL: '#bd3818' },
  { id: 'caramel', name: 'Caramel', cat: 'warm', h: 30, s: 45, acc: '#e0a060', accL: '#89561d' },
  // golden / royal / sport / classic
  { id: 'goldenhour', name: 'Golden hour', cat: 'golden', h: 38, s: 55, acc: '#ffc65c', accL: '#9a6400' },
  { id: 'sultan', name: 'Sultan', cat: 'golden', h: 42, s: 35, acc: '#e8c070', accL: '#866012' },
  { id: 'emperor', name: 'Emperor', cat: 'royal', h: 275, s: 50, acc: '#d9a8ff', accL: '#7b33c0' },
  { id: 'regal', name: 'Regal', cat: 'royal', h: 230, s: 50, acc: '#8fb0ff', accL: '#2d4eae' },
  { id: 'champion', name: 'Champion', cat: 'sport', h: 210, s: 50, acc: '#ffcc00', accL: '#987600' },
  { id: 'sprint', name: 'Sprint', cat: 'sport', h: 0, s: 60, acc: '#ff3b3b', accL: '#bf0000' },
  { id: 'retro', name: 'Retro', cat: 'classic', h: 30, s: 20, acc: '#e8b04a', accL: '#93630f' },
  // ---- 11.0: Iraq — its rivers, cities, marshes, mountains and history ----
  { id: 'tigris', name: 'Tigris', cat: 'iraq', h: 200, s: 55, acc: '#4fc3f7', accL: '#0a6a99' },
  { id: 'euphrates', name: 'Euphrates', cat: 'iraq', h: 175, s: 50, acc: '#3dd6c0', accL: '#0b7266' },
  { id: 'ishtar', name: 'Ishtar blue', cat: 'iraq', h: 222, s: 70, acc: '#f2c14e', accL: '#7d5900' },
  { id: 'baghdadnights', name: 'Baghdad nights', cat: 'iraq', h: 250, s: 45, acc: '#ffcf6b', accL: '#8a5c00' },
  { id: 'basrapalms', name: 'Basra palms', cat: 'iraq', h: 120, s: 35, acc: '#7ccf6a', accL: '#2c7022' },
  { id: 'mosulmarble', name: 'Mosul marble', cat: 'iraq', h: 210, s: 8, acc: '#b8c7d9', accL: '#44566b' },
  { id: 'erbilcitadel', name: 'Erbil citadel', cat: 'iraq', h: 32, s: 40, acc: '#e8b27a', accL: '#83501e' },
  { id: 'samarra', name: 'Samarra', cat: 'iraq', h: 38, s: 50, acc: '#f0c27b', accL: '#855810' },
  { id: 'marshes', name: 'The marshes', cat: 'iraq', h: 160, s: 40, acc: '#8fe0b0', accL: '#1d7046' },
  { id: 'kurdistan', name: 'Kurdistan mountains', cat: 'iraq', h: 140, s: 30, acc: '#ffd34e', accL: '#7f6100' },
  { id: 'sumer', name: 'Sumer', cat: 'iraq', h: 25, s: 35, acc: '#7cb2ff', accL: '#1f50b0' },
  { id: 'ur', name: 'Ur ziggurat', cat: 'iraq', h: 28, s: 55, acc: '#ff9f5c', accL: '#9c450e' },
  { id: 'iraqidates', name: 'Iraqi dates', cat: 'iraq', h: 22, s: 55, acc: '#e8a05a', accL: '#874512' },
  { id: 'halabja', name: 'Halabja pomegranate', cat: 'iraq', h: 350, s: 55, acc: '#ff5c7a', accL: '#b0102f' },
  { id: 'qamar', name: 'Qamar al-din', cat: 'iraq', h: 30, s: 75, acc: '#ffad42', accL: '#9a5200' },
  { id: 'iraqflag', name: 'Iraq flag', cat: 'iraq', h: 140, s: 6, acc: '#ff4a5a', accL: '#b00d1f' },
]

/** Lightness of bg / elevated / surface / surface-2 / surface-3, and how much of the hue's saturation. */
export const VARIANTS = [
  { id: 'dark', name: 'Dark', mode: 'dark', sat: 0.25, l: [4, 6, 11, 16, 22] },
  { id: 'amoled', name: 'Pure black', mode: 'dark', sat: 0.2, l: [0, 3, 8, 13, 19] },
  { id: 'deep', name: 'Deep', mode: 'dark', sat: 0.55, l: [7, 9, 13, 19, 25], glow: 0.22 },
  { id: 'dusk', name: 'Dusk', mode: 'dark', sat: 0.35, l: [12, 14, 18, 24, 30], glow: 0.16 },
  { id: 'light', name: 'Light', mode: 'light', sat: 0.3, l: [95, 97, 100, 92, 89] },
  { id: 'tint', name: 'Tinted', mode: 'light', sat: 0.45, l: [93, 96, 99, 89, 86], glow: 0.12 },
  { id: 'soft', name: 'Pastel', mode: 'light', sat: 0.6, l: [91, 94, 97, 88, 84], glow: 0.18 },
]
const VAR_IDX = Object.fromEntries(VARIANTS.map(v => [v.id, v]))
// The light / dark counterpart used when following the phone.
const OTHER = { dark: 'light', amoled: 'light', deep: 'soft', dusk: 'tint', light: 'dark', tint: 'dusk', soft: 'deep' }

export const THEMES = FAMILIES.flatMap(f => VARIANTS.map(v => ({ id: f.id + '-' + v.id, family: f, variant: v, mode: v.mode })))
export const THEME_IDX = Object.fromEntries(THEMES.map(x => [x.id, x]))
export const DEFAULT_THEME = 'classic-dark'

// ---- 2.12: the Theme Studio — 2,721,600 generated themes ------------------------------------
// Every combination of background hue (360) × colour strength (10) × style (7 variants) ×
// accent hue (36, every 10°) × glow (3) is its own theme, numbered 1 … STUDIO_COUNT, saved as
// 'g-<number>'. The accent's lightness is solved per background so it always reads (≥ 3:1).
export const STUDIO = { hues: 360, strengths: 10, accents: 36, glows: 3 }
export const STUDIO_COUNT = STUDIO.hues * STUDIO.strengths * VARIANTS.length * STUDIO.accents * STUDIO.glows
const GLOWS = [0, 0.14, 0.26]

/** { h 0-359, s 1-10, v variant id, a 0-350 (step 10), g 0-2 } → its number 1 … STUDIO_COUNT. */
export function studioNumber({ h, s, v, a, g }) {
  const vi = Math.max(0, VARIANTS.findIndex(x => x.id === v))
  let n = ((((h % 360) + 360) % 360) * STUDIO.strengths + (Math.min(10, Math.max(1, s)) - 1)) * VARIANTS.length + vi
  n = (n * STUDIO.accents + (Math.round((((a % 360) + 360) % 360) / 10) % 36)) * STUDIO.glows + Math.min(2, Math.max(0, g))
  return n + 1
}
/** The inverse of studioNumber (null when out of range). */
export function studioParams(n) {
  n = Math.floor(Number(n))
  if (!(n >= 1 && n <= STUDIO_COUNT)) return null
  let r = n - 1
  const g = r % STUDIO.glows; r = Math.floor(r / STUDIO.glows)
  const a = (r % STUDIO.accents) * 10; r = Math.floor(r / STUDIO.accents)
  const vi = r % VARIANTS.length; r = Math.floor(r / VARIANTS.length)
  const s = (r % STUDIO.strengths) + 1; r = Math.floor(r / STUDIO.strengths)
  return { h: r, s, v: VARIANTS[vi].id, a, g }
}
const genCache = new Map()
/** A Studio theme from its number, built like the curated ones. */
export function studioTheme(n) {
  const p = studioParams(n)
  if (!p) return null
  if (genCache.has(n)) return genCache.get(n)
  const v = VAR_IDX[p.v]
  const fam = { id: 'studio', name: 'Studio', cat: 'studio', h: p.h, s: p.s * 10 }
  const bg = hslHex(fam.h, fam.s * v.sat, v.l[0])
  const acc = readableAccent(p.a, bg, v.mode)
  fam.acc = acc; fam.accL = acc
  const th = { id: 'g-' + n, family: fam, variant: v, mode: v.mode, glow: GLOWS[p.g], studio: { ...p, n } }
  if (genCache.size > 400) genCache.clear()
  genCache.set(n, th)
  return th
}
/** An accent of hue `h` whose lightness is moved until it reads on `bg` (≥ 3:1). */
function readableAccent(h, bg, mode) {
  const dark = mode === 'dark'
  for (let l = dark ? 60 : 44; dark ? l <= 92 : l >= 14; l += dark ? 3 : -3) {
    const c = hslHex(h, 88, l)
    if (contrast(c, bg) >= 3) return c
  }
  return dark ? '#ffffff' : '#000000'
}
/** A random Studio number (for 🎲). */
export const randomStudio = (rnd = Math.random) => 1 + Math.floor(rnd() * STUDIO_COUNT)

/** Any theme id → its theme (curated or Studio), else null. */
export function themeOf(id) {
  if (THEME_IDX[id]) return THEME_IDX[id]
  const m = /^g-(\d{1,7})$/.exec(id || '')
  return m ? studioTheme(Number(m[1])) : null
}

/** Saved value → a known theme id ('dark' / 'light' from before 2.10 included). */
export function themeIdOf(v) {
  if (v === 'light') return 'classic-light'
  if (v === 'dark' || !themeOf(v)) return DEFAULT_THEME
  return v
}

/** The theme actually shown: the chosen one, or its counterpart when following the phone. */
export function resolveTheme(S, systemDark) {
  const id = themeIdOf(S && S.theme)
  const th = themeOf(id)
  const follow = !S || S.themeSystem !== false
  if (!follow || systemDark == null) return th
  const want = systemDark ? 'dark' : 'light'
  if (th.mode === want) return th
  if (th.studio) return studioTheme(studioNumber({ ...th.studio, v: OTHER[th.variant.id] })) || th
  return THEME_IDX[th.family.id + '-' + OTHER[th.variant.id]] || th
}

/** Families of a category (2.12). */
export const familiesOf = cat => FAMILIES.filter(f => f.cat === cat)

// ---- colour maths -------------------------------------------------------------------------
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 10) / 10}% ${Math.round(l * 10) / 10}%)`
function rgbOf(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** Mix `hex` towards black (amount < 0) or white (amount > 0). */
export function shade(hex, amount) {
  const t = amount < 0 ? 0 : 255, p = Math.abs(amount)
  return toHex(rgbOf(hex).map(v => v + (t - v) * p))
}
/** WCAG relative luminance 0..1. */
export function luminance(hex) {
  const c = rgbOf(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
/** Black or white text on a filled accent — whichever reads better. */
export const onColor = hex => (contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff')

/** The CSS custom properties of a theme (null = the stylesheet's own values). */
export function themeTokens(th) {
  const f = th.family, v = th.variant
  const acc = v.mode === 'light' ? f.accL : f.acc
  const accent = { '--acc': acc, '--acc-2': shade(acc, v.mode === 'light' ? -0.22 : -0.3), '--on-acc': onColor(acc) }
  if (f.id === 'classic' && (v.id === 'dark' || v.id === 'light')) return { surfaces: null, accent, glow: null, bg: v.id === 'light' ? '#f2f2f7' : '#000000' }
  const s = f.s * v.sat
  const [b, e, s1, s2, s3] = v.l
  const surfaces = {
    '--bg': hsl(f.h, s, b), '--bg-el': hsl(f.h, s, e),
    '--surface': hsl(f.h, s * (v.mode === 'light' ? 0.6 : 0.9), s1),
    '--surface-2': hsl(f.h, s, s2), '--surface-3': hsl(f.h, s, s3),
  }
  if (v.mode === 'dark') {
    // text keeps the system greys, tinted a touch towards the hue
    surfaces['--label-2'] = `hsl(${f.h} ${Math.min(30, f.s * 0.3)}% 92% / .62)`
    surfaces['--label-3'] = `hsl(${f.h} ${Math.min(30, f.s * 0.3)}% 92% / .34)`
  }
  if (f.glass) {
    // 3.0 glass: cards and lists turn see-through (the stylesheet adds a light rim) over a
    // three-colour aurora; sheets and the page itself stay solid so text always reads
    const dk = v.mode === 'dark', gs = Math.max(30, f.s)
    const a = (l, o) => `hsl(${f.h} ${Math.round(gs * 0.5)}% ${l}% / ${o})`
    surfaces['--surface'] = dk ? a(Math.min(40, s1 + 10), 0.42) : a(100, 0.55)
    surfaces['--surface-2'] = dk ? a(Math.min(46, s2 + 12), 0.5) : a(97, 0.62)
    surfaces['--surface-3'] = dk ? a(Math.min(52, s3 + 14), 0.55) : a(92, 0.7)
    const o = dk ? 1 : 0.65
    const aur = `radial-gradient(70% 55% at 8% 0%, color-mix(in srgb, ${acc} ${Math.round(58 * o)}%, transparent), transparent 70%),` +
      `radial-gradient(60% 50% at 100% 38%, hsl(${(f.h + 60) % 360} 85% 58% / ${(0.42 * o).toFixed(2)}), transparent 70%),` +
      `radial-gradient(70% 55% at 30% 100%, hsl(${(f.h + 310) % 360} 85% 52% / ${(0.38 * o).toFixed(2)}), transparent 70%)`
    return { surfaces, accent, glow: aur, bg: hslHex(f.h, s, b), glass: true }
  }
  const g = th.glow != null ? th.glow : v.glow
  const glow = g ? `radial-gradient(120% 70% at 85% -10%, color-mix(in srgb, ${acc} ${Math.round(g * 100)}%, transparent), transparent 60%)` : null
  return { surfaces, accent, glow, bg: hslHex(f.h, s, b) }
}
// meta theme-color wants a plain colour
function hslHex(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255])
}

const KEYS = ['--bg', '--bg-el', '--surface', '--surface-2', '--surface-3', '--label-2', '--label-3', '--acc', '--acc-2', '--on-acc', '--bg-glow']

/** Paint the document with the theme (and the accent: 'theme' or a named ACCENTS key). */
export function applyTheme(th, accent = 'theme', doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return
  const de = doc.documentElement
  const tk = themeTokens(th)
  for (const k of KEYS) de.style.removeProperty(k)
  de.dataset.theme = th.mode
  de.dataset.themeId = th.id
  if (tk.glass) de.dataset.glass = th.mode; else delete de.dataset.glass
  if (tk.surfaces) for (const [k, v] of Object.entries(tk.surfaces)) de.style.setProperty(k, v)
  if (accent && accent !== 'theme' && ACCENTS[accent]) {
    de.dataset.accent = accent                         // the stylesheet's accent rules
  } else {
    de.dataset.accent = 'theme'
    for (const [k, v] of Object.entries(tk.accent)) de.style.setProperty(k, v)
  }
  if (tk.glow) de.style.setProperty('--bg-glow', tk.glow)
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = tk.bg
}

// ---- 9.0: the painted theme as plain colours -------------------------------------------------
// For Android (the notification shade, the status and navigation bars, reminder icons): reads
// the custom properties actually in effect — theme, accent and wallpaper overrides included —
// and resolves each to #rrggbb through the browser's own colour parser.
let probe = null
function cssHex(expr, doc) {
  try {
    if (!probe || !probe.isConnected) { probe = doc.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'; doc.body.appendChild(probe) }
    probe.style.color = ''
    probe.style.color = expr
    const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(probe).color)
    if (!m) return null
    const [r, g, b, a] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    if (a === 0) return null
    return toHex([r, g, b])
  } catch { return null }
}
/** The accent in use as #rrggbb (fallback: the classic green). */
export function themeAccent(doc = typeof document !== 'undefined' ? document : null) {
  return (doc && doc.body && cssHex('var(--acc)', doc)) || '#30d158'
}
/** The classic green of notifications (and the colour when themed notifications are off). */
export const CLASSIC_NOTIF = '#30d158'
const systemDarkNow = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null)
/**
 * 13.0 — the colour every notification wears (icon tint, accent, the channel's LED), worked out
 * from your data alone: the theme (its light or dark twin when following the phone) or the
 * accent you picked. No waiting for the page to repaint, so a reminder scheduled in the same
 * moment as a theme switch already has the new colour. S.notifTheme === false → classic green.
 */
export function notifColor(S, systemDark = systemDarkNow()) {
  if (S && S.notifTheme === false) return CLASSIC_NOTIF
  if (S && S.accent && S.accent !== 'theme' && ACCENTS[S.accent]) return ACCENTS[S.accent]
  const th = resolveTheme(S, systemDark)
  return (th && normHex(themeTokens(th).accent['--acc'])) || CLASSIC_NOTIF
}
/** { acc, acc2, bg, surface, surface2, ink, ink2, light } of the theme on screen, or null. */
export function themePalette(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !doc.body) return null
  const de = doc.documentElement
  const light = de.dataset.theme === 'light'
  const pick = (v, fb) => cssHex(v, doc) || fb
  const bg = pick('var(--bg)', light ? '#f2f2f7' : '#000000')
  // solid versions of the (possibly see-through) surfaces, laid over the background
  const surface = pick(`color-mix(in srgb, var(--surface) 92%, ${bg})`, light ? '#ffffff' : '#1c1c1e')
  const surface2 = pick(`color-mix(in srgb, var(--surface-2) 92%, ${bg})`, light ? '#ececef' : '#2c2c2e')
  const ink = light ? '#000000' : '#ffffff'
  const ink2 = pick(`color-mix(in srgb, ${ink} 62%, ${surface})`, light ? '#6e6e73' : '#a1a1a6')
  return { acc: themeAccent(doc), acc2: pick('var(--acc-2)', '#248a3d'), bg, surface, surface2, ink, ink2, light }
}

/** A small preview of a theme for its card: { bg, surface, surface2, acc, label }. */
export function themePreview(th) {
  const tk = themeTokens(th)
  const s = tk.surfaces
  const light = th.mode === 'light'
  return {
    bg: s ? s['--bg'] : light ? '#f2f2f7' : '#000000',
    surface: s ? s['--surface'] : light ? '#ffffff' : '#1c1c1e',
    surface2: s ? s['--surface-2'] : light ? '#ececef' : '#2c2c2e',
    acc: tk.accent['--acc'], onAcc: tk.accent['--on-acc'],
    label: light ? '#000000' : '#ffffff', glow: tk.glow,
  }
}

// ---- 3.0: colours you type, theme files ------------------------------------------------------
/** '#rrggbb' (or 'rgb' / without #) → { h 0-359, s 0-100, l 0-100 }, else null. */
export function hexToHsl(hex) {
  const x = normHex(hex)
  if (!x) return null
  const [r, g, b] = rgbOf(x).map(v => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(sat * 100), l: Math.round(l * 100) }
}
export const normHex = hex => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim()); return m ? '#' + (m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]).toLowerCase() : null }
export { hslHex }

/** The curated theme whose accent is closest to `hex` (in the mode asked, else either). */
export function nearestTheme(hex, mode = null) {
  const c = normHex(hex)
  if (!c) return null
  const [r, g, b] = rgbOf(c)
  // a rough perceptual distance (weighted RGB — "redmean")
  const dist = x => { const [r2, g2, b2] = rgbOf(x), rm = (r + r2) / 2; return Math.sqrt((2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2) }
  let best = null, bd = Infinity
  for (const th of THEMES) {
    if (mode && th.mode !== mode) continue
    const d = dist(th.mode === 'light' ? th.family.accL : th.family.acc)
    if (d < bd) { bd = d; best = th }
  }
  return best
}

/** Studio settings built around a colour: its hue for the accent, a matching background. */
export function studioFromHex(hex, mode = 'dark') {
  const c = hexToHsl(hex)
  if (!c) return null
  return { h: c.h, s: Math.max(1, Math.min(10, Math.round(c.s / 25) + 2)), v: mode === 'light' ? 'tint' : 'deep', a: Math.round(c.h / 10) * 10 % 360, g: 1 }
}

export const THEME_FILE_KIND = 'mahdi-jym-themes'
/** My themes (and the one in use) as a small JSON file to share or keep. */
export function exportThemes(S) {
  const ids = [...new Set([S && S.theme, ...((S && S.themeFavs) || [])])].filter(id => id && themeOf(id))
  return JSON.stringify({ kind: THEME_FILE_KIND, version: 1, current: themeIdOf(S && S.theme), themes: ids }, null, 2)
}
/** A theme file → { current, themes } with only ids this app knows, else throws. */
export function parseThemes(text) {
  const d = JSON.parse(text)
  if (!d || d.kind !== THEME_FILE_KIND || !Array.isArray(d.themes)) throw new Error('not a theme file')
  const themes = [...new Set(d.themes.filter(id => typeof id === 'string' && themeOf(id)))]
  return { current: typeof d.current === 'string' && themeOf(d.current) ? d.current : null, themes }
}
