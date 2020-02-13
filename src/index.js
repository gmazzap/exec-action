const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const io = require('@actions/io');
const pkg = require('../package.json');

const ACTION_UA = `${pkg.name}/${pkg.version}`;

// Sets the required env info for Percy to work correctly
function setPercyBranchBuildInfo(pullRequestNumber) {
  if (!!github.context.payload) {
    return;
  }

  if (!!pullRequestNumber) {
    let prBranch = github.context.payload.pull_request.head.ref;

    core.exportVariable('PERCY_BRANCH', prBranch);
    core.exportVariable('PERCY_PULL_REQUEST', pullRequestNumber);
  } else {
    core.exportVariable('PERCY_BRANCH', github.context.payload.ref.replace('refs/heads/', ''));
  }
}

(async () => {
  try {
    let flags = core.getInput('exec-flags');
    let testCommand = core.getInput('command');
    let customCommand = core.getInput('custom-command');
    let isDebug = core.getInput('verbose') === 'true';
    let isSilenced = core.getInput('silence') === 'true';
    let workingDir = core.getInput('working-directory');
    let pullRequestNumber = github.context.payload.number;
    let execOptions = { cwd: workingDir };

    // Set the CI builds user agent
    core.exportVariable('PERCY_GITHUB_ACTION', ACTION_UA);

    if (isSilenced) {
      core.exportVariable('LOG_LEVEL', 'silence');
    }

    if (isDebug) {
      core.exportVariable('LOG_LEVEL', 'debug');
    }

    // Set the PR # (if available) and branch name
    setPercyBranchBuildInfo(pullRequestNumber);

    if (customCommand) {
      // Run the passed command
      await exec.exec(`${customCommand}`, [], execOptions);

      return;
    } else {
      let npxPath = await io.which('npx', true);

      // Run the passed command with `percy exec` to create a Percy build
      await exec.exec(`"${npxPath}" percy exec ${flags} -- ${testCommand}`, [], execOptions);

      return;
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();
