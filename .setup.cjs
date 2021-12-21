#!/usr/bin/env node
const fs = require('fs')
function copyFromDefault(p) {
  if (!fs.existsSync(p)) {
    const defaultFile = `${p}.default`
    if (fs.existsSync(defaultFile)) {
      fs.copyFileSync(`${p}.default`, p)
    }
  }
}

;['.env', '.env.staging', '.env.production'].map(copyFromDefault)
