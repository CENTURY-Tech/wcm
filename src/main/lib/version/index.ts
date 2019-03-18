import * as util from "util";
import * as Vorpal from "vorpal";
import * as semver from "semver";
import { writeFile } from "fs"
import { ConfigReader } from "../../util";
import { VersionConfig } from "./config";
import { GlobalConfig } from "../config";
import { formatAlert, LogType } from "../../util/methods/logging";

const releaseTypes: semver.ReleaseType[] = [
  "patch",
  "minor",
  "major",
  "prepatch",
  "preminor",
  "premajor",
  "prerelease"
];

export default function(vorpal: Vorpal) {
  vorpal
    .command("version [bump]", "Bump the version of this component")
    .option("-y, --yes", "Ignore the confirmation step")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      const versionConfig = GlobalConfig.version.getOrCreateInstance().temp();
      
      let nextVersion;
      let confirmation = args.options.yes;

      const { version } = versionConfig.get("manifestData");

      /**
       * If supplied, validate that the version bump provided is an allowed semver version. 
       */
      if (args.bump) {
        if (!releaseTypes.includes(args.bump)) {
          return this.log(formatAlert(vorpal, LogType.ERROR, `Invalid semver bump provided: ${args.bump}`));
        }

        nextVersion = semver.inc(version, args.bump);
      }

      /**
       * If there is currently no `nextVersion` then prompt the user with a list of available bumps to choose from.
       */
      if (!nextVersion) {
        nextVersion = (await this.prompt({
          message: "What should the next version be?",
          name: "nextVersion",
          type: "list",
          choices: releaseTypes.map((release) => ((value) => ({
            name: `${release}: ${value}`, value
          }))(semver.inc(version, release)))
        }) as any).nextVersion;
      }

      /**
       * If the user has not disabled confirmations, then prompt the user with a Y/n choice before continuing.
       */
      if (!confirmation) {
        confirmation = (await this.prompt({
          message: `Bumping from version ${version} to ${nextVersion}, is that correct?`,
          name: "confirmation",
          type: "confirm"
        }) as any).confirmation;
      }

      confirmation && await updateVersion(nextVersion).run(versionConfig);
    });
}

function updateVersion(version: string): ConfigReader<VersionConfig, Promise<void>> {
  return ConfigReader((config) => {
    const manifest = config.get("manifestData");

    manifest.version = version;

    return util.promisify(writeFile)(config.get("manifestPath"), JSON.stringify(manifest, null, 2), "utf8");
  })
}
