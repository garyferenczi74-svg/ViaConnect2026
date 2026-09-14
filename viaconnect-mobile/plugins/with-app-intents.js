const { withDangerousMod, withInfoPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SIRI_USAGE =
  "ViaConnect uses Siri to speak your Bio Optimization Score, today's protocol next step, and wearable last-sync. Missing pieces stay out, not counted as zero.";

const SWIFT_FILE = 'ViaConnectAppIntents.swift';

function withAppIntents(config) {
  config = withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.NSSiriUsageDescription) {
      cfg.modResults.NSSiriUsageDescription = SIRI_USAGE;
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectName = cfg.modRequest.projectName;
      if (!projectName) return cfg;
      const src = path.join(cfg.modRequest.projectRoot, 'native/app-intents', SWIFT_FILE);
      if (!fs.existsSync(src)) return cfg;
      const destDir = path.join(cfg.modRequest.platformProjectRoot, projectName, 'AppIntents');
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, SWIFT_FILE));
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const projectName = cfg.modRequest.projectName;
    if (!projectName) return cfg;
    const project = cfg.modResults;
    const rel = `${projectName}/AppIntents/${SWIFT_FILE}`;
    if (typeof project.hasFile === 'function' && project.hasFile(rel)) {
      return cfg;
    }
    try {
      project.addSourceFile(rel, { target: project.getFirstTarget().uuid });
    } catch {
      // Prebuild without a generated ios/ project is a no-op until `expo prebuild`.
    }
    return cfg;
  });

  return config;
}

module.exports = withAppIntents;
