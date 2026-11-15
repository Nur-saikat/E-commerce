'use strict';

const path = require('path');

// The CLI's bin/ng.js hard-exits on Node versions below its supported range.
// bootstrap.js runs the same CLI without that gate, so this machine's Node
// 24.14 still serves the app; remove once Node is upgraded.
const cliRoot = path.dirname(require.resolve('@angular/cli/package.json'));

process.argv = [
  process.argv[0],
  path.join(cliRoot, 'bin', 'ng.js'),
  'serve',
  ...process.argv.slice(2),
];

require(path.join(cliRoot, 'bin', 'bootstrap.js'));
