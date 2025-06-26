const builder = require('electron-builder');
const path = require('path');

// Build configuration
builder.build({
  targets: builder.Platform.MAC.createTarget(['dmg']),
  config: {
    appId: 'com.hotmart.jira',
    productName: 'Hotmart Jira Analytics',
    directories: {
      output: path.join(process.cwd(), 'release')
    },
    files: [
      'dist/**/*',
      'main.js',
      'preload.js'
    ],
    mac: {
      category: 'public.app-category.productivity',
      target: ['dmg'],
      icon: 'assets/icon.png'
    },
    dmg: {
      icon: 'assets/icon.png',
      contents: [
        {
          x: 130,
          y: 220
        },
        {
          x: 410,
          y: 220,
          type: 'link',
          path: '/Applications'
        }
      ]
    }
  }
}).then(() => {
  console.log('DMG build complete!');
}).catch((error) => {
  console.error('Error building DMG:', error);
  process.exit(1);
});