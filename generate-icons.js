// generate-icons.js - Script to generate app icons from SVG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon configuration
const iconConfig = {
  background: '#FF6B9D',
  borderRadius: 0.2237, // 22.37%
  emoji: '🐷'
};

// Sizes needed
const sizes = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 192 },
  { name: 'splash-icon.png', size: 400 }
];

async function generateIcons() {
  console.log('🐷 Generating PiggyPal icons...\n');

  for (const config of sizes) {
    try {
      const { size, name } = config;
      const radius = Math.round(size * iconConfig.borderRadius);
      
      // Create SVG with proper emoji positioning
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="rounded">
              <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>
            </clipPath>
          </defs>
          <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="${iconConfig.background}"/>
          <text 
            x="${size / 2}" 
            y="${size * 0.66}" 
            font-size="${size * 0.58}" 
            text-anchor="middle" 
            font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Android Emoji, sans-serif"
          >${iconConfig.emoji}</text>
        </svg>
      `;

      const outputPath = path.join(__dirname, 'assets', 'images', name);
      
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error generating ${config.name}:`, error.message);
    }
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Check the generated icons in assets/images/');
  console.log('   2. Run your app to see the new icon');
  console.log('   3. For iOS, you may need to rebuild: npx expo prebuild --clean\n');
}

generateIcons().catch(console.error);