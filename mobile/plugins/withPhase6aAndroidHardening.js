const {
  withAppBuildGradle,
  createRunOncePlugin,
} = require("expo/config-plugins");

const PLUGIN_NAME = "withPhase6aAndroidHardening";
const PLUGIN_VERSION = "1.0.0";

const HARDENING_START = "// @egregor-phase6a-hardening-start";
const HARDENING_END = "// @egregor-phase6a-hardening-end";

const DEFAULT_BLOCKED_PERMISSIONS = [
  "android.permission.RECORD_AUDIO",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
];

const REQUIRED_MERGED_PERMISSIONS = ["android.permission.POST_NOTIFICATIONS"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toGroovyList(values) {
  const uniqueValues = [...new Set(values.filter(Boolean))];
  if (uniqueValues.length === 0) {
    return "[]";
  }

  return `[\n${uniqueValues.map((value) => `    "${value}",`).join("\n")}\n]`;
}

function getHardeningBlock({ blockedPermissions, requiredPermissions }) {
  return `${HARDENING_START}
def isReleaseTaskRequested = gradle.startParameter.taskNames.any { taskName ->
    def normalizedTask = taskName.toLowerCase()
    return normalizedTask.contains("release")
}

def readSigningSecret = { String propertyName, List<String> envNames ->
    def propertyValue = findProperty(propertyName)?.toString()?.trim()
    if (propertyValue) {
        return propertyValue
    }

    for (String envName : envNames) {
        def envValue = System.getenv(envName)?.trim()
        if (envValue) {
            return envValue
        }
    }

    return null
}

def releaseStoreFilePath = readSigningSecret("EGREGOR_UPLOAD_STORE_FILE", [
    "EGREGOR_UPLOAD_STORE_FILE",
    "ANDROID_SIGNING_STORE_FILE",
    "EAS_BUILD_ANDROID_KEYSTORE_PATH",
    "ANDROID_INJECTED_SIGNING_STORE_FILE",
])
releaseStoreFilePath = releaseStoreFilePath ?: findProperty("android.injected.signing.store.file")?.toString()?.trim()
def releaseStorePassword = readSigningSecret("EGREGOR_UPLOAD_STORE_PASSWORD", [
    "EGREGOR_UPLOAD_STORE_PASSWORD",
    "ANDROID_SIGNING_STORE_PASSWORD",
    "EAS_BUILD_ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_INJECTED_SIGNING_STORE_PASSWORD",
])
releaseStorePassword = releaseStorePassword ?: findProperty("android.injected.signing.store.password")?.toString()?.trim()
def releaseKeyAlias = readSigningSecret("EGREGOR_UPLOAD_KEY_ALIAS", [
    "EGREGOR_UPLOAD_KEY_ALIAS",
    "ANDROID_SIGNING_KEY_ALIAS",
    "EAS_BUILD_ANDROID_KEY_ALIAS",
    "ANDROID_INJECTED_SIGNING_KEY_ALIAS",
])
releaseKeyAlias = releaseKeyAlias ?: findProperty("android.injected.signing.key.alias")?.toString()?.trim()
def releaseKeyPassword = readSigningSecret("EGREGOR_UPLOAD_KEY_PASSWORD", [
    "EGREGOR_UPLOAD_KEY_PASSWORD",
    "ANDROID_SIGNING_KEY_PASSWORD",
    "EAS_BUILD_ANDROID_KEY_PASSWORD",
    "ANDROID_INJECTED_SIGNING_KEY_PASSWORD",
])
releaseKeyPassword = releaseKeyPassword ?: findProperty("android.injected.signing.key.password")?.toString()?.trim()

def hasReleaseSigningSecrets = [
    releaseStoreFilePath,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
].every { value -> value != null && value.trim() }

def blockedMergedPermissions = ${toGroovyList(blockedPermissions)}
def requiredMergedPermissions = ${toGroovyList(requiredPermissions)}

def stripBlockedPermissionsFromManifest = { File manifestFile ->
    if (!manifestFile.exists()) {
        return
    }

    def mergedManifestXml = manifestFile.getText("UTF-8")
    blockedMergedPermissions.each { permissionName ->
        def escapedPermission = java.util.regex.Pattern.quote(permissionName)
        mergedManifestXml = mergedManifestXml.replaceAll(
            '(?ms)\\\\s*<uses-permission(?:-sdk-23)?\\\\b[^>]*android:name\\\\s*=\\\\s*"'+ escapedPermission +'"[^>]*/>\\\\s*',
            "\\n",
        )
    }

    requiredMergedPermissions.each { permissionName ->
        def escapedPermission = java.util.regex.Pattern.quote(permissionName)
        if (!(mergedManifestXml =~ '(?m)android:name\\\\s*=\\\\s*"'+ escapedPermission +'"')) {
            def permissionTag = '    <uses-permission android:name="' + permissionName + '" />\\n'
            if (mergedManifestXml.contains("<queries>")) {
                mergedManifestXml = mergedManifestXml.replaceFirst(
                    "(?m)^\\\\s*<queries>",
                    permissionTag + "<queries",
                )
            } else if (mergedManifestXml.contains("<application")) {
                mergedManifestXml = mergedManifestXml.replaceFirst(
                    "(?m)^\\\\s*<application",
                    permissionTag + "<application",
                )
            } else {
                mergedManifestXml = mergedManifestXml.replaceFirst(
                    "(?m)^</manifest>",
                    permissionTag + "</manifest>",
                )
            }
        }
    }

    manifestFile.write(mergedManifestXml, "UTF-8")
}

afterEvaluate {
    if (isReleaseTaskRequested) {
        if (!hasReleaseSigningSecrets) {
            throw new GradleException(
                "Release signing is required and debug signing is disabled. " +
                "Configure EGREGOR_UPLOAD_STORE_FILE / EGREGOR_UPLOAD_STORE_PASSWORD / " +
                "EGREGOR_UPLOAD_KEY_ALIAS / EGREGOR_UPLOAD_KEY_PASSWORD " +
                "(or ANDROID_SIGNING_* / EAS_BUILD_ANDROID_* equivalents). " +
                "See mobile/docs/release/android-release-setup.md."
            )
        }

        if (!file(releaseStoreFilePath).exists()) {
            throw new GradleException(
                "Release signing keystore was not found at '" + releaseStoreFilePath + "'. " +
                "See mobile/docs/release/android-release-setup.md."
            )
        }

    }

    ["Debug", "Release"].each { variantName ->
        tasks.matching { task -> task.name == ("process" + variantName + "MainManifest") }.configureEach { manifestTask ->
            manifestTask.doLast {
                def variantDir = variantName.toLowerCase()
                def outputManifestCandidates = [
                    buildDir.toString() + "/intermediates/merged_manifest/" + variantDir + "/process" + variantName + "MainManifest/AndroidManifest.xml",
                    buildDir.toString() + "/intermediates/merged_manifests/" + variantDir + "/process" + variantName + "Manifest/AndroidManifest.xml",
                ]

                outputManifestCandidates.each { manifestPath ->
                    stripBlockedPermissionsFromManifest(file(manifestPath))
                }
            }
        }
    }
}
${HARDENING_END}`;
}

function injectHardening(contents, block) {
  const existingBlockPattern = new RegExp(
    `${escapeRegExp(HARDENING_START)}[\\s\\S]*?${escapeRegExp(HARDENING_END)}\\n?`,
    "m",
  );

  const withoutExistingBlock = contents.replace(existingBlockPattern, "");
  const androidBlockIndex = withoutExistingBlock.indexOf("\nandroid {");

  if (androidBlockIndex === -1) {
    throw new Error(
      `${PLUGIN_NAME}: Could not find Android Gradle block in android/app/build.gradle.`,
    );
  }

  const withHardeningBlock =
    `${withoutExistingBlock.slice(0, androidBlockIndex).trimEnd()}\n\n` +
    `${block}\n\n` +
    `${withoutExistingBlock.slice(androidBlockIndex).trimStart()}`;

  return applyReleaseSigningPatches(
    ensureReleaseSigningConfig(withHardeningBlock),
  );
}

function ensureReleaseSigningConfig(contents) {
  const signingConfigsToken = "signingConfigs {";
  const signingConfigsStart = contents.indexOf(signingConfigsToken);

  if (signingConfigsStart === -1) {
    throw new Error(
      `${PLUGIN_NAME}: Could not find signingConfigs block in android/app/build.gradle.`,
    );
  }

  const openingBraceIndex = contents.indexOf("{", signingConfigsStart);
  let braceDepth = 0;
  let blockEndIndex = -1;

  for (let index = openingBraceIndex; index < contents.length; index += 1) {
    const currentChar = contents[index];
    if (currentChar === "{") {
      braceDepth += 1;
    } else if (currentChar === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) {
        blockEndIndex = index;
        break;
      }
    }
  }

  if (blockEndIndex === -1) {
    throw new Error(
      `${PLUGIN_NAME}: Could not resolve end of signingConfigs block.`,
    );
  }

  const signingConfigsBlock = contents.slice(
    openingBraceIndex + 1,
    blockEndIndex,
  );
  if (/\brelease\s*\{/.test(signingConfigsBlock)) {
    return contents;
  }

  const releaseStubBlock =
    "\n        release {\n" +
    "            // Release values are injected by withPhase6aAndroidHardening plugin.\n" +
    "        }\n";

  return (
    `${contents.slice(0, blockEndIndex)}${releaseStubBlock}` +
    contents.slice(blockEndIndex)
  );
}

function applyReleaseSigningPatches(contents) {
  let updatedContents = contents;

  const releaseStubPattern =
    /release\s*\{\s*\/\/ Release values are injected by withPhase6aAndroidHardening plugin\.\s*\}/m;
  const releaseConfiguredPattern =
    /release\s*\{\s*if\s*\(hasReleaseSigningSecrets\)\s*\{/m;

  if (!releaseConfiguredPattern.test(updatedContents)) {
    if (!releaseStubPattern.test(updatedContents)) {
      throw new Error(
        `${PLUGIN_NAME}: Could not find release signing config stub to patch.`,
      );
    }

    updatedContents = updatedContents.replace(
      releaseStubPattern,
      `release {
            if (hasReleaseSigningSecrets) {
                storeFile file(releaseStoreFilePath)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }`,
    );
  }

  const releaseBuildTypePattern =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/m;
  if (!/release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.release/m.test(updatedContents)) {
    if (!releaseBuildTypePattern.test(updatedContents)) {
      throw new Error(
        `${PLUGIN_NAME}: Could not find release buildType signingConfig to patch.`,
      );
    }

    updatedContents = updatedContents.replace(
      releaseBuildTypePattern,
      "$1signingConfig signingConfigs.release",
    );
  }

  return updatedContents;
}

const withPhase6aAndroidHardening = (config) => {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== "groovy") {
      throw new Error(
        `${PLUGIN_NAME}: Unsupported app build.gradle language: ${modConfig.modResults.language}`,
      );
    }

    const blockedPermissions =
      modConfig.android?.blockedPermissions?.length > 0
        ? modConfig.android.blockedPermissions
        : DEFAULT_BLOCKED_PERMISSIONS;

    const hardeningBlock = getHardeningBlock({
      blockedPermissions,
      requiredPermissions: REQUIRED_MERGED_PERMISSIONS,
    });

    modConfig.modResults.contents = injectHardening(
      modConfig.modResults.contents,
      hardeningBlock,
    );
    return modConfig;
  });
};

module.exports = createRunOncePlugin(
  withPhase6aAndroidHardening,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
