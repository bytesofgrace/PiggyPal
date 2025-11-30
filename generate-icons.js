// generate-icons.js - Script to generate app icons with the cute piggy bank image
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon configuration
const iconConfig = {
  background: '#FF6B9D', // Pink background
  borderRadius: 0.2237, // 22.37%
  sourceImage: 'assets/images/pig-icon.png'
};

// Sizes needed
const sizes = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 192 },
  { name: 'splash-icon.png', size: 400 }
];

async function generateIcons() {
  console.log('🐷 Generating PiggyPal icons with cute piggy bank image...\n');

  for (const config of sizes) {
    try {
      const { size, name } = config;
      const radius = Math.round(size * iconConfig.borderRadius);
      
      // Calculate piggy size (80% of canvas)
      const piggySize = Math.round(size * 0.8);
      const offset = Math.round((size - piggySize) / 2);
      
      // Create rounded rectangle background
      const backgroundSvg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="${iconConfig.background}"/>
        </svg>
      `;
      
      // Create background
      const background = await sharp(Buffer.from(backgroundSvg))
        .png()
        .toBuffer();
      
      // Resize and composite the piggy image on top
      const piggyImage = await sharp(iconConfig.sourceImage)
        .resize(piggySize, piggySize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
      
      const outputPath = path.join(__dirname, 'assets', 'images', name);
      
      await sharp(background)
        .composite([
          {
            input: piggyImage,
            top: offset,
            left: offset
          }
        ])
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
  console.log('   3. Restart Expo: npx expo start --clear\n');
}

generateIcons().catch(console.error);