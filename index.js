#!/usr/bin/env node
var chalk = require('chalk');
var program = require('commander');

var merge = require('merge')
var exec = require('child_process').exec;
var jsonfile = require("jsonfile");
var path = require("path");
var tempfile = require('tempfile');

var util = require('util');

var clim = require("clim");
clim.logWrite = function(level, prefixes, msg) {
  var pfx = '';
  if (prefixes.length > 0) pfx = prefixes.join(" ");

  level = (f[level.toLowerCase()] || function (p) {return p})(level);
  line = util.format("%s [%s] %s", pfx, level, msg)
  process.stderr.write(line + "\n");
};

var console = clim(chalk.grey("shield"));

var f = {
  error:chalk.red,
  link: chalk.underline.blue,
  info: chalk.blue,
  log: chalk.blue,
  warn: chalk.red,
  bold: chalk.bold
}

var nodeCLI = require("shelljs-nodecli");

var FirefoxProfile = require("firefox-profile");
var getPrefs = require("jpm/lib/preferences").getPrefs;

var passedOn = [];
function preprocess (args) {
  var dashed = false,
    out = []
  args.forEach(function (a) {
    if (a == "--") {
      dashed = true;
      return;
    }
    if (dashed) passedOn.push(a)
    else out.push(a)
  })
  return out;
}

function makeProfile(dir) {
   var profile = new FirefoxProfile({
      destinationDirectory: dir
    });

    // Set default preferences
    var prefs = getPrefs("firefox");
    Object.keys(prefs).forEach(function(pref) {
      profile.setPreference(pref, prefs[pref]);
    });
    profile.updatePreferences();
    console.info("profile made at:", f.link(dir))
}

function initStudy(dir, name) {
  // body...

}

var standardPrefs = {
 "toolkit.telemetry.enabled": "false",
 //"extensions.sdk.console.logLevel": "debug",
 "browser.selfsuppport.enabled": false,
 "general.warnOnAboutConfig": false
}

var program = require('commander');

program
  .version(require('./package.json').version)
  .description("cli for Shield Studies actions")

program
  .command('run <addonDir> [variation]')
  .option("--prefs <json>", "additional prefs to set")
  .option("--firstrun <epoch>", "set the firstrun to test expiry")
  .option("--debug", "add the shield.debug pref")

  .action(function (addonDir, variation, options) {
    // if prefs, read it.
    // extend that with whatever
    // write it, then:
    // call jpm run --prefs

    // TODO make this work always for relative and rooted paths
    var addonPkg;
    if (! path.isAbsolute(addonDir)) {
      addonPkg = process.cwd() + '/' + addonDir + "/package.json";
    } else {
      addonPkg = addonDir + "/package.json";
    }

    var addon = require(addonPkg);
    var id = addon.id || addon.name;
    var prefsBr = "extensions.@" + id;

    // prefs from the user
    var _userPrefs = {};
    if (options.prefs) {
      _userPrefs = jsonfile.readFileSync(options.prefs);
    }
    // reformat if needful:
    userPrefs = {};
    Object.keys(_userPrefs).forEach(function (k) {
      v = _userPrefs[k];
      var prefix = "+";
      var n = prefix.length;
      if (k.indexOf(prefix) == 0) { //
        k = "extensions." + id + "." + k.slice(n)
      }
      userPrefs[k] = v;
    })

    console.info("--prefs: \n%s", JSON.stringify(userPrefs,null, 2));
    // set special addon prefs
    ourPrefs = {};
    if (variation) {
      ourPrefs[prefsBr + ".shield.variation"] = variation;
      console.info("setting variation to: %s", f.bold(variation));
    } else {
      console.info("choosing variation %s", f.bold("at random"));
    }

    if (options.firstrun) {
      ourPrefs[prefsBr + ".shield.firstrun"] = options.firstrun;
      console.info("firstrun: mimic previous run: %s", f.bold(options.firstrun))
    } else {
      console.info("firstrun: simulate firstrun as %s", f.bold("NOW"))
    }

    if (options.debug) {
      ourPrefs['shield.debug'] = true;
      console.info("setting `shield.debug`");
    }

    var newPrefs = merge(standardPrefs, ourPrefs, userPrefs);

    var file = tempfile(".json")
    jsonfile.writeFileSync(file, newPrefs, {spaces: 2})
    console.info("combined prefs: %s\n%s",
        f.link(file),
        JSON.stringify(newPrefs,null,2));

    //console.info("jpm", "run", "code:", addonDir, "variation:", variation, "--prefs", options.prefs, passedOn);
    var callArgs = ["jpm", "run", '--addon-dir', addonDir, "--prefs", file].concat(passedOn);
    console.info("jpm args:\n%s", util.inspect(callArgs) );
    nodeCLI.exec.apply(nodeCLI, callArgs);
    exit(0);
  })

program
  .command('profile <dir>')
  .option("-f --force", "remove dir if exists")
  .action(function (dir, options) {
    // yes, this is not as robust as shell!  Sorry!
    if (options.force) {
      nodeCLI.exec('rm', '-rf', dir);
    }
    var fs = require('fs');

    function fail () {
      console.error("%s %s %s", f.error("profile action failed"), f.link(dir), "already exists or cant be written. try `--force`");
      exit(1);
    }

    if (!fs.existsSync(dir)) {
      var attempt = nodeCLI.exec('mkdir', '-p', dir + '/extensions');
      if (attempt.code !==0) fail();
    } else {
      fail();
    }

    makeProfile(dir);
    exit(0);
  })

program
  .command('init <name>')
  .option("-f --force", "remove dir if exists")
  .action(function (name, options) {
    // yes, this is not as robust as shell!  Sorry!
    if (options.force) {
      nodeCLI.exec('rm', '-rf', name);
    }
    if (nodeCLI.exec(__dirname + '/scripts/initStudy.bash', name).code !== 0) {
      exit(1);
    }
    initStudy(name);
    exit(0);
  })

program
  .command('lint <dir>')
  .action(function (dir) {
    console.info('NOT YET IMPLEMENTED: lint %s', dir);
    exit(0);
  });
;

program
  .command('*')
  .action(function(env){
    console.error(f.error( env + " command does not yet exist."));
    console.info("request it at: ", f.link(require('./package.json').bugs.url));
    program.help()
  });

program.parse(preprocess(process.argv));
if (!program.args.length) {
  console.error(f.error("no command given"));
  program.help();
}
