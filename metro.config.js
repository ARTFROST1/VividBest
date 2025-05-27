const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Временное решение для ошибки ws/stream с Supabase
config.resolver.unstable_enablePackageExports = false;

module.exports = config; 