const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'], // Para macOS
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        // Opções de configuração do DMG
        background: './assets/dmg-background.png', // Opcional: imagem de fundo para o DMG
        format: 'ULFO', // Formato do DMG (ULFO é comum e compacto)
        // Conteúdo do DMG (ícones e links)
        contents: [
          {
            x: 130, y: 220, type: 'file', path: '/Applications' // Ícone da pasta Aplicativos
          },
          {
            x: 410, y: 220, type: 'link', path: '/Applications' // Link para a pasta Aplicativos
          },
          {
            x: 270, y: 150, type: 'file', path: './out/HotmartJiraAnalytics-darwin-x64/HotmartJiraAnalytics.app' // Ícone do seu aplicativo
          }
        ]
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
