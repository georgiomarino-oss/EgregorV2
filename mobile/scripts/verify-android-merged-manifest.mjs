import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDirectory, "..");
const appConfigPath = path.join(mobileRoot, "app.json");

const manifestCandidates = [
  path.join(
    mobileRoot,
    "android",
    "app",
    "build",
    "intermediates",
    "merged_manifest",
    "release",
    "processReleaseMainManifest",
    "AndroidManifest.xml",
  ),
  path.join(
    mobileRoot,
    "android",
    "app",
    "build",
    "intermediates",
    "merged_manifests",
    "release",
    "processReleaseManifest",
    "AndroidManifest.xml",
  ),
];

const manifestFlagIndex = process.argv.indexOf("--manifest");
const manifestArg =
  manifestFlagIndex >= 0 ? process.argv[manifestFlagIndex + 1] : null;
const manifestPath = manifestArg
  ? path.resolve(mobileRoot, manifestArg)
  : manifestCandidates.find((candidatePath) => fs.existsSync(candidatePath));

if (!manifestPath || !fs.existsSync(manifestPath)) {
  console.error(
    "[verify-android-merged-manifest] Missing merged release manifest output.",
  );
  console.error(
    "Generate it first, e.g. `cd mobile/android && ./gradlew :app:processReleaseMainManifest`.",
  );
  console.error("Checked paths:");
  manifestCandidates.forEach((candidatePath) => {
    console.error(`- ${candidatePath}`);
  });
  process.exit(1);
}

const appConfig = JSON.parse(fs.readFileSync(appConfigPath, "utf8"));
const blockedPermissions = appConfig?.expo?.android?.blockedPermissions ?? [];
const requiredPermissions = ["android.permission.POST_NOTIFICATIONS"];
const mergedManifestXml = fs.readFileSync(manifestPath, "utf8");

const hasPermission = (permissionName) => {
  const escapedName = permissionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const permissionPattern = new RegExp(
    `android:name\\s*=\\s*"${escapedName}"`,
    "m",
  );
  return permissionPattern.test(mergedManifestXml);
};

const missingRequired = requiredPermissions.filter(
  (permissionName) => !hasPermission(permissionName),
);
const blockedStillPresent = blockedPermissions.filter((permissionName) =>
  hasPermission(permissionName),
);

if (missingRequired.length === 0 && blockedStillPresent.length === 0) {
  console.log("[verify-android-merged-manifest] PASS");
  console.log(`Manifest: ${manifestPath}`);
  process.exit(0);
}

console.error("[verify-android-merged-manifest] FAIL");
console.error(`Manifest: ${manifestPath}`);

if (missingRequired.length > 0) {
  console.error(
    `Missing required permission(s): ${missingRequired.join(", ")}`,
  );
}

if (blockedStillPresent.length > 0) {
  console.error(
    `Blocked permission(s) still present: ${blockedStillPresent.join(", ")}`,
  );
}

process.exit(1);
