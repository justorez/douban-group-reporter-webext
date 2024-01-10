const path = require('path')
const AdmZip = require('adm-zip')
const pkg = require('../package.json')

const distPath = path.join(__dirname, '../dist')

const zip = new AdmZip()
zip.addLocalFolder(distPath)
zip.writeZip(path.join(distPath, `v${pkg.version}.zip`))
